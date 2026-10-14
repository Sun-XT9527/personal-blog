import {createClient} from '@supabase/supabase-js';
import {publicConfig} from './public-config';
export const supabase=createClient(publicConfig.url,publicConfig.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export async function callFunction(name:string,body:Record<string,unknown>){const {data,error}=await supabase.functions.invoke(name,{body});if(error){let message=error.message;try{const response=await error.context.json();message=response.error||message}catch{}throw new Error(message)}if(data?.error)throw new Error(data.error);return data;}
export const sitePath=(path='')=>`${import.meta.env.BASE_URL.replace(/\/$/,'')}/${path.replace(/^\//,'')}`;
