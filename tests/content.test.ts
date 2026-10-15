import test from 'node:test';
import assert from 'node:assert/strict';
import {categories,isCategory,normalizeCategory} from '../src/lib/categories';
import {normalizeSnapshot,normalizeSettings} from '../src/lib/content';
import {defaultSocialLinks,isProfileUrl} from '../src/lib/socials';
import type {Snapshot} from '../src/lib/types';

test('分类顺序固定，旧分类按确认的规则迁移',()=>{
  assert.deepEqual(categories,['日常记录','研究札记','视频文案']);
  assert.equal(isCategory('项目'),false);
  assert.equal(normalizeCategory('学习','note-1792032558657','初见'),'日常记录');
  assert.equal(normalizeCategory('学习','note-1792034936291','为什么你连上校园网，却不能和舍友玩 Minecraft？'),'视频文案');
  assert.equal(normalizeCategory('教程','other-note','其他旧文章'),'日常记录');
  assert.equal(normalizeCategory('研究札记','other-note','我的研究'),'研究札记');
});

test('旧公开快照移除文章和作品标签，同时保留正文、版本和链接且不改写输入',()=>{
  const old={
    revision:'old-release',
    settings:{name:'博客',author:'Sun XT',description:'简介',github:'https://github.com/Sun-XT9527',about:{type:'doc'},projects:[{id:'tool',title:'我的工具',description:'工具介绍',url:'https://example.com/tool',tags:['工具']}]},
    posts:[{id:'first',slug:'first-note',title:'初见',excerpt:'你好',document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'未改动的正文'}]}]},category:'学习',tags:['旧标签'],published_at:'2026-10-15T00:00:00Z',updated_at:'2026-10-15T00:00:00Z'}],
  };
  const before=structuredClone(old);
  const clean=normalizeSnapshot(old as unknown as Snapshot);
  assert.equal(clean.posts[0].category,'日常记录');
  assert.equal('tags' in clean.posts[0],false);
  assert.equal('tags' in clean.settings.projects[0],false);
  assert.deepEqual(clean.posts[0].document,old.posts[0].document);
  assert.equal(clean.posts[0].published_at,old.posts[0].published_at);
  assert.equal(clean.posts[0].updated_at,old.posts[0].updated_at);
  assert.equal(clean.posts[0].slug,old.posts[0].slug);
  assert.equal(clean.revision,old.revision);
  assert.equal(clean.settings.projects[0].url,old.settings.projects[0].url);
  assert.deepEqual(old,before);
  assert.deepEqual(normalizeSnapshot(clean),clean);
});

test('旧站点补齐已提供的主页链接，留空隐藏和后来修改的链接都能保留',()=>{
 const old={name:'保留后台名称',author:'Sun XT',description:'原有简介',github:'https://github.com/Sun-XT9527',about:{type:'doc'},projects:[]};
 const settings=normalizeSettings(old);
 assert.deepEqual(settings.socials,defaultSocialLinks);
 assert.equal(settings.name,old.name);
 assert.deepEqual(settings.about,old.about);
 const edited=normalizeSettings({...settings,socials:{bilibili:'',douyin:' https://example.com/new-profile ',xiaohongshu:settings.socials.xiaohongshu}});
 assert.equal(edited.socials.bilibili,'');
 assert.equal(edited.socials.douyin,'https://example.com/new-profile');
 assert.deepEqual(normalizeSettings(edited),edited);
});

test('主页链接允许 HTTPS 短链接和留空，拒绝脚本及不完整地址',()=>{
 assert.equal(isProfileUrl(defaultSocialLinks.douyin),true);
 assert.equal(isProfileUrl(''),true);
 assert.equal(isProfileUrl('javascript:alert(1)'),false);
 assert.equal(isProfileUrl('//example.com/profile'),false);
 assert.equal(isProfileUrl('example.com/profile'),false);
});
