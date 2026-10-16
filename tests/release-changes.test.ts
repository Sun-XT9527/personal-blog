import test from 'node:test';
import assert from 'node:assert/strict';
import {describeReleaseChanges,summarizeReleaseHistory} from '../src/lib/release-changes';
import {defaultSnapshot} from '../src/lib/defaults';
import type {DocNode,Post,Snapshot} from '../src/lib/types';

const paragraph=(value:string):DocNode=>({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:value}]}]});
const article=(id:string,title=id):Post=>({id,title,slug:id,category:'日常记录',excerpt:'原摘要',document:paragraph('原正文'),featured:false,cover:'',published_at:'2026-10-15T00:00:00Z',updated_at:'2026-10-15T00:00:00Z'});
function snapshot(posts:Post[]=[]):Snapshot{return {...structuredClone(defaultSnapshot),posts};}

test('发布记录标明新增、编辑和移除的具体文章与字段',()=>{
 const previous=snapshot([article('a','旧标题'),article('b','将移除的文章')]),current=structuredClone(previous);
 current.posts=[{...article('a','新标题'),category:'研究札记',excerpt:'新摘要',document:paragraph('新正文'),cover:'https://example.com/new.png',featured:true},article('c','新文章')];
 const changes=describeReleaseChanges(current,previous);
 assert.equal(changes.state,'changed');
 assert.deepEqual(changes.entries[0],{title:'更新文章《新标题》',details:['标题：「旧标题」 → 「新标题」','分类：日常记录 → 研究札记','摘要','正文或排版','封面图片','设为精选文章']});
 assert.ok(changes.entries.some(entry=>entry.title==='新增文章《新文章》'));
 assert.ok(changes.entries.some(entry=>entry.title==='从公开版本移除文章《将移除的文章》'));
});

test('发布时间、来源时间、旧标签和文章排列变化不伪造内容变更',()=>{
 const previous=snapshot([article('a'),article('b')]),current=structuredClone(previous);
 current.revision='new-release';current.created_at='2026-10-16T00:00:00Z';
 current.posts.reverse();
 current.posts[0].updated_at='2026-10-16T00:00:00Z';current.posts[0].published_at='2026-10-16T00:00:00Z';
 Object.assign(current.posts[1],{tags:['旧标签'],document:{content:current.posts[1].document.content,type:'doc'}});
 assert.deepEqual(describeReleaseChanges(current,previous),{state:'unchanged',entries:[]});
});

test('同一上传图片重新复制或签名续期不算正文和封面修改，不同图片仍算修改',()=>{
 const root='https://spb-9wis0ky4nvb4lvh5.supabase.opentrust.net/storage/v1/object/';
 const upload='11111111-1111-4111-8111-111111111111.png';
 const first=root+'public/blog-public/22222222-2222-4222-8222-222222222222-'+upload;
 const second=root+'public/blog-public/33333333-3333-4333-8333-333333333333-'+upload;
 const image=(src:string):DocNode=>({type:'doc',content:[{type:'image',attrs:{src,alt:'相同图片'}}]});
 const previous=snapshot([{...article('a'),cover:first,document:image(first)}]),current=structuredClone(previous);
 current.posts[0].cover=second;current.posts[0].document=image(second);
 assert.equal(describeReleaseChanges(current,previous).state,'unchanged');
 current.posts[0].document=image(root+'sign/blog-drafts/'+upload+'?token=renewed');
 assert.equal(describeReleaseChanges(current,previous).state,'unchanged');
 current.posts[0].document=image('https://example.com/photo.png?v=2');
 current.posts[0].cover='https://example.com/cover.png';
 assert.deepEqual(describeReleaseChanges(current,previous).entries[0].details,['正文或排版','封面图片']);
});

test('个人资料显示具体字段及前后值，并保留清空主页的含义',()=>{
 const previous=snapshot(),current=structuredClone(previous);
 current.settings.name='新博客';current.settings.author='新署名';current.settings.description='新简介';
 current.settings.github='https://github.com/example';current.settings.about=paragraph('新的自我介绍');
 current.settings.socials.bilibili='';
 const changes=describeReleaseChanges(current,previous);
 assert.deepEqual(changes.entries.map(entry=>entry.title),['修改博客名称','修改署名','修改一句话简介','修改GitHub 主页','修改“关于我”正文或排版','修改B站主页']);
 assert.match(changes.entries[0].details![0],/Sun XT 的博客.*新博客/);
 assert.match(changes.entries.at(-1)!.details![0],/→ （留空）$/);
});

test('作品按稳定编号识别新增、移除、编辑和顺序调整',()=>{
 const previous=snapshot(),current=structuredClone(previous);
 previous.settings.projects=[{id:'a',title:'工具 A',description:'旧介绍',url:'https://example.com/a'},{id:'b',title:'工具 B',description:'',url:''},{id:'c',title:'旧作品',description:'',url:''}];
 current.settings.projects=[previous.settings.projects[1],{...previous.settings.projects[0],title:'新工具 A',description:'新介绍',url:'https://example.com/new'},{id:'d',title:'新作品',description:'',url:''}];
 const changes=describeReleaseChanges(current,previous);
 assert.deepEqual(changes.entries.map(entry=>entry.title),['更新作品《新工具 A》','新增作品《新作品》','移除作品《旧作品》','调整作品展示顺序']);
 assert.deepEqual(changes.entries[0].details,['名称：「工具 A」 → 「新工具 A」','介绍','链接：「https://example.com/a」 → 「https://example.com/new」']);
});

test('历史记录按版本号比较上一条保留版本，版本号有缺口也能准确显示',()=>{
 const first=snapshot(),second=structuredClone(first),third=structuredClone(first);
 second.settings.author='第二个署名';third.settings.author='第三个署名';
 const records=[{id:'third',sequence:30,snapshot:third},{id:'first',sequence:22,snapshot:first},{id:'second',sequence:26,snapshot:second}];
 const original=structuredClone(records),summaries=summarizeReleaseHistory(records);
 assert.equal(summaries.second.comparedSequence,22);assert.equal(summaries.third.comparedSequence,26);
 assert.match(summaries.third.entries[0].details![0],/第二个署名.*第三个署名/);
 assert.deepEqual(records,original);
});

test('首个保留版本、相同内容和不完整快照分别说明，不编造操作原因',()=>{
 const current=snapshot([article('a','第一篇')]);
 const initial=describeReleaseChanges(current);
 assert.equal(initial.state,'initial');assert.equal(initial.entries[0].title,'收录文章《第一篇》');
 assert.equal(describeReleaseChanges(current,structuredClone(current)).state,'unchanged');
 assert.equal(describeReleaseChanges(current,{posts:[]}).state,'unavailable');
 assert.equal(describeReleaseChanges({settings:{},posts:[{}]}).state,'unavailable');
 const records=summarizeReleaseHistory([{id:'bad',sequence:1,snapshot:undefined},{id:'good',sequence:2,snapshot:current}]);
 assert.equal(records.good.state,'unavailable');
});

test('旧版本缺少新增主页字段仍可比较，且不同外部图片查询参数不被忽略',()=>{
 const previous=snapshot([{...article('a'),cover:'https://example.com/image.png?v=1'}]),current=structuredClone(previous);
 delete (previous.settings as Partial<typeof previous.settings>).socials;
 current.posts[0].cover='https://example.com/image.png?v=2';
 const changes=describeReleaseChanges(current,previous);
 assert.ok(changes.entries.some(entry=>entry.details?.includes('封面图片')));
 assert.ok(changes.entries.some(entry=>entry.title==='修改B站主页'));
});
