import type {DocNode,Post,Project,SiteSettings,Snapshot} from './types';

export interface ReleaseSnapshot {id:string;sequence:number;snapshot:unknown}
export interface ReleaseChange {title:string;details?:string[]}
export interface ReleaseChanges {
 state:'changed'|'unchanged'|'initial'|'unavailable';
 comparedSequence?:number;
 entries:ReleaseChange[];
}

const text=(value:unknown)=>typeof value==='string'?value:'';
function display(value:unknown){const trimmed=text(value).replace(/\s+/g,' ').trim();return trimmed?`「${trimmed.length>140?trimmed.slice(0,140)+'…':trimmed}」`:'（留空）';}
const valueChange=(label:string,before:unknown,after:unknown):ReleaseChange=>({title:`修改${label}`,details:[`${display(before)} → ${display(after)}`]});

// Republishing copies the same private upload to a new public filename. Compare
// the source upload, while keeping the origin and unrelated image URLs distinct.
function imageIdentity(value:unknown):string {
 const source=text(value);if(!source)return '';
 try{
  const url=new URL(source);
  const copy=url.pathname.match(/^\/storage\/v1\/object\/public\/blog-public\/[a-f0-9-]{36}-([a-f0-9-]{36}\.(?:jpg|png|webp|gif))$/i);
  const draft=url.pathname.match(/^\/storage\/v1\/object\/sign\/blog-drafts\/([a-f0-9-]{36}\.(?:jpg|png|webp|gif))$/i);
  if(copy||draft)return `${url.origin}/blog-upload/${(copy||draft)![1]}`;
 }catch{}
 return source;
}

function comparable(value:unknown):unknown {
 if(Array.isArray(value))return value.map(comparable);
 if(value&&typeof value==='object'){
  const object=value as Record<string,unknown>;
  return Object.fromEntries(Object.keys(object).sort().map(key=>{
   if(key==='attrs'&&object.type==='image'&&object.attrs&&typeof object.attrs==='object'){
    const attrs=object.attrs as Record<string,unknown>;
    return [key,comparable({...attrs,src:imageIdentity(attrs.src)})];
   }
   return [key,comparable(object[key])];
  }));
 }
 return value;
}
const same=(before:unknown,after:unknown)=>JSON.stringify(comparable(before))===JSON.stringify(comparable(after));
const emptyDoc:DocNode={type:'doc',content:[{type:'paragraph'}]};

function readSnapshot(value:unknown):Snapshot|null {
 if(!value||typeof value!=='object')return null;
 const candidate=value as Partial<Snapshot>;
 if(!Array.isArray(candidate.posts)||!candidate.settings||typeof candidate.settings!=='object')return null;
 if(candidate.posts.some(post=>!post||typeof post.id!=='string'))return null;
 if(candidate.settings.projects!==undefined&&(!Array.isArray(candidate.settings.projects)||candidate.settings.projects.some(project=>!project||typeof project.id!=='string')))return null;
 return candidate as Snapshot;
}

function postChanges(before:Post,after:Post):string[] {
 const changes:string[]=[];
 if(text(before.title)!==text(after.title))changes.push(`标题：${display(before.title)} → ${display(after.title)}`);
 if(text(before.slug)!==text(after.slug))changes.push('文章地址');
 if(text(before.category)!==text(after.category))changes.push(`分类：${text(before.category)} → ${text(after.category)}`);
 if(text(before.excerpt)!==text(after.excerpt))changes.push('摘要');
 if(!same(before.document||emptyDoc,after.document||emptyDoc))changes.push('正文或排版');
 if(imageIdentity(before.cover)!==imageIdentity(after.cover))changes.push('封面图片');
 if(!!before.featured!==!!after.featured)changes.push(after.featured?'设为精选文章':'取消精选文章');
 return changes;
}

