import test from 'node:test';
import assert from 'node:assert/strict';
import {changedReleaseFeedback,releaseFeedback,type PublicationRequest,type ReleaseRecord} from '../src/lib/release-feedback';
const request:PublicationRequest={id:'release-1',action:'settings',target:''};
const release:ReleaseRecord={id:request.id,sequence:1,status:'queued',created_at:'2026-10-16T00:00:00Z'};

test('提交与部署中不宣称上线，失败和未知结果不会报告成功',()=>{
 assert.match(releaseFeedback(request,'queued').message,/尚未上线/);
 assert.equal(releaseFeedback(request,'building').label,'正在部署');
 assert.equal(releaseFeedback(request,'queued').persistent,true);
 const failed=releaseFeedback(request,'failed','构建未通过');
 assert.equal(failed.failure,true);
 assert.match(failed.message,/构建未通过/);
 assert.match(failed.message,/上次在线版本仍保留/);
 assert.equal(releaseFeedback(request,'unknown').label,'状态待确认');
 assert.equal(releaseFeedback(request,'superseded').label,'已被新版本替代');
});

test('只有本页提交的发布请求改变状态时提醒，不重放历史结果或重复轮询',()=>{
 const previous=new Map([[request.id,'queued']]);
 assert.deepEqual(changedReleaseFeedback([], [release], previous),[]);
 assert.deepEqual(changedReleaseFeedback([request], [release], previous),[]);
 const changes=changedReleaseFeedback([request],[{...release,status:'building'}],previous);
 assert.equal(changes.length,1);
 assert.equal(changes[0].label,'正在部署');
 previous.set(request.id,'building');
 assert.deepEqual(changedReleaseFeedback([request],[{...release,status:'building'}],previous),[]);
 const done=changedReleaseFeedback([request],[{...release,status:'live'}],previous);
 assert.equal(done[0].failure,false);
 assert.match(done[0].message,/提交的版本已上线/);
});

test('撤回和移除的完成提醒与发布成功明确区分',()=>{
 for(const action of ['unpublish','delete'] as const){
  const feedback=releaseFeedback({...request,action,target:'文章标题'},'live');
  assert.match(feedback.message,/已从公开页面/);
  assert.doesNotMatch(feedback.message,/已上线/);
  assert.equal(feedback.failure,false);
 }
});

test('同时完成的请求都保留提醒，已结束的历史版本变化不再弹出',()=>{
 const second={...request,id:'release-2',action:'publish' as const,target:'第二篇文章'};
 const previous=new Map([[request.id,'building'],[second.id,'building']]);
 const changes=changedReleaseFeedback([request,second],[{...release,status:'failed'},{...release,id:second.id,status:'live'}],previous);
 assert.equal(changes.length,2);
 assert.equal(changes[0].failure,true);
 assert.equal(changes[1].failure,false);
 previous.set(request.id,'failed');previous.set(second.id,'live');
 assert.deepEqual(changedReleaseFeedback([request,second],[{...release,status:'failed'},{...release,id:second.id,status:'superseded'}],previous),[]);
});
