(() => {
  const URL='https://ahiatqnokyhfpailobjx.supabase.co';
  const KEY='sb_publishable_qgwMhZPrB_3cFv3yCMcToA_9nDvHz-O';
  const sb=window.supabase?.createClient(URL,KEY);
  if(!sb) return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function card(row){
    const links=[
      ['Instagram',row.instagram_url],
      ['TikTok',row.tiktok_url],
      ['Facebook',row.facebook_url]
    ].filter(([,u])=>u);
    return `<article class="team-profile-card">
      <div class="team-profile-photo">${row.image_url?`<img src="${esc(row.image_url)}" alt="${esc(row.name)}">`:`<span>${esc(row.name.charAt(0))}</span>`}</div>
      <div class="team-profile-copy">
        <h3>${esc(row.name)}</h3>
        ${row.role?`<strong>${esc(row.role)}</strong>`:''}
        ${row.bio?`<p>${esc(row.bio)}</p>`:''}
        ${links.length?`<div class="team-profile-links">${links.map(([n,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join('')}</div>`:''}
      </div>
    </article>`;
  }

  async function load(){
    const gamers=document.getElementById('teamGamersGrid');
    const staff=document.getElementById('teamStaffGrid');
    if(!gamers||!staff)return;

    // Perfis mantidos no código-fonte continuam aparecendo.
    const source=(typeof getTeamData==='function'?(getTeamData().members||[]):[])
      .map((m,i)=>({
        id:`source-${i}`,
        name:m.name||'Membro',
        role:m.role||null,
        member_group:String(m.group||'Gamers').toLowerCase().includes('staff')?'Staff':'Gamers',
        bio:m.bio||null,
        image_url:m.image||null,
        instagram_url:m.instagram||null,
        tiktok_url:m.tiktok||null,
        facebook_url:m.facebook||null,
        display_order:i
      }));

    const {data,error}=await sb.from('team_members').select('*')
      .eq('is_published',true).eq('is_archived',false)
      .order('member_group').order('display_order').order('created_at');

    if(error){
      gamers.innerHTML='<article class="empty-card"><h3>Team</h3><p>Não foi possível carregar os membros da nuvem.</p></article>';
      return;
    }

    const all=[...source,...(data||[])];
    const unique=[];
    const seen=new Set();
    all.forEach(item=>{
      const key=String(item.name||'').trim().toLowerCase();
      if(!key||seen.has(key))return;
      seen.add(key);unique.push(item);
    });

    const g=unique.filter(x=>x.member_group==='Gamers');
    const s=unique.filter(x=>x.member_group==='Staff');
    gamers.innerHTML=g.length?g.map(card).join(''):'<article class="empty-card"><h3>Sem gamers</h3></article>';
    staff.innerHTML=s.length?s.map(card).join(''):'<article class="empty-card"><h3>Sem staff</h3></article>';
  }

  let timer=null;
  function refresh(){clearTimeout(timer);timer=setTimeout(load,120);}
  async function boot(){
    await load();
    sb.channel('team-public-v87').on('postgres_changes',{event:'*',schema:'public',table:'team_members'},refresh).subscribe();
    addEventListener('focus',load);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
