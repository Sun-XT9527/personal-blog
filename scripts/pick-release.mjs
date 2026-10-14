import fs from 'node:fs/promises';
export async function selectPublication({event,requested='',fetchPending}) {
  if(requested){
    if(!/^[a-f0-9-]{36}$/.test(requested))throw new Error('发布版本编号不正确。');
    return {releaseId:requested,shouldBuild:true};
  }
  if(event==='push')return {releaseId:'',shouldBuild:true};
  const pending=await fetchPending();
  if(pending&&!/^[a-f0-9-]{36}$/.test(pending.id))throw new Error('发布队列返回了无效编号。');
  return {releaseId:pending?.id||'',shouldBuild:!!pending||event!=='schedule'};
}
async function main(){
  const source=await fs.readFile('src/lib/public-config.ts','utf8');
  const config=JSON.parse(source.slice(source.indexOf('=')+1).replace(/;\s*$/,''));
  const result=await selectPublication({event:process.env.GITHUB_EVENT_NAME,requested:process.env.REQUESTED_RELEASE_ID||'',fetchPending:async()=>{
    const response=await fetch(config.url+'/rest/v1/rpc/blog_get_pending_release',{method:'POST',headers:{apikey:config.anonKey,Authorization:'Bearer '+config.anonKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('发布队列读取失败。');return response.json();
  }});
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`release_id=${result.releaseId}\nshould_build=${result.shouldBuild}\n`);
  console.log(result.shouldBuild?(result.releaseId?'已领取待发布版本。':'生成源码预览。'):'没有待发布内容。');
}
if(process.argv[1]?.replace(/\\/g,'/').endsWith('/scripts/pick-release.mjs'))await main();
