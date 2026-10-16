import {useEffect,useState} from 'react';
import {supabase} from '../lib/client';
import {summarizeReleaseHistory,type ReleaseChanges,type ReleaseSnapshot} from '../lib/release-changes';
import type {ReleaseRecord} from '../lib/release-feedback';
import '../styles/release-history.css';

const statusNames:Record<string,string>={queued:'等待发布',building:'正在发布',live:'已上线',failed:'发布失败',superseded:'历史版本'};

export default function ReleaseHistory({releases,busy,onRetry}:{releases:ReleaseRecord[];busy:boolean;onRetry:()=>void}){
 const [summaries,setSummaries]=useState<Record<string,ReleaseChanges>>({}),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const versionKey=releases.map(release=>`${release.id}:${release.sequence}`).join('|');
 useEffect(()=>{
  if(!releases.length)return;
  let disposed=false;
  async function load(){
   setLoading(true);setFailed(false);
   try{
    const oldest=Math.min(...releases.map(release=>release.sequence));
    const [visible,baseline]=await Promise.all([
     supabase.from('blog_releases').select('id,sequence,snapshot').in('id',releases.map(release=>release.id)),
     supabase.from('blog_releases').select('id,sequence,snapshot').lt('sequence',oldest).order('sequence',{ascending:false}).limit(1),
    ]);
    if(visible.error||baseline.error||visible.data?.length!==releases.length)throw new Error('release_history_unavailable');
    const summaries=summarizeReleaseHistory([...(baseline.data||[]),...(visible.data||[])] as ReleaseSnapshot[]);
    if(!disposed)setSummaries(summaries);
   }catch{if(!disposed)setFailed(true)}finally{if(!disposed)setLoading(false)}
  }
  void load();return()=>{disposed=true};
  // Snapshots are immutable. Status polling alone must not reload article bodies.
 },[versionKey,attempt]);
 if(!releases.length)return <div className="empty-state"><p>还没有发布记录。</p></div>;
 return <>
  <p className="release-history-help">显示最近 {releases.length} 条文章、资料与作品的发布记录。变更与上一条保留的提交版本比较；是否已上线，以每条记录的发布状态为准。</p>
  {failed&&<div className="notice error" role="alert">部分变更说明暂时无法读取，已显示的版本状态不受影响。<button type="button" className="quiet-button" disabled={loading} onClick={()=>setAttempt(value=>value+1)}>重新读取变更</button></div>}
  {releases.map(release=><ReleaseHistoryRow key={release.id} release={release} summary={summaries[release.id]} loading={loading} busy={busy} onRetry={onRetry}/>)}
 </>;
}

export function ReleaseHistoryRow({release,summary,loading,busy,onRetry}:{release:ReleaseRecord;summary?:ReleaseChanges;loading:boolean;busy:boolean;onRetry:()=>void}){
 const entries=summary?.entries||[];
 function changes(items:typeof entries){return <ul className="release-change-list">{items.map((entry,index)=><li key={index}><strong>{entry.title}</strong>{!!entry.details?.length&&<p>{entry.details.join('；')}</p>}</li>)}</ul>}
 return <article className="admin-row release-history-row" aria-label={`发布版本 ${release.sequence}`}>
  <div className="row-copy">
   <h3>版本 {release.sequence}</h3>
   {!summary&&<p className="release-change-note">{loading?'正在读取变更说明…':'变更说明暂时无法读取。'}</p>}
   {summary?.state==='unavailable'&&<p className="release-change-note">历史快照不完整，无法准确比较这次改动。</p>}
   {summary?.state==='initial'&&<p className="release-change-note">这是首个保留的发布版本，没有更早的版本可供比较。内容包括：</p>}
   {summary?.state==='unchanged'&&<p className="release-change-note">与上一条提交的公开内容相同，没有内容变化。</p>}
   {entries.length>0&&changes(entries.slice(0,4))}
   {entries.length>4&&<details className="release-more-changes"><summary>还有 {entries.length-4} 项内容，展开查看</summary>{changes(entries.slice(4))}</details>}
   <div className="release-record-meta"><span className={`status-tag ${release.status==='live'?'status-success':''}`}>{statusNames[release.status]||'状态待确认'}</span><time dateTime={release.created_at}>{new Date(release.created_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</time>{summary?.comparedSequence!==undefined&&<span>对比版本 {summary.comparedSequence}</span>}</div>
   {release.error&&<p className="notice error">{release.error}</p>}
  </div>
  {release.status==='failed'&&<button type="button" className="quiet-button" disabled={busy} onClick={onRetry}>重试</button>}
 </article>;
}
