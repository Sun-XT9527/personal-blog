import test from 'node:test';import assert from 'node:assert/strict';
import {generateSummary,summaryInput,summarySettings,SummaryError} from '../server/summary.mjs';
const settings={api_key:'sk-'+'x'.repeat(30),model:'qwen-plus',base_url:'https://dashscope.aliyuncs.com/compatible-mode/v1'};
const input={title:'局域网联机记录',text:'这篇记录讲解同一校园网内无法互相发现游戏房间的问题，并梳理排查步骤。'};
test('百炼密钥只会发往明确允许的官方 HTTPS 地址，拒绝重定向',async()=>{
 for(const base_url of ['http://dashscope.aliyuncs.com/compatible-mode/v1','https://evil.example/compatible-mode/v1','https://dashscope.aliyuncs.com.evil.example/compatible-mode/v1','https://user:secret@dashscope.aliyuncs.com/compatible-mode/v1','https://dashscope.aliyuncs.com/compatible-mode/v1?key=secret'])assert.throws(()=>summarySettings({...settings,base_url}));
 const result=await generateSummary(settings,input,async(url,options)=>{assert.equal(url,'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');assert.ok(options);assert.equal(options.redirect,'error');assert.equal(typeof options.body,'string');const body=JSON.parse(String(options.body));assert.equal(body.model,'qwen-plus');assert.equal(JSON.parse(body.messages[1].content).article,input.text);assert.ok(!JSON.stringify(body).includes(settings.api_key));return Response.json({choices:[{finish_reason:'stop',message:{content:'校园网联机问题的排查记录。'}}]})});
 assert.equal(result.summary,'校园网联机问题的排查记录。');
});
test('模型认证或限流错误不会把上游响应中的密钥泄露给页面',async()=>{
 await assert.rejects(generateSummary(settings,input,async()=>new Response(settings.api_key,{status:401})),error=>error instanceof SummaryError&&!error.message.includes(settings.api_key)&&error.message.includes('认证失败'));
 await assert.rejects(generateSummary(settings,input,async()=>new Response(settings.api_key,{status:429})),error=>error instanceof SummaryError&&!error.message.includes(settings.api_key)&&error.status===429);
});
test('网络失败、空结果和截断结果不会被当作可采用的摘要',async()=>{
 await assert.rejects(generateSummary(settings,input,async()=>{throw new Error(settings.api_key)}),error=>error instanceof SummaryError&&!error.message.includes(settings.api_key)&&error.status===503);
 for(const choices of [[],[{finish_reason:'length',message:{content:'未完成'}}],[{finish_reason:'stop',message:{content:''}}],[{finish_reason:'stop',message:{content:'文'.repeat(501)}}]])await assert.rejects(generateSummary(settings,input,async()=>Response.json({choices})));
});
test('文章内容作为待概括资料发送，空白或过长正文被拒绝',()=>{
 assert.throws(()=>summaryInput({title:'标题',text:'短'}));assert.throws(()=>summaryInput({...input,text:'文'.repeat(40001)}));assert.throws(()=>summaryInput({...input,title:''}));
 assert.deepEqual(summaryInput(input),input);
});
