(() => {
  'use strict';
  class MessagesService {
    constructor(client, userId) {
      this.client = client; this.userId = userId; this.messageChannel = null; this.typingChannel = null; this.currentPeer = null; this.seen = new Set();
    }
    async page(peerId, before, limit = 50) {
      let query = this.client.from('private_messages').select('*')
        .or(`and(sender_id.eq.${this.userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${this.userId})`)
        .order('created_at', { ascending: false }).limit(limit);
      if (before) query = query.lt('created_at', before);
      const result = await query;
      if (result.error) throw result.error;
      return (result.data || []).filter(row => row.sender_id === this.userId ? !row.hidden_by_sender : !row.hidden_by_receiver).reverse();
    }
    async unreadCounts() {
      const result = await this.client.from('private_messages').select('sender_id').eq('receiver_id', this.userId).is('read_at', null).eq('hidden_by_receiver', false);
      if (result.error) throw result.error;
      return (result.data || []).reduce((acc, row) => ((acc[row.sender_id] = (acc[row.sender_id] || 0) + 1), acc), {});
    }
    async send(peerId, body) {
      const result = await this.client.from('private_messages').insert({ sender_id: this.userId, receiver_id: peerId, body: String(body).trim() }).select().single();
      if (result.error) throw result.error;
      return result.data;
    }
    async retry(message) { return this.send(message.receiver_id, message.body); }
    async markRead(peerId) {
      const result = await this.client.from('private_messages').update({ read_at: new Date().toISOString() }).eq('sender_id', peerId).eq('receiver_id', this.userId).is('read_at', null);
      if (result.error) throw result.error;
    }
    subscribe(onMessage, onConnection) {
      if (this.messageChannel) this.client.removeChannel(this.messageChannel);
      const handle = payload => {
        const row = payload.new || payload.old;
        if (!row?.id) return;
        const key = `${payload.eventType}:${row.id}:${row.read_at || ''}`;
        if (this.seen.has(key)) return;
        this.seen.add(key);
        if (this.seen.size > 500) this.seen = new Set([...this.seen].slice(-250));
        onMessage(payload);
      };
      this.messageChannel = this.client.channel(`buddy-messages-${this.userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `receiver_id=eq.${this.userId}` }, handle)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `sender_id=eq.${this.userId}` }, handle)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages', filter: `sender_id=eq.${this.userId}` }, handle)
        .subscribe(status => onConnection?.(status));
      return this.messageChannel;
    }
    async setTypingPeer(peerId, onTyping) {
      if (this.typingChannel) await this.client.removeChannel(this.typingChannel);
      this.currentPeer = peerId;
      if (!peerId) { this.typingChannel = null; return; }
      const topic = ['buddy-typing', this.userId, peerId].sort().join(':');
      this.typingChannel = this.client.channel(topic, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'typing' }, ({ payload }) => { if (payload?.user_id === peerId) onTyping(Boolean(payload.active)); })
        .subscribe();
    }
    broadcastTyping(active) {
      if (!this.typingChannel || !this.currentPeer) return;
      this.typingChannel.send({ type: 'broadcast', event: 'typing', payload: { user_id: this.userId, active: Boolean(active) } });
    }
    async destroy() {
      if (this.messageChannel) await this.client.removeChannel(this.messageChannel);
      if (this.typingChannel) await this.client.removeChannel(this.typingChannel);
      this.messageChannel = this.typingChannel = null;
    }
  }
  window.TeamBuddyMessagesService = MessagesService;
})();
