import {defaultSnapshot} from './defaults';
import type {Snapshot} from './types';
import {readFileSync,existsSync} from 'node:fs';
const path=process.cwd()+'/src/data/snapshot.json';
export const snapshot:Snapshot=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):structuredClone(defaultSnapshot);
export const posts=[...snapshot.posts].sort((a,b)=>Date.parse(b.published_at||'')-Date.parse(a.published_at||''));
export const pathTo=(path='')=>`${import.meta.env.BASE_URL.replace(/\/$/,'')}/${path.replace(/^\//,'')}`;
export const dateText=(date?:string)=>date?new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Shanghai'}).format(new Date(date)):'';
