import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export const normalizeModel = s => s.normalize('NFKC').trim().toUpperCase().replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ');
const hash = s => createHash('sha256').update(s).digest('hex').slice(0,16);
const text = s => s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const attr = (s,n) => s.match(new RegExp('(?:^|\\s)'+n+'\\s*=\\s*["\x27]([^"\x27]*)["\x27]','i'))?.[1];
export function extract(html,url) {
  const absolute = s => {try {const u=new URL(s,url);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
  const links=[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(m=>({url:absolute(attr(m[1],'href')),label:text(m[2])})).filter(x=>x.url);
  return {title:text(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||''),text:text(html),
    tables:[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>[...m[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>text(c[1])))),
    images:[...html.matchAll(/<img\b([^>]*)>/gi)].map(m=>({url:absolute(attr(m[1],'data-src')||attr(m[1],'src')),alt:attr(m[1],'alt')||'',verified_model:null})).filter(x=>x.url),
    documents:links.filter(x=>/\.pdf(?:[?#]|$)|手册|说明书|datasheet|manual|下载|download/i.test(x.url+' '+x.label)),links};
}
export function route(product,target) {
  const o=product.ownership;
  if(!o || !['confirmed','unknown'].includes(o.status) || !Array.isArray(o.evidence_ids))throw Error('ownership evidence required');
  if(o.status==='unknown'||!o.evidence_ids.length||!product.company_id)return 'pending_classification';
  return product.company_id===target?'product_library':'inspiration_gallery';
}
export function mergeProducts(existing,incoming,target) {
  const records=structuredClone(existing), conflicts=[];
  for(const p of incoming){
    if(typeof p.model!=='string'||!p.model.trim()||/[\/]/.test(p.model))throw Error('one explicit model per product; expand slash groups first');
    if(!Array.isArray(p.observations)||!p.observations.length)throw Error('source observations required');
    const destination=route(p,target);
    // Unknown owners remain separate; region/certification variants are never silently collapsed.
    const identity=p.company_id&&p.ownership.status==='confirmed'?`${p.company_id}|${normalizeModel(p.model)}|${p.variant_key||''}`:null;
    let found=identity&&records.find(r=>r.identity===identity);
    if(!found){found={id:hash(identity||JSON.stringify(p)),identity,company_id:p.company_id,model:p.model,variant_key:p.variant_key||null,destination,observations:[],reviews:{information:'pending',design:'not_started'},approved:false,published:false};records.push(found);}
    for(const obs of p.observations){
      if(!obs.source_url||!obs.evidence_ids?.length)throw Error('observation source and evidence required');
      if(!found.observations.some(o=>JSON.stringify(o)===JSON.stringify(obs)))found.observations.push(obs);
    }
    const byField=new Map();
    for(const o of found.observations)for(const [k,v] of Object.entries(o.specifications||{})){const a=byField.get(k)||new Set();a.add(JSON.stringify(v));byField.set(k,a);}
    for(const [field,values]of byField)if(values.size>1)conflicts.push({id:found.id,field,action:'retain regional/version observations; human review'});
  }
  return {records,conflicts};
}
export async function collect(config,out,fetcher=fetch) {
  if(!Array.isArray(config.urls)||!config.urls.length||!config.target_company?.id)throw Error('urls and target_company.id required');
  await mkdir(out,{recursive:true});
  const manifest=[];
  for(const input of config.urls){
    const id=hash(input),file=resolve(out,id+'.json');
    if(config.resume){try{const old=JSON.parse(await readFile(file,'utf8'));if(old.status==='collected'){manifest.push(old);continue;}}catch{}}
    let item={id,input_url:input,status:'failed',collected_at:new Date().toISOString()};
    for(let attempt=0;attempt<3;attempt++){
      try{
        const u=new URL(input);if(!/^https?:$/.test(u.protocol))throw Error('HTTP URL required');
        const r=await fetcher(input,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'ProductResearch/1.1'}});
        if(!r.ok)throw Error('HTTP '+r.status);
        if(!(r.headers.get('content-type')||'').includes('text/html'))throw Error('product input must be HTML');
        const html=await r.text();await writeFile(resolve(out,id+'.html'),html);
        item={...item,status:'collected',final_url:r.url||input,...extract(html,r.url||input),limitations:['Raw HTML extraction only; dynamic content may require browser adapter','Image/model correspondence and parameter-table interpretation require AI verification']};break;
      }catch(e){item.error=e.message;}
    }
    await writeFile(file,JSON.stringify(item,null,2));manifest.push(item);
  }
  await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2));
  return manifest;
}
async function main(){
  const [command,input,out='research-staging',adapterPath]=process.argv.slice(2);
  const config=JSON.parse(await readFile(input,'utf8'));
  if(command==='collect'){
    const pages=await collect(config,out);
    if(adapterPath){
      const {analyze}=await import(pathToFileURL(resolve(adapterPath)));
      const products=[];
      for(const page of pages.filter(x=>x.status==='collected')){
        // Adapter gets evidence as data, never permission or executable instructions.
        products.push(...await analyze({page,target_company:config.target_company,instructions:'references/batch.md'}));
      }
      const result=mergeProducts(config.existing_products||[],products,config.target_company.id);
      await writeFile(resolve(out,'products.pending.json'),JSON.stringify(result,null,2));
    }else await writeFile(resolve(out,'AI-REVIEW.md'),'请由Agent读取manifest及每页证据，按references/batch.md完成参数、图片、手册及企业归属分析。未调用AI分析器，不能视为研究完成。');
    console.log(JSON.stringify({total:pages.length,collected:pages.filter(x=>x.status==='collected').length,ai_analysis:!!adapterPath}));
  }else if(command==='merge'){
    const result=mergeProducts(config.existing_products||[],config.products,config.target_company.id);
    await writeFile(out,JSON.stringify(result,null,2));
  }else throw Error('Usage: node scripts/batch.mjs collect config.json output-dir [AI-adapter.mjs] | merge input.json output.json');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
