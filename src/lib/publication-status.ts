export const publicationScheduleHours=2;
export const publicationScheduleDescription=`自动发布计划每 ${publicationScheduleHours} 小时检查一次，GitHub 执行可能延迟。`;

export interface ArticlePublication {
 post_id:string;slug:string;state:string;action:'publish'|'withdraw';release_id:string|null;
 submitted_at:string|null;error:string|null;has_live_version:boolean;has_unpublished_changes:boolean;
}
export function publicationLabel(publication:ArticlePublication|undefined,unavailable=false,now=Date.now()){
 if(unavailable)return '状态待确认';
 if(!publication||publication.state==='draft')return '未发布';
 const withdraw=publication.action==='withdraw';
 if(publication.state==='queued')return now-Date.parse(publication.submitted_at||'')>=publicationScheduleHours*60*60_000?'等待时间较长':withdraw?'等待撤回':'等待发布';
 if(publication.state==='building')return withdraw?'正在撤回':'正在部署';
 if(publication.state==='live')return publication.has_unpublished_changes?'已上线 · 有未发布修改':'已上线';
 if(publication.state==='failed')return withdraw?'撤回失败':'发布失败';
 return '状态待确认';
}
