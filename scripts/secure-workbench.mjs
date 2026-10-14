import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {connect,findObjects,projectUrl} from './connection.mjs';
const phase=process.argv[2];const setup=JSON.parse(await fs.readFile('.private/setup-status.json','utf8'));if(!setup.loginVerified||!setup.adminId)throw new Error('请先在本机完成管理员创建和登录验证。');const conn=await connect();
try{if(phase==='stage'){await conn.sql(await fs.readFile('supabase/migrations/002_workbench_admin_access.sql','utf8'));console.log('工作台管理员访问权限已准备，匿名权限尚未移除。');}
else if(phase==='protect'){
 const response=await fetch('https://sun-xt9527.github.io/personal-workbench/',{cache:'no-store'});const html=await response.text();assert.ok(response.ok&&html.includes('workbench-login-form')&&html.includes('startWorkbench();'),'必须先部署工作台登录页面');
 const before=await conn.sql("SELECT 'events' AS name,count(*) AS count FROM public.events UNION ALL SELECT 'shopping',count(*) FROM public.shopping;");const counts=findObjects(before,x=>x.name&&x.count!==undefined);assert.deepEqual(counts.map(x=>Number(x.count)),[6,1]);
 await conn.sql(await fs.readFile('supabase/migrations/003_workbench_private.sql','utf8'));
 const after=await conn.sql("SELECT 'events' AS name,count(*) AS count FROM public.events UNION ALL SELECT 'shopping',count(*) FROM public.shopping;");assert.deepEqual(after,before);
 for(const table of ['budgets','events','fitness_logs','fitness_plan','habit_logs','habits','media','settings','shopping','transactions']){const r=await fetch(projectUrl+'/rest/v1/'+table+'?select=*',{headers:{apikey:conn.anon,Authorization:'Bearer '+conn.anon}});assert.ok([401,403].includes(r.status),`${table} 应拒绝未登录请求`)}console.log('工作台 10 张表已关闭匿名访问；6 条日程和 1 条购物记录完整保留。');
}else throw new Error('请指定 stage 或 protect。');}finally{await conn.close()}
