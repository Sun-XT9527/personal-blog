import {releaseFeedback,type PublicationRequest,type ReleaseRecord} from '../lib/release-feedback';
import '../styles/publication.css';

export default function ReleaseProgress({request,release,unavailable,busy,onRefresh,onRetry}:{request:PublicationRequest;release?:ReleaseRecord;unavailable:boolean;busy:boolean;onRefresh:()=>void;onRetry:()=>void}){
 const status=unavailable?'unknown':release?.status||'queued';
 const feedback=releaseFeedback(request,status,release?.error);
 return <section className={`publication-status inline-release-status ${status==='live'?'publication-success':feedback.failure?'publication-error':''}`} aria-label={request.action==='settings'?'资料发布状态':'本次部署状态'}>
  <div role="status" aria-live="polite" aria-atomic="true"><strong>本次提交状态：{feedback.label}</strong><p>{feedback.message}</p>{request.action==='settings'&&<p>这里显示上次提交版本的状态；之后修改或保存的资料仍需再次发布。</p>}</div>
  <div className="publication-actions"><button type="button" className="quiet-button" disabled={busy} onClick={onRefresh}>刷新状态</button>{status==='failed'&&<button type="button" className="quiet-button" disabled={busy} onClick={onRetry}>重试这次发布</button>}<a className="quiet-button" href="https://github.com/Sun-XT9527/personal-blog/actions/workflows/deploy.yml" target="_blank" rel="noopener noreferrer">查看部署／手动启动 ↗</a></div>
 </section>;
}
