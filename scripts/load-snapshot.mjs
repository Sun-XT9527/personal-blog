import fs from 'node:fs/promises';
const configSource=await fs.readFile('src/lib/public-config.ts','utf8');const config=JSON.parse(configSource.slice(configSource.indexOf('=')+1).replace(/;\s*$/,''));
const release=process.env.BLOG_RELEASE_ID;
const endpoint=release?'blog_get_build_snapshot':'blog_get_live_snapshot';
const response=await fetch(`${config.url}/rest/v1/rpc/${endpoint}`,{method:'POST',headers:{apikey:config.anonKey,Authorization:`Bearer ${config.anonKey}`,'Content-Type':'application/json'},body:JSON.stringify(release?{p_release_id:release}:{}),signal:AbortSignal.timeout(30000)});
if(!response.ok)throw new Error(`公开内容读取失败 (${response.status})，停止构建以保留在线版本。`);
const snapshot=await response.json();if(!snapshot?.settings||!Array.isArray(snapshot.posts))throw new Error('公开内容格式不正确。');
await fs.mkdir('src/data',{recursive:true});await fs.writeFile('src/data/snapshot.json',JSON.stringify(snapshot));console.log(`已读取公开快照：${snapshot.posts.length} 篇文章。`);
