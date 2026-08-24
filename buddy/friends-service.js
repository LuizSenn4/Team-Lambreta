(() => {
  'use strict';
  const clean = value => String(value ?? '').trim();
  const pair = (a, b) => [a, b].sort().join(':');
  const PROFILE_FIELDS = 'id,game_nickname,full_name,avatar_url,custom_avatar_url,role,presence,last_seen,public_bio,main_game,profile_public';
  const fold = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-PT');
  const accentVariants = value => {
    const families = { a: 'aáàâãä', e: 'eéèêë', i: 'iíìîï', o: 'oóòôõö', u: 'uúùûü', c: 'cç' };
    return [...value].reduce((variants, letter) => {
      const choices = families[letter] || letter;
      return variants.flatMap(prefix => [...choices].map(choice => prefix + choice)).slice(0, 128);
    }, ['']);
  };
  const matchRank = (nickname, needle) => {
    const name = fold(nickname);
    if (name === needle) return [0, 0, name.length, name];
    if (name.startsWith(needle)) return [1, 0, name.length, name];
    const wordIndex = name.split(/[^a-z0-9]+/).findIndex(word => word.startsWith(needle));
    if (wordIndex >= 0) return [2, wordIndex, name.length, name];
    return [3, Math.max(0, name.indexOf(needle)), name.length, name];
  };
  const compareRank = (left, right) => {
    for (let index = 0; index < 3; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return left[3].localeCompare(right[3], 'pt-PT');
  };

  class FriendsService {
    constructor(client, userId) { this.client = client; this.userId = userId; this.channels = []; }
    async load() {
      const [relations, blocks] = await Promise.all([
        this.client.from('buddy_relations').select('*').or(`requester_id.eq.${this.userId},addressee_id.eq.${this.userId}`).order('updated_at', { ascending: false }),
        this.client.from('user_blocks').select('*').or(`blocker_id.eq.${this.userId},blocked_id.eq.${this.userId}`)
      ]);
      if (relations.error) throw relations.error;
      if (blocks.error) throw blocks.error;
      const ids = new Set();
      relations.data.forEach(row => ids.add(row.requester_id === this.userId ? row.addressee_id : row.requester_id));
      blocks.data.forEach(row => ids.add(row.blocker_id === this.userId ? row.blocked_id : row.blocker_id));
      const profiles = ids.size ? await this.client.from('profiles').select(PROFILE_FIELDS).in('id', [...ids]) : { data: [], error: null };
      if (profiles.error) throw profiles.error;
      return { relations: relations.data, blocks: blocks.data, profiles: profiles.data || [] };
    }
    async search(query) {
      const term = clean(query).slice(0, 60);
      if (term.length < 2) return [];
      const normalized = fold(term.replace(/[,%()]/g, ''));
      if (normalized.length < 2) return [];
      const filters = accentVariants(normalized).map(value => `game_nickname.ilike.%${value}%`).join(',');
      const result = await this.client.from('profiles')
        .select(PROFILE_FIELDS)
        .neq('id', this.userId)
        .or(filters)
        .limit(64);
      if (result.error) throw result.error;
      return (result.data || [])
        .filter(row => row.profile_public !== false && fold(row.game_nickname).includes(normalized))
        .sort((a, b) => compareRank(matchRank(a.game_nickname, normalized), matchRank(b.game_nickname, normalized)))
        .slice(0, 8);
    }
    async getPublicProfile(id) {
      const result = await this.client.from('profiles').select(PROFILE_FIELDS).eq('id', id).maybeSingle();
      if (result.error) throw result.error;
      return result.data?.profile_public === false ? null : result.data;
    }
    async request(otherId) {
      if (!otherId || otherId === this.userId) throw new Error('Não é possível adicionar este utilizador.');
      const blocked = await this.client.from('user_blocks').select('blocker_id').or(`and(blocker_id.eq.${this.userId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${this.userId})`).limit(1);
      if (blocked.error) throw blocked.error;
      if (blocked.data?.length) throw new Error('Não é possível enviar um pedido a este utilizador.');
      const existing = await this.client.from('buddy_relations').select('*').or(`and(requester_id.eq.${this.userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${this.userId})`).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data?.status === 'accepted') throw new Error('Este utilizador já é teu Buddy.');
      if (existing.data?.status === 'pending') throw new Error('Já existe um pedido pendente.');
      if (existing.data) {
        const updated = await this.client.from('buddy_relations').update({ requester_id: this.userId, addressee_id: otherId, status: 'pending', requester_notify: false, addressee_notify: true, updated_at: new Date().toISOString() }).eq('id', existing.data.id).select().single();
        if (updated.error) throw updated.error;
        return updated.data;
      }
      const inserted = await this.client.from('buddy_relations').insert({ requester_id: this.userId, addressee_id: otherId, status: 'pending', requester_notify: false, addressee_notify: true }).select().single();
      if (inserted.error) throw inserted.error;
      return inserted.data;
    }
    async respond(relationId, accept) {
      const result = await this.client.from('buddy_relations').update({ status: accept ? 'accepted' : 'rejected', addressee_notify: false, requester_notify: Boolean(accept), updated_at: new Date().toISOString() }).eq('id', relationId).eq('addressee_id', this.userId).select().single();
      if (result.error) throw result.error;
      return result.data;
    }
    async block(otherId) {
      const result = await this.client.from('user_blocks').insert({ blocker_id: this.userId, blocked_id: otherId }).select().single();
      if (result.error) throw result.error;
      return result.data;
    }
    async unblock(otherId) {
      const result = await this.client.from('user_blocks').delete().eq('blocker_id', this.userId).eq('blocked_id', otherId);
      if (result.error) throw result.error;
    }
    async report(otherId, reason, details) {
      const result = await this.client.from('user_reports').insert({ reporter_id: this.userId, reported_id: otherId, reason, details: clean(details).slice(0, 1000) });
      if (result.error) throw result.error;
    }
    stateFor(otherId, relations, blocks) {
      if (blocks.some(row => row.blocker_id === this.userId && row.blocked_id === otherId)) return 'blocked';
      if (blocks.some(row => row.blocker_id === otherId && row.blocked_id === this.userId)) return 'blocked-by';
      const relation = relations.find(row => pair(row.requester_id, row.addressee_id) === pair(this.userId, otherId));
      if (!relation) return 'none';
      if (relation.status === 'accepted') return 'buddy';
      if (relation.status === 'pending' && relation.requester_id === this.userId) return 'sent';
      if (relation.status === 'pending') return 'received';
      return 'none';
    }
    subscribe(onChange) {
      this.unsubscribe();
      const channel = this.client.channel(`buddy-relations-${this.userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'buddy_relations', filter: `requester_id=eq.${this.userId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'buddy_relations', filter: `addressee_id=eq.${this.userId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_blocks', filter: `blocker_id=eq.${this.userId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_blocks', filter: `blocked_id=eq.${this.userId}` }, onChange)
        .subscribe();
      this.channels = [channel];
      return channel;
    }
    unsubscribe() { this.channels.forEach(channel => this.client.removeChannel(channel)); this.channels = []; }
  }
  window.TeamBuddyFriendsService = FriendsService;
})();
