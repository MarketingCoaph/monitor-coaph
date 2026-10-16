import crypto from 'node:crypto';
import {db} from './db.js';
import {googleNewsUrl,rssItems,serperItems} from './providers.js';

const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const canonical=value=>{try{const u=new URL(value);['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid'].forEach(k=>u.searchParams.delete(k));u.hash='';return u.toString()}catch{return value||null}};
const domain=value=>{try{return new URL(value).hostname.replace(/^www\./,'')}catch{return null}};
function classify(item,entities){const hay=norm(`${item.title} ${item.description}`),matched=entities.filter(e=>hay.includes(e.normalized_name)).map(e=>e.name),invest=/investiga|operacao|policia federal|\bpf\b|\bcgu\b|fraude|desvio|mandado|prisao|lavagem|organizacao criminosa/.test(hay),direct=/\bcoaph\b|cooperativa de atendimento pre e hospitalar|operacao coaptacao/.test(hay)||matched.length>0;let score=Math.min(100,(direct?45:0)+(invest?30:0)+Math.min(25,matched.length*10));let status=score>=70?'related':score>=40?'possibly_related':'unrelated';return{score,status,matched,reason:`${status==='related'?'Alta':'Baixa'} relevância: ${matched.length?`entidades ${matched.join(', ')}`:'sem entidade identificada'}${invest?', contexto investigativo':''}.`}}

async function persistBatch(sql,items,job,qr,entities){
 const prepared=items.map(item=>{const target=canonical(item.originalUrl||item.aggregatorUrl),content_hash=crypto.createHash('sha256').update(`${norm(item.title)}|${target}`).digest('hex'),classification=classify(item,entities);return{item,target,content_hash,classification}});
 if(!prepared.length)return{newCandidates:0,newNews:0};
 const candidateRows=prepared.map(({item,target,content_hash,classification})=>({provider:item.provider,source_id:item.sourceId,query_run_id:item.queryRunId,title:item.title,description:item.description||null,author:item.author||null,source_name:item.raw?.source||job.source?.name||null,source_domain:domain(target),aggregator_url:item.aggregatorUrl,original_url:item.originalUrl,canonical_url:target,image_url:item.imageUrl,published_at:item.publishedAt,published_date_source:item.dateSource,published_date_confirmed:Boolean(item.publishedAt),raw_payload:item.raw,content_hash,processing_status:classification.status==='unrelated'?'discarded':classification.status==='possibly_related'?'review':'classified'}));
 const insertedCandidates=await sql`insert into public.candidate_news ${sql(candidateRows,'provider','source_id','query_run_id','title','description','author','source_name','source_domain','aggregator_url','original_url','canonical_url','image_url','published_at','published_date_source','published_date_confirmed','raw_payload','content_hash','processing_status')} on conflict(provider,content_hash) do nothing returning id,content_hash`;
 const hashes=prepared.map(x=>x.content_hash),candidateIds=await sql`select id,content_hash from public.candidate_news where content_hash in ${sql(hashes)}`,candidateMap=new Map(candidateIds.map(x=>[x.content_hash,x.id]));
 const newsRows=prepared.map(({item,target,content_hash,classification})=>({title:item.title,description:item.description||null,url:target,canonical_url:target,source_name:item.raw?.source||job.source?.name||null,source_domain:domain(target),published_at:item.publishedAt,image_url:item.imageUrl,search_term:item.queryText||null,content_hash,relevance_score:classification.score,relevance_status:classification.status,relevance_reason:classification.reason,analysis_source:'metadata',matched_entities:classification.matched,candidate_id:candidateMap.get(content_hash)||null,aggregator_url:item.aggregatorUrl,original_url:item.originalUrl,author:item.author,published_date_source:item.dateSource,published_date_confirmed:Boolean(item.publishedAt),provider:item.provider}));
 const insertedNews=await sql`insert into public.news ${sql(newsRows,'title','description','url','canonical_url','source_name','source_domain','published_at','image_url','search_term','content_hash','relevance_score','relevance_status','relevance_reason','analysis_source','matched_entities','candidate_id','aggregator_url','original_url','author','published_date_source','published_date_confirmed','provider')} on conflict(content_hash) do nothing returning id,content_hash`;
 if(job.query?.id){const allNews=await sql`select id,content_hash from public.news where content_hash in ${sql(hashes)}`,matches=allNews.map(n=>({news_id:n.id,search_query_id:job.query.id,query_run_id:qr.id}));if(matches.length)await sql`insert into public.news_query_matches ${sql(matches,'news_id','search_query_id','query_run_id')} on conflict(news_id,search_query_id) do update set query_run_id=excluded.query_run_id,matched_at=now()`}
 return{newCandidates:insertedCandidates.length,newNews:insertedNews.length};
}

