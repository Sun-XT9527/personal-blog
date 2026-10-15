import {useEffect,useRef,useState} from 'react';
import {callFunction} from '../lib/client';
import {documentText} from '../lib/document';
import type {DocNode} from '../lib/types';
import '../styles/summary.css';
export default function SummaryField({title,document,value,onChange,disabled}:{title:string;document:DocNode;value:string;onChange:(value:string)=>void;disabled:boolean}){
 const [configured,setConfigured]=useState<boolean|null>(null),[saved,setSaved]=useState(false),[checking,setChecking]=useState(false),[generating,setGenerating]=useState(false),[error,setError]=useState(''),[candidate,setCandidate]=useState(''),[candidateSource,setCandidateSource]=useState('');
 const source=JSON.stringify([title,documentText(document)]),latestSource=useRef(source);latestSource.current=source;
 async function check(){setChecking(true);try{const result=await callFunction('blog-summary',{action:'status'});setConfigured(!!result.configured);setSaved(!!result.saved);setError('')}catch{setConfigured(false);setError('暂时无法确认 AI 服务状态，请稍后重新检查。')}finally{setChecking(false)}}
 async function verify(){setChecking(true);setError('');try{const result=await callFunction('blog-summary',{action:'verify'});setConfigured(!!result.configured)}catch(error){setError((error as Error).message)}finally{setChecking(false)}}
 useEffect(()=>{void check()},[]);
 async function generate(){const original=latestSource.current;setGenerating(true);setError('');try{const result=await callFunction('blog-summary',{action:'generate',title,text:documentText(document)});if(original!==latestSource.current)throw new Error('生成期间正文已修改，请按当前正文重新生成。');setCandidate(result.summary);setCandidateSource(original)}catch(error){setError((error as Error).message)}finally{setGenerating(false)}}
 function apply(){if(candidateSource!==latestSource.current){setError('正文已修改，请重新生成摘要。');return;}onChange(candidate);setCandidate('')}
 return <div className="summary-field"><label className="form-field">摘要<textarea value={value} rows={3} maxLength={500} onChange={event=>onChange(event.target.value)} placeholder="可手写，或使用 AI 生成候选摘要"/></label>
  <button type="button" className="quiet-button" disabled={disabled||generating||checking||!configured} onClick={()=>void generate()}>{generating?'正在生成摘要…':'AI 生成摘要'}</button>
  {!configured&&<><p className="summary-help">{checking?'正在检查摘要服务…':saved?'百炼配置已保存，验证通过后才能生成摘要。验证会调用一次模型，可能消耗 API 额度。':'百炼摘要服务尚未配置，仍可手动填写摘要。'}</p>{saved&&<button type="button" className="quiet-button" disabled={checking} onClick={()=>void verify()}>验证并启用</button>}<button type="button" className="summary-recheck" disabled={checking} onClick={()=>void check()}>重新检查连接</button></>}
  {configured&&<p className="summary-help">点击生成时将标题和正文发送给阿里云百炼，按 API 用量计费。生成后由你决定是否采用。</p>}
  {error&&<p className="summary-error" role="alert">{error}</p>}
  {candidate&&<section className="summary-candidate" aria-label="候选摘要"><label className="form-field">候选摘要<textarea rows={4} maxLength={500} value={candidate} onChange={event=>setCandidate(event.target.value)}/></label><div className="summary-actions"><button type="button" className="quiet-button" disabled={!candidate.trim()||generating} onClick={apply}>采用摘要</button><button type="button" className="quiet-button" onClick={()=>setCandidate('')}>放弃</button></div><p className="summary-help">采用后仍需保存草稿或发布文章。</p></section>}
 </div>
}
