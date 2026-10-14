import {connect,projectUrl} from './connection.mjs';import assert from 'node:assert/strict';
const conn=await connect();try{const anonymous=async(path,method='GET',body)=>fetch(projectUrl+path,{method,headers:{apikey:conn.anon,Authorization:`Bearer ${conn.anon}`,'Content-Type':'application/json',Origin:'http://127.0.0.1:4321'},body:body===undefined?undefined:JSON.stringify(body)});
 for(const table of ['blog_drafts','blog_settings','blog_runtime_config','blog_releases','blog_posts','blog_admins']){const response=await anonymous('/rest/v1/'+table+'?select=*');assert.ok([401,403].includes(response.status),`${table} 必须禁止访客访问`);console.log(`${table}：访客访问已拒绝。`)}
 const snapshot=await anonymous('/rest/v1/rpc/blog_get_live_snapshot','POST',{});assert.equal(snapshot.status,200);assert.ok(Array.isArray((await snapshot.json()).posts));console.log('公开快照读取正常。');
 const insert=await anonymous('/rest/v1/blog_messages','POST',{nickname:'test',body:'unauthorized'});assert.ok([401,403].includes(insert.status));console.log('访客绕过留言接口直接写表：已拒绝。');
 const admin=await anonymous('/functions/v1/blog-publish','POST',{action:'settings'});assert.equal(admin.status,401,'匿名用户不能发布文章');console.log('未登录发布文章：已拒绝。');
 const bot=await anonymous('/functions/v1/blog-message','POST',{website:'bot.example',body:'test',nickname:'',visitorId:crypto.randomUUID(),postId:null});assert.equal(bot.status,400);console.log('隐藏字段垃圾提交：已拒绝。');
 const signature=await anonymous('/functions/v1/blog-release-status','POST',{id:crypto.randomUUID(),status:'live'});assert.equal(signature.status,401);console.log('伪造部署结果：已拒绝。');
 const visitorId=crypto.randomUUID();const ids=[];try{for(let i=0;i<4;i++){const result=await anonymous('/functions/v1/blog-message','POST',{body:`[自动测试] 留言限流 ${i}`,nickname:'测试',website:'',visitorId,postId:null});if(i<3){assert.equal(result.status,201);const data=await result.json();ids.push(data.message.id);}else assert.equal(result.status,429);}console.log('留言即时写入及每分钟 3 次限流验证通过。');}finally{if(ids.length)await conn.api('/rest/v1/blog_messages?id=in.('+ids.join(',')+')',{method:'PATCH',body:JSON.stringify({deleted_at:new Date().toISOString()})})}
 const privateImage=await anonymous('/storage/v1/object/sign/blog-drafts/no-file.png','POST',{expiresIn:60});assert.ok(!privateImage.ok);console.log('私人草稿图片签名访问：已拒绝。');
 console.log('后台基础权限验收全部通过。');
}finally{await conn.close()}
