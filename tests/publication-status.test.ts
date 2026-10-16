import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationLabel,type ArticlePublication} from '../src/lib/publication-status';
const submitted='2026-10-15T03:00:00Z';
const publication:ArticlePublication={post_id:'post',slug:'first-post',state:'queued',action:'publish',release_id:'release',submitted_at:submitted,error:null,has_live_version:false,has_unpublished_changes:false};
test('提交发布不会被显示成已经上线，等待过久会有明确提示',()=>{
 assert.equal(publicationLabel(publication,false,Date.parse(submitted)+60_000),'等待发布');
 assert.equal(publicationLabel(publication,false,Date.parse(submitted)+5*60_000),'等待发布');
 assert.equal(publicationLabel(publication,false,Date.parse(submitted)+2*60*60_000-1),'等待发布');
 assert.equal(publicationLabel(publication,false,Date.parse(submitted)+2*60*60_000),'等待时间较长');
 assert.equal(publicationLabel({...publication,state:'building'}),'正在部署');
});
test('上线与失败区分，已上线文章的后续草稿修改不会被误认为已发布',()=>{
 assert.equal(publicationLabel({...publication,state:'live'}),'已上线');
 assert.equal(publicationLabel({...publication,state:'live',has_unpublished_changes:true}),'已上线 · 有未发布修改');
 assert.equal(publicationLabel({...publication,state:'failed'}),'发布失败');
 assert.equal(publicationLabel({...publication,state:'live'},true),'状态待确认');
});
test('撤回也要等待部署，未知状态不能报告成功',()=>{
 assert.equal(publicationLabel({...publication,action:'withdraw'},false,Date.parse(submitted)),'等待撤回');
 assert.equal(publicationLabel({...publication,action:'withdraw',state:'building'}),'正在撤回');
 assert.equal(publicationLabel({...publication,state:'superseded'}),'状态待确认');
 assert.equal(publicationLabel(undefined),'未发布');
});
