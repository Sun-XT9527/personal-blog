import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
export const projectUrl='https://spb-9wis0ky4nvb4lvh5.supabase.opentrust.net';
export function unpack(value){if(typeof value==='string'){try{return unpack(JSON.parse(value))}catch{return value}}if(value?.content)return value.content.filter(x=>x.type==='text').map(x=>unpack(x.text));return value;}
export function findObjects(value,predicate){if(!value||typeof value!=='object')return [];return [...(predicate(value)?[value]:[]),...Object.values(value).flatMap(v=>findObjects(v,predicate))];}
export async function connect(){
 const config=await fs.readFile(path.join(os.homedir(),'.codex','config.toml'),'utf8');
 const section=config.split('[mcp_servers.aliyun-supabase.env]')[1]?.split(/\n\[/)[0];
 const access=section?.match(/ALIYUN_ACCESS_TOKEN\s*=\s*["']([^"']+)["']/)?.[1];
 if(!access)throw new Error('未找到已配置的阿里云连接凭据。');
 const cache=path.join(os.homedir(),'AppData','Local','npm-cache','_npx');
 let server;for(const name of await fs.readdir(cache)){const candidate=path.join(cache,name,'node_modules','@aliyun-supabase','mcp-server-supabase','dist','transports','stdio.js');try{await fs.access(candidate);server=candidate;break}catch{}}
 if(!server)throw new Error('阿里云 MCP 组件尚未安装。');
 // This task-specific connection enables the writes explicitly requested in the implementation plan.
 const transport=new StdioClientTransport({command:process.execPath,args:[server,'--features=aliyun','--project-id=spb-9wis0ky4nvb4lvh5','--region-id=cn-hangzhou'],env:{...Object.fromEntries(Object.entries(process.env).filter(([,v])=>typeof v==='string')),ALIYUN_ACCESS_TOKEN:access},stderr:'pipe'});
 const client=new Client({name:'sun-xt-blog-setup',version:'1.0.0'});await client.connect(transport);
 const result=unpack(await client.callTool({name:'get_supabase_project_api_keys',arguments:{}}));
 const apiKeys=findObjects(result,v=>v.apiKey&&v.name);const key=apiKeys.find(v=>v.name==='serviceRoleKey')?.apiKey;const anon=apiKeys.find(v=>v.name==='anonKey')?.apiKey;
 if(!key||!anon){await client.close();throw new Error('无法取得项目所需凭据。');}
 const sql=async(query)=>{const raw=await client.callTool({name:'execute_sql',arguments:{url:projectUrl,api_key:key,sql:query}});const decoded=unpack(raw);const failure=findObjects(decoded,v=>v.error);if(raw.isError||failure.length)throw new Error(failure[0]?.error?.message||'数据库操作失败');return decoded;};
 const api=async(endpoint,options={})=>{const response=await fetch(projectUrl+endpoint,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.msg||data?.message||data?.error_description||`服务返回 ${response.status}`);return data;};
 return {client,key,anon,sql,api,close:()=>client.close()};
}
