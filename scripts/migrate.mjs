import fs from 'node:fs/promises';import {connect,findObjects} from './connection.mjs';
const conn=await connect();
try{
 await fs.mkdir('.private',{recursive:true});
 const tables=['budgets','events','fitness_logs','fitness_plan','habit_logs','habits','media','settings','shopping','transactions'];const backup={created_at:new Date().toISOString(),project:'spb-9wis0ky4nvb4lvh5',tables:{}};
 for(const name of tables){backup.tables[name]=await conn.sql(`SELECT * FROM public.${name};`)}
 backup.policies=await conn.sql("SELECT * FROM pg_policies WHERE schemaname='public';");backup.grants=await conn.sql("SELECT * FROM information_schema.table_privileges WHERE table_schema='public';");backup.columns=await conn.sql("SELECT * FROM information_schema.columns WHERE table_schema='public';");
 await fs.writeFile(`.private/workbench-backup-${Date.now()}.json`,JSON.stringify(backup,null,2));
 console.log('现有工作台数据和权限已备份到本地私有目录。');
 await conn.sql(await fs.readFile('supabase/migrations/001_blog.sql','utf8'));
 console.log('博客数据结构、私有草稿、留言限流和存储权限已创建。');
}finally{await conn.close()}
