import {publicationLabel,type ArticlePublication} from '../lib/publication-status';
import {sitePath} from '../lib/client';
import '../styles/publication.css';
export default function PublicationStatus({publication,dirty,unavailable,busy,onRefresh,onRetry}:{publication?:ArticlePublication;dirty:boolean;unavailable:boolean;busy:boolean;onRefresh:()=>void;onRetry:()=>void}){
 const state=unavailable?'unknown':publication?.state||'draft';
 const withdraw=publication?.action==='withdraw';
 const pending=state==='queued'||state==='building';
 const failed=state==='failed';
 const label=publicationLabel(publication,unavailable);
 const unpublished=dirty||publication?.has_unpublished_changes;
 return <section className={`publication-status ${state==='live'?'publication-success':failed?'publication-error':''}`} aria-label="文章发布状态">
  <div role="status" aria-live="polite" aria-atomic="true">
   <strong>发布状态：{label}</strong>
   {state==='draft'&&<p>这篇文章尚未发布。点击“发布文章”后，可以在这里查看上线结果。</p>}
   {state==='queued'&&<p>{label==='等待时间较长'?'已等待超过 5 分钟，GitHub 定时任务可能延迟。可以手动启动部署。':withdraw?'撤回请求已提交，正在等待部署。完成后这里会自动更新。':'发布请求已提交，正在等待部署，此时新版本尚未上线。完成后这里会自动更新。'}</p>}
   {state==='building'&&<p>{withdraw?'正在更新网页，完成后文章将从博客移除。':'正在生成并部署网页，完成后这里会自动显示上线结果。'}</p>}
   {state==='live'&&<p>发布成功，文章已上线。{unpublished?'当前还有未发布的修改，重新发布后才会更新线上文章。':''}</p>}
   {failed&&<p>{withdraw?'撤回未完成，可以重试。':'发布未完成，已保存的内容仍保留，可以重试。'}{publication?.error&&<span className="publication-detail">{publication.error}</span>}</p>}
   {state==='unknown'||state==='superseded'?<p>暂时无法确认发布结果，请刷新状态或查看发布记录。</p>:null}
   {(pending||failed)&&publication?.has_live_version&&<p>之前的线上版本仍可阅读。</p>}
  </div>
  <div className="publication-actions">
   {publication?.has_live_version&&<a className="quiet-button" href={sitePath(`posts/${publication.slug}/`)} target="_blank" rel="noopener noreferrer">查看线上文章 ↗</a>}
   {state==='queued'&&<a className="quiet-button" href="https://github.com/Sun-XT9527/personal-blog/actions/workflows/deploy.yml" target="_blank" rel="noopener noreferrer">手动启动部署 ↗</a>}
   {failed&&<button type="button" className="quiet-button" disabled={busy} onClick={onRetry}>重试发布</button>}
   {state!=='draft'&&<button type="button" className="quiet-button" disabled={busy} onClick={onRefresh}>刷新状态</button>}
  </div>
  {state==='queued'&&<p className="publication-help">手动启动：打开发布页面后，点击 Run workflow，再点击绿色的 Run workflow，无需填写版本编号。</p>}
 </section>
}
