import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingArticles,type SearchArticle} from '../src/lib/article-search';

const articles:SearchArticle[]=[
 {id:'daily',category:'日常记录',text:'我的健身记录 今天练了深蹲'},
 {id:'research',category:'研究札记',text:'论文阅读与实验 深蹲动作识别方法'},
 {id:'video',category:'视频文案',text:'校园网 Minecraft 文案 与舍友联机'},
];

test('分类和全文搜索同时生效，切回全部保留搜索条件',()=>{
 assert.deepEqual(matchingArticles(articles,'深蹲','日常记录').map(article=>article.id),['daily']);
 assert.deepEqual(matchingArticles(articles,'深蹲','').map(article=>article.id),['daily','research']);
 assert.deepEqual(matchingArticles(articles,'  minecraft  ','视频文案').map(article=>article.id),['video']);
 assert.deepEqual(matchingArticles(articles,'Minecraft','研究札记'),[]);
 assert.equal(matchingArticles(articles,'','').length,3);
});

test('空分类和空文章列表能够安全显示空状态',()=>{
 assert.deepEqual(matchingArticles([], '', '研究札记'),[]);
 assert.deepEqual(matchingArticles(articles.filter(article=>article.category!=='研究札记'),'','研究札记'),[]);
});
