import {Deno,config,headers,response,input,admin,rpc,api,safeError} from '../shared';
import {generateSummary,summaryInput,SummaryError} from '../../../server/summary.mjs';
Deno.serve(async request=>{let extra:Record<string,string>={};try{
 const cfg=await config();const origins=cfg.allowed_origins||['https://sun-xt9527.github.io'];const origin=request.headers.get('Origin');extra=headers(origin,origins);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:extra});
 if(request.method!=='POST')return response({error:'不支持这个请求。'},405,extra);
 if(origin&&!origins.includes(origin))return response({error:'请求来源不正确。'},403,extra);
 const user=await admin(request),data=await input(request),settings=cfg.ai_summary;
 const configured=!!(settings?.enabled&&settings?.api_key);
 if(data.action==='status')return response({configured,saved:!!settings?.api_key,provider:'阿里云百炼',model:settings?.model},200,extra);
 if(data.action==='verify'){
  if(!settings?.api_key)return response({error:'请先在本地配置页保存百炼 API Key。'},503,extra);
  await rpc('blog_take_summary_slot',{p_user_id:user.id});
  await generateSummary(settings,{title:'博客摘要连接验证',text:'这是一篇用于验证博客 AI 摘要服务的示例文章。它介绍如何记录学习笔记，并在发布前检查内容。'});
  const current=await config();if(current.ai_summary?.api_key!==settings.api_key)return response({error:'模型配置刚刚发生变更，请重新验证。'},409,extra);
  await api('/rest/v1/blog_runtime_config?id=eq.1','PATCH',{config:{...current,ai_summary:{...settings,enabled:true}}});
  return response({configured:true,provider:'阿里云百炼',model:settings.model},200,extra);
 }
 if(data.action!=='generate')return response({error:'摘要操作不正确。'},400,extra);
 if(!configured)return response({error:'尚未配置百炼摘要服务，请先完成模型连接。'},503,extra);
 const content=summaryInput(data);await rpc('blog_take_summary_slot',{p_user_id:user.id});
 return response(await generateSummary(settings,content),200,extra);
}catch(error){if(error instanceof SummaryError)return response({error:error.message},error.status,extra);const [message,status]=safeError(error);return response({error:message},status,extra)}});
