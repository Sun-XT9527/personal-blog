import {publicationScheduleDescription} from './publication-status';

export type PublicationAction='publish'|'unpublish'|'delete'|'settings'|'retry';
export interface PublicationRequest {id:string;action:PublicationAction;target:string}
export interface ReleaseRecord {id:string;sequence:number;status:string;error?:string|null;created_at:string}
export interface ReleaseFeedback {message:string;failure:boolean;persistent:boolean;label:string}

export function releaseFeedback(request:PublicationRequest,status:string,error?:string|null):ReleaseFeedback {
 const withdraw=request.action==='unpublish'||request.action==='delete';
 const operation=request.action==='delete'?'移除':withdraw?'撤回':request.action==='retry'?'重新发布':'发布';
 const subject=request.action==='settings'?'个人资料与作品':request.action==='retry'?'当前公开内容':request.target?`《${request.target}》`:'文章';
 if(status==='queued')return {label:`等待${operation}`,message:`${subject}的${operation}请求已提交，正在等待部署；新版本尚未上线。${publicationScheduleDescription}`,failure:false,persistent:true};
 if(status==='building')return {label:withdraw?`正在${operation}`:'正在部署',message:`${subject}正在${operation}，完成后会提示结果。`,failure:false,persistent:true};
 if(status==='live')return {label:`${operation}成功`,message:withdraw?`${subject}已从公开页面${operation}。`:`${subject}发布成功，提交的版本已上线。`,failure:false,persistent:false};
 if(status==='failed')return {label:`${operation}失败`,message:`${subject}${operation}失败，上次在线版本仍保留。${error?`原因：${error}`:'请重试或查看发布记录。'}`,failure:true,persistent:true};
 if(status==='superseded')return {label:'已被新版本替代',message:`${subject}的这次请求已被更新版本替代，请查看最新发布状态。`,failure:false,persistent:true};
 return {label:'状态待确认',message:'暂时无法确认发布状态，请刷新状态或查看发布记录。',failure:true,persistent:true};
}

// Only notify for requests submitted in this tab, once per state transition.
export function changedReleaseFeedback(requests:PublicationRequest[],releases:ReleaseRecord[],previous:ReadonlyMap<string,string>){
 return requests.flatMap(request=>{
  if(['live','failed','superseded'].includes(previous.get(request.id)||''))return [];
  const release=releases.find(item=>item.id===request.id);
  return release&&previous.get(request.id)!==release.status?[{id:request.id,status:release.status,...releaseFeedback(request,release.status,release.error)}]:[];
 });
}