function projectChanges(before:Project[],after:Project[]):ReleaseChange[] {
 const changes:ReleaseChange[]=[],old=new Map(before.map(project=>[project.id,project])),next=new Map(after.map(project=>[project.id,project]));
 for(const project of after){
  const previous=old.get(project.id),title=text(project.title)||'未命名作品';
  if(!previous){changes.push({title:`新增作品《${title}》`});continue;}
  const fields:string[]=[];
  if(text(previous.title)!==text(project.title))fields.push(`名称：${display(previous.title)} → ${display(project.title)}`);
  if(text(previous.description)!==text(project.description))fields.push('介绍');
  if(text(previous.url)!==text(project.url))fields.push(`链接：${display(previous.url)} → ${display(project.url)}`);
  if(fields.length)changes.push({title:`更新作品《${title}》`,details:fields});
 }
 for(const project of before)if(!next.has(project.id))changes.push({title:`移除作品《${text(project.title)||'未命名作品'}》`});
 const previousOrder=before.filter(project=>next.has(project.id)).map(project=>project.id);
 const nextOrder=after.filter(project=>old.has(project.id)).map(project=>project.id);
 if(!same(previousOrder,nextOrder))changes.push({title:'调整作品展示顺序'});
 return changes;
}

function settingsChanges(before:SiteSettings,after:SiteSettings):ReleaseChange[] {
 const changes:ReleaseChange[]=[];
 for(const [key,label] of [['name','博客名称'],['author','署名'],['description','一句话简介'],['github','GitHub 主页']] as const){
  if(text(before[key])!==text(after[key]))changes.push(valueChange(label,before[key],after[key]));
 }
 if(!same(before.about||emptyDoc,after.about||emptyDoc))changes.push({title:'修改“关于我”正文或排版'});
 for(const [key,label] of [['bilibili','B站主页'],['douyin','抖音主页'],['xiaohongshu','小红书主页']] as const){
  if(text(before.socials?.[key])!==text(after.socials?.[key]))changes.push(valueChange(label,before.socials?.[key],after.socials?.[key]));
 }
 return [...changes,...projectChanges(before.projects||[],after.projects||[])];
}

export function describeReleaseChanges(current:unknown,previous?:unknown):ReleaseChanges {
 const snapshot=readSnapshot(current);
 if(!snapshot)return {state:'unavailable',entries:[]};
 if(previous===undefined)return {
  state:'initial',entries:[
   ...snapshot.posts.map(post=>({title:`收录文章《${text(post.title)||'未命名文章'}》`})),
   {title:'站点资料',details:[`博客名称：${display(snapshot.settings.name)}`,`署名：${display(snapshot.settings.author)}`]},
   ...(snapshot.settings.projects||[]).map(project=>({title:`收录作品《${text(project.title)||'未命名作品'}》`})),
  ],
 };
 const baseline=readSnapshot(previous);
 if(!baseline)return {state:'unavailable',entries:[]};
 const changes:ReleaseChange[]=[],before=new Map(baseline.posts.map(post=>[post.id,post])),after=new Map(snapshot.posts.map(post=>[post.id,post]));
 for(const post of snapshot.posts){
  const old=before.get(post.id),title=text(post.title)||'未命名文章';
  if(!old){changes.push({title:`新增文章《${title}》`});continue;}
  const fields=postChanges(old,post);
  if(fields.length)changes.push({title:`更新文章《${title}》`,details:fields});
 }
 for(const post of baseline.posts)if(!after.has(post.id))changes.push({title:`从公开版本移除文章《${text(post.title)||'未命名文章'}》`});
 changes.push(...settingsChanges(baseline.settings,snapshot.settings));
 return {state:changes.length?'changed':'unchanged',entries:changes};
}

export function summarizeReleaseHistory(records:ReleaseSnapshot[]):Record<string,ReleaseChanges> {
 const sorted=[...records].sort((a,b)=>a.sequence-b.sequence);
 return Object.fromEntries(sorted.map((record,index)=>{
  const previous=sorted[index-1],summary=describeReleaseChanges(record.snapshot,previous?previous.snapshot??null:undefined);
  return [record.id,{...summary,...(previous?{comparedSequence:previous.sequence}:{})}];
 }));
}
