import crypto from 'node:crypto';
if(!process.env.BLOG_RELEASE_ID){console.log('源码预览部署，不需要文章发布回调。');process.exit(0)}
const secret=process.env.BLOG_CALLBACK_SECRET;if(!secret)throw new Error('发布回调密钥尚未配置。');
const timestamp=String(Date.now());const body=JSON.stringify({id:process.env.BLOG_RELEASE_ID,status:process.argv[2],runId:process.env.GITHUB_RUN_ID,error:process.argv[2]==='failed'?'自动部署未完成，请在后台重试。':null});const signature=crypto.createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex');
for(let attempt=0;attempt<3;attempt++){try{const response=await fetch('https://spb-9wis0ky4nvb4lvh5.supabase.opentrust.net/functions/v1/blog-release-status',{method:'POST',headers:{'Content-Type':'application/json','X-Callback-Time':timestamp,'X-Callback-Signature':signature},body,signal:AbortSignal.timeout(20000)});if(response.ok){console.log('发布状态已同步。');process.exit(0)}}catch{}if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1500))}throw new Error('页面部署结果未能同步，请检查后台发布记录。');
