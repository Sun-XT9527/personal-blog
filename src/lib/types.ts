import type {Category} from './categories';
export interface DocNode {type:string; text?:string; attrs?:Record<string,unknown>; marks?:{type:string;attrs?:Record<string,unknown>}[]; content?:DocNode[]}
export interface Post {id:string;slug:string;title:string;excerpt:string;document:DocNode;category:Category;cover?:string;published_at?:string;updated_at?:string;featured?:boolean}
export interface Project {id:string;title:string;description:string;url:string}
export interface SiteSettings {name:string;author:string;description:string;about:DocNode;github:string;projects:Project[]}
export interface Snapshot {settings:SiteSettings;posts:Post[];revision?:string;created_at?:string}
export const emptyDocument:DocNode={type:'doc',content:[{type:'paragraph'}]};
