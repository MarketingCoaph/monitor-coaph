import {XMLParser} from 'fast-xml-parser';

const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',textNodeName:'#text'});
const arr=v=>v==null?[]:Array.isArray(v)?v:[v];
const text=v=>typeof v==='string'?v:(v?.['#text']||'');
const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

async function fetchText(url){const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Monitor COAPH/2.0 (+https://monitor-coaph.vercel.app)'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text()}

export async function rssItems(url,provider,queryRunId,sourceId,queryText=''){
  const raw=parser.parse(await fetchText(url));
  const nodes=raw?.rss?.channel?.item||raw?.feed?.entry||[];
  return arr(nodes).map(item=>{
    const link=typeof item.link==='string'?item.link:(item.link?.['@_href']||text(item.link));
    const published=text(item.pubDate)||text(item.published)||text(item.updated)||null;
    const media=item['media:content']||item['media:thumbnail'];
    return {provider,queryRunId,sourceId,queryText,title:clean(text(item.title)),description:clean(text(item.description)||text(item.summary)||text(item.content)),author:clean(text(item.author?.name)||text(item.author)),aggregatorUrl:link||null,originalUrl:provider==='google_news_rss'?null:(link||null),imageUrl:media?.['@_url']||null,publishedAt:published&&Number.isFinite(Date.parse(published))?new Date(published).toISOString():null,dateSource:published?'rss':'unconfirmed',raw:{guid:text(item.guid)||text(item.id)||null}};
  }).filter(x=>x.title&&x.aggregatorUrl);
}

export function googleNewsUrl(query,windowStart){const inclusiveStart=new Date(windowStart.getTime()-86400000),after=inclusiveStart.toISOString().slice(0,10);return `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} after:${after}`)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`}

export async function serperItems(query,queryRunId,windowStart,windowEnd=new Date()){
  if(!process.env.SERPER_API_KEY)return[];
  const after=windowStart.toISOString().slice(0,10),before=new Date(windowEnd.getTime()+86400000).toISOString().slice(0,10);
  const r=await fetch('https://google.serper.dev/news',{method:'POST',headers:{'content-type':'application/json','X-API-KEY':process.env.SERPER_API_KEY},body:JSON.stringify({q:`${query} after:${after} before:${before}`,gl:'br',hl:'pt-br',num:100}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(`Serper HTTP ${r.status}`);
  const body=await r.json();
  return arr(body.news).map(item=>({provider:'serper',queryRunId,sourceId:null,queryText:query,title:clean(item.title),description:clean(item.snippet),author:null,aggregatorUrl:null,originalUrl:item.link||null,imageUrl:item.imageUrl||null,publishedAt:item.date&&Number.isFinite(Date.parse(item.date))?new Date(item.date).toISOString():null,dateSource:item.date?'provider':'unconfirmed',raw:{source:item.source||null,position:item.position||null}})).filter(x=>x.title&&x.originalUrl);
}
