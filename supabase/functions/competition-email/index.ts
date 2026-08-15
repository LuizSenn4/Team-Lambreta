import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const jsonHeaders={...corsHeaders,"Content-Type":"application/json"};
const reply=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:jsonHeaders});
const clean=(value:unknown)=>String(value??"").trim();
const html=(value:unknown)=>clean(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
const errorText=(error:unknown)=>error instanceof Error?error.message:String(error);
const safeError=(error:unknown)=>errorText(error).replace(/Bearer\s+\S+/gi,"Bearer [redacted]").slice(0,800);

type Application=Record<string,unknown>&{id:number;user_id:string;status:string;authenticated_email?:string;authenticated_name?:string};
type Kind="boss"|"decision";

const labels:Record<string,string>={
  full_name:"Nome",epic_nickname:"Nick / Epic Games",authenticated_email:"Conta Google autenticada",
  authenticated_name:"Nome da conta Google",age:"Idade",country:"País",discord:"Discord",
  platform:"Plataforma",input_method:"Comando",region:"Região / servidor",
  build_preference:"Build ou Zero Build",main_mode:"Modo principal",power_ranking:"PR",
  tracker_links:"Tracker / perfil competitivo",availability:"Disponibilidade",
  competitive_experience:"Experiência competitiva",motivation:"Motivação",notes:"Observações",
};
const fieldOrder=Object.keys(labels);

function shell(title:string,intro:string,content:string){
  return `<!doctype html><html><body style="margin:0;background:#0b0d0b;color:#ece7dc;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0d0b;padding:24px 10px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#151815;border:1px solid #4c583c;border-radius:16px;overflow:hidden"><tr><td style="padding:24px;border-top:4px solid #73ff18"><div style="color:#d9a441;font-size:12px;font-weight:bold;letter-spacing:2px">TEAM LAMBRETA</div><h1 style="margin:10px 0 12px;color:#f5e8bf;font-size:26px">${html(title)}</h1><p style="margin:0 0 20px;color:#c8c1b2;line-height:1.6">${html(intro)}</p>${content}<p style="margin:24px 0 0;color:#aaa292;line-height:1.5">Atenciosamente,<br><strong style="color:#d9a441">Team Lambreta</strong></p></td></tr></table></td></tr></table></body></html>`;
}

function bossMessage(application:Application){
  const rows=fieldOrder.flatMap(key=>{
    const value=application[key]; if(value===null||value===undefined||clean(value)==="") return [];
    return [`<tr><td style="padding:10px 12px;border-bottom:1px solid #30342f;color:#9ea493;font-size:12px;width:34%">${html(labels[key])}</td><td style="padding:10px 12px;border-bottom:1px solid #30342f;color:#f2eee5;white-space:pre-wrap">${html(value)}</td></tr>`];
  }).join("");
  const created=new Date(String(application.created_at)).toLocaleString("pt-PT",{timeZone:"Europe/Lisbon"});
  const details=`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #30342f;border-radius:10px;overflow:hidden">${rows}<tr><td style="padding:10px 12px;color:#9ea493;font-size:12px">Data da inscrição</td><td style="padding:10px 12px;color:#f2eee5">${html(created)}</td></tr><tr><td style="padding:10px 12px;color:#9ea493;font-size:12px">ID da inscrição</td><td style="padding:10px 12px;color:#f2eee5">${html(application.id)}</td></tr></table>`;
  const nickname=clean(application.epic_nickname);
  return {subject:`Team Lambreta — Nova inscrição recebida${nickname?`: ${nickname}`:""}`,html:shell("Nova inscrição recebida","Uma nova inscrição competitiva foi salva e está disponível para análise no painel Admin.",details),text:`TEAM LAMBRETA\n\nNova inscrição recebida\n\n${fieldOrder.filter(key=>clean(application[key])).map(key=>`${labels[key]}: ${clean(application[key])}`).join("\n\n")}\n\nData: ${created}\nID: ${application.id}`};
}

function decisionMessage(application:Application){
  const name=clean(application.full_name)||clean(application.epic_nickname)||"jogador(a)";
  const approved=application.status==="aprovado";
  const intro=approved
    ?`Olá, ${name}. Temos o prazer de informar que sua inscrição para participar do Team Lambreta foi aprovada.`
    :`Olá, ${name}. Agradecemos seu interesse em participar do Team Lambreta.`;
  const body=approved
    ?`<p style="color:#c8c1b2;line-height:1.65">Nossa equipe analisou sua solicitação e você está apto a seguir para a próxima etapa.</p><h2 style="color:#73ff18;font-size:17px">Próximos passos</h2><p style="color:#c8c1b2;line-height:1.65">A equipe entrará em contato pelos dados cadastrados. Mantenha-os atualizados e acompanhe também sua Caixa de Entrada no Team Lambreta.</p>`
    :`<p style="color:#c8c1b2;line-height:1.65">Após análise da sua inscrição, neste momento não poderemos avançar com sua participação.</p><p style="color:#c8c1b2;line-height:1.65">Isso não impede que você acompanhe nossos projetos e futuras oportunidades. Obrigado pelo tempo e interesse.</p>`;
  return {subject:approved?"Team Lambreta — Inscrição aprovada":"Team Lambreta — Atualização da sua inscrição",html:shell(approved?"Inscrição aprovada":"Atualização da sua inscrição",intro,body),text:approved?`${intro}\n\nNossa equipe analisou sua solicitação e você está apto a seguir para a próxima etapa. A equipe entrará em contato pelos dados cadastrados. Acompanhe também sua Caixa de Entrada no Team Lambreta.\n\nAtenciosamente,\nTeam Lambreta`:`${intro}\n\nApós análise, neste momento não poderemos avançar com sua participação. Isso não impede que você acompanhe nossos projetos e futuras oportunidades. Obrigado pelo tempo e interesse.\n\nAtenciosamente,\nTeam Lambreta`};
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return reply({error:"method_not_allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization=req.headers.get("Authorization")||"";
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const adminClient=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  let applicationId=0; let kind:Kind="boss"; let claimed=false;
  try{
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user) return reply({error:"authentication_required"},401);
    const body=await req.json();
    applicationId=Number(body?.application_id);
    const action=clean(body?.action);
    const requestedKind=clean(body?.kind);
    if(!Number.isSafeInteger(applicationId)||applicationId<=0||!["notify","retry"].includes(action)) return reply({error:"invalid_payload"},400);
    kind=requestedKind==="decision"?"decision":"boss";

    const {data:application,error:applicationError}=await adminClient.from("competition_applications").select("*").eq("id",applicationId).maybeSingle();
    if(applicationError||!application) return reply({error:"application_not_found"},404);
    const row=application as Application;
    const {data:profile}=await adminClient.from("profiles").select("role").eq("id",user.id).maybeSingle();
    const isAdmin=["admin","master"].includes(clean(profile?.role).toLowerCase());
    if(action==="notify"){
      if(kind==="boss"&&row.user_id!==user.id) return reply({error:"forbidden"},403);
      if(kind==="decision"&&!isAdmin) return reply({error:"forbidden"},403);
    }else if(!isAdmin) return reply({error:"forbidden"},403);
    if(kind==="decision"&&!['aprovado','recusado'].includes(row.status)) return reply({error:"decision_not_available"},409);

    const {data:claim,error:claimError}=await adminClient.rpc("claim_competition_email",{p_application_id:applicationId,p_kind:kind});
    if(claimError) throw claimError;
    claimed=Boolean(claim);
    if(!claimed) return reply({ok:true,skipped:true,reason:"already_sent_or_sending"});

    const apiKey=Deno.env.get("RESEND_API_KEY");
    const from=Deno.env.get("EMAIL_FROM");
    const bossEmail=Deno.env.get("BOSS_NOTIFICATION_EMAIL");
    if(!apiKey||!from) throw new Error("Provider de e-mail não configurado (RESEND_API_KEY/EMAIL_FROM).");
    const recipient=kind==="boss"?bossEmail:clean(row.authenticated_email);
    if(!recipient) throw new Error(kind==="boss"?"BOSS_NOTIFICATION_EMAIL não configurado.":"Inscrição sem e-mail autenticado.");
    const message=kind==="boss"?bossMessage(row):decisionMessage(row);
    const provider=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","Idempotency-Key":`competition-${applicationId}-${kind}`},body:JSON.stringify({from,to:[recipient],subject:message.subject,html:message.html,text:message.text})});
    const providerBody=await provider.json().catch(()=>({}));
    if(!provider.ok) throw new Error(`Resend HTTP ${provider.status}: ${clean(providerBody?.message)||"falha no envio"}`);
    const sentAt=new Date().toISOString();
    const values=kind==="boss"?{boss_email_status:"sent",boss_email_sent_at:sentAt,boss_email_error:null}:{decision_email_status:"sent",decision_email_sent_at:sentAt,decision_email_error:null};
    const {error:updateError}=await adminClient.from("competition_applications").update(values).eq("id",applicationId);
    if(updateError) throw updateError;
    console.info("competition_email_sent",{application_id:applicationId,kind,provider_status:provider.status});
    return reply({ok:true,status:"sent"});
  }catch(error){
    const detail=safeError(error);
    console.error("competition_email_failed",{application_id:applicationId||null,kind,detail});
    if(claimed&&applicationId){
      const values=kind==="boss"?{boss_email_status:"failed",boss_email_error:detail}:{decision_email_status:"failed",decision_email_error:detail};
      await adminClient.from("competition_applications").update(values).eq("id",applicationId);
    }
    return reply({error:"email_failed",detail},502);
  }
});