export async function runMonitor({triggerType='cron',days=3}={}){
 const sql=db(),owner=crypto.randomUUID(),windowEnd=new Date(),windowStart=new Date(windowEnd.getTime()-days*86400000);
 const [lock]=await sql`insert into public.monitor_locks(lock_name,owner_token,expires_at) values('main-monitor',${owner},now()+interval '20 minutes') on conflict(lock_name) do update set owner_token=excluded.owner_token,acquired_at=now(),expires_at=excluded.expires_at where monitor_locks.expires_at<now() returning owner_token`;
 if(!lock)return{status:'skipped_locked'};
 let run;
 try{
  [run]=await sql`insert into public.monitor_runs(trigger_type,window_start,window_end) values(${triggerType},${windowStart},${windowEnd}) returning *`;
  const queries=await sql`select * from public.search_queries where active order by weight desc,id`;
  const sources=await sql`select * from public.sources where active=1 order by id`;
  const entities=await sql`select * from public.case_entities where active=1`;
  let candidates=0,added=0,newsAdded=0,errors=0,queryCount=0;
  const jobs=[];
  const google=sources.find(s=>s.provider==='google_news_rss'||String(s.url).includes('news.google.'));
  if(google)for(const q of queries)jobs.push({provider:'google_news_rss',query:q,source:google,load:id=>rssItems(googleNewsUrl(q.query_text,windowStart),'google_news_rss',id,google.id,q.query_text)});
  for(const source of sources.filter(s=>s.provider==='direct_rss'&&!String(s.url).includes('news.google.')))jobs.push({provider:'direct_rss',query:null,source,load:id=>rssItems(source.url,'direct_rss',id,source.id,'')});
  if(process.env.SERPER_API_KEY){const offset=(Number(run.id)*5)%Math.max(1,queries.length);for(let i=0;i<Math.min(5,queries.length);i++){const q=queries[(offset+i)%queries.length];jobs.push({provider:'serper',query:q,source:null,load:id=>serperItems(q.query_text,id)})}}
  for(const job of jobs){let qr;queryCount++;try{[qr]=await sql`insert into public.query_runs(monitor_run_id,search_query_id,source_id,provider,query_text,status) values(${run.id},${job.query?.id||null},${job.source?.id||null},${job.provider},${job.query?.query_text||null},'success') returning *`;const items=await job.load(qr.id),saved=await persistBatch(sql,items,job,qr,entities);candidates+=items.length;added+=saved.newCandidates;newsAdded+=saved.newNews;await sql`update public.query_runs set finished_at=now(),results_count=${items.length},new_candidates_count=${saved.newCandidates} where id=${qr.id}`}
   catch(e){errors++;if(qr)await sql`update public.query_runs set status='error',finished_at=now(),error_message=${String(e.message).slice(0,500)} where id=${qr.id}`}}
  const status=errors===0?'success':errors<queryCount?'partial':'failed';await sql`update public.monitor_runs set status=${status},finished_at=now(),queries_total=${queryCount},candidates_total=${candidates},candidates_new=${added},news_new=${newsAdded},errors_total=${errors} where id=${run.id}`;return{runId:run.id,status,queries:queryCount,candidates,newCandidates:added,newNews:newsAdded,errors};
 }finally{await sql`delete from public.monitor_locks where lock_name='main-monitor' and owner_token=${owner}`}
}
