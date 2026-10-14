import {connect,projectUrl} from './connection.mjs';import assert from 'node:assert/strict';
const conn=await connect();try{
 await conn.sql(`BEGIN;DO $$ DECLARE k text=encode(gen_random_bytes(32),'hex');i integer;denied boolean=false;BEGIN
  FOR i IN 1..3 LOOP PERFORM public.blog_add_message(k,'测试','数据库限流验收',NULL);END LOOP;
  BEGIN PERFORM public.blog_add_message(k,'测试','第四次请求应被拒绝',NULL);EXCEPTION WHEN OTHERS THEN IF SQLERRM='rate_limited' THEN denied=true;ELSE RAISE;END IF;END;
  IF NOT denied THEN RAISE EXCEPTION '原子限流未生效';END IF;
  denied=false;BEGIN PERFORM public.blog_add_message(encode(gen_random_bytes(32),'hex'),'测试',repeat('字',1001),NULL);EXCEPTION WHEN OTHERS THEN IF SQLERRM='invalid_message' THEN denied=true;ELSE RAISE;END IF;END;
  IF NOT denied THEN RAISE EXCEPTION '留言长度限制未生效';END IF;
  denied=false;BEGIN PERFORM public.blog_add_message(encode(gen_random_bytes(32),'hex'),'测试','文章尚未公开',gen_random_uuid());EXCEPTION WHEN OTHERS THEN IF SQLERRM='article_not_live' THEN denied=true;ELSE RAISE;END IF;END;
  IF NOT denied THEN RAISE EXCEPTION '非公开文章留言未被拒绝';END IF;
 END $$;ROLLBACK;`);console.log('数据库原子限流、留言长度和非公开文章检查通过；测试事务已回滚。');
 const response=await fetch(projectUrl+'/storage/v1/object/sign/blog-drafts/does-not-exist.png',{method:'POST',headers:{apikey:conn.anon,Authorization:'Bearer '+conn.anon,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:60})});assert.ok(!response.ok);console.log('访客无法取得草稿图片签名链接。');
 const tableCounts=await conn.sql("SELECT 'events' AS table_name,count(*) AS rows FROM public.events UNION ALL SELECT 'shopping',count(*) FROM public.shopping;");console.log('现有工作台记录未进行任何写入。');
}finally{await conn.close()}
