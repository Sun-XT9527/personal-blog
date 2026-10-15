import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connect,projectUrl} from './connection.mjs';
const conn=await connect();
try{
 const admins=await conn.api('/rest/v1/blog_admins?select=user_id&limit=1');
 const admin=admins[0]?.user_id;
 assert.match(admin||'',/^[a-f0-9-]{36}$/);
 const post=randomUUID(),first=randomUUID(),next=randomUUID();
 await conn.sql(`BEGIN;
 SELECT set_config('request.jwt.claim.sub','${admin}',true);
 DO $$ DECLARE actual record; stamp timestamptz=now()-interval '2 minutes'; blocked boolean=false; BEGIN
  INSERT INTO public.blog_drafts(id,slug,title,updated_at) VALUES('${post}','status-check-${post}','状态验收（事务内）',stamp);
  SELECT * INTO actual FROM public.blog_get_article_publication_status() WHERE post_id='${post}';
  IF actual.state<>'draft' THEN RAISE EXCEPTION 'New draft must not be live'; END IF;
  PERFORM public.blog_create_release('publish','${post}',(SELECT to_jsonb(d) FROM public.blog_drafts d WHERE id='${post}'),NULL);
  INSERT INTO public.blog_releases(id,sequence,snapshot,status) OVERRIDING SYSTEM VALUE
   SELECT '${first}',900000001,jsonb_build_object('posts',jsonb_agg(to_jsonb(p))),'queued' FROM public.blog_posts p;
  SELECT * INTO actual FROM public.blog_get_article_publication_status() WHERE post_id='${post}';
  IF actual.state<>'queued' OR actual.has_live_version OR actual.has_unpublished_changes THEN RAISE EXCEPTION 'Queued content must retain its source version without reporting success'; END IF;
  UPDATE public.blog_releases SET status='building' WHERE id='${first}';
  SELECT * INTO actual FROM public.blog_get_article_publication_status() WHERE post_id='${post}';
  IF actual.state<>'building' THEN RAISE EXCEPTION 'Building state missing'; END IF;
  UPDATE public.blog_releases SET status='failed',error='验收失败示例' WHERE id='${first}';
  SELECT * INTO actual FROM public.blog_get_article_publication_status() WHERE post_id='${post}';
  IF actual.state<>'failed' OR actual.error<>'验收失败示例' THEN RAISE EXCEPTION 'Failure state missing'; END IF;
  UPDATE public.blog_releases SET status='live',error=NULL WHERE id='${first}';
  UPDATE public.blog_public_state SET release_id='${first}' WHERE id=1;
  UPDATE public.blog_drafts SET updated_at=stamp+interval '1 second' WHERE id='${post}';
  SELECT * INTO actual FROM public.blog_get_article_publication_status() WHERE post_id='${post}';
  IF actual.state<>'live' OR NOT actual.has_unpublished_changes THEN RAISE EXCEPTION 'Unpublished edits must remain distinct from online content'; END IF;
  INSERT INTO public.blog_releases(id,sequence,snapshot,status) OVERRIDING SYSTEM VALUE
   SELECT '${next}',900000002,snapshot,'queued' FROM public.blog_releases WHERE id='${first}';
  SELECT * INTO actual FROM public.blog_get_article_publication_status() WHERE post_id='${post}';
  IF actual.state<>'live' THEN RAISE EXCEPTION 'Unrelated deployment must not hide an already live article'; END IF;
  UPDATE public.blog_posts SET updated_at=stamp+interval '1 second' WHERE id='${post}';
  UPDATE public.blog_releases SET snapshot=(SELECT jsonb_build_object('posts',jsonb_agg(to_jsonb(p))) FROM public.blog_posts p) WHERE id='${next}';
  SELECT * INTO actual FROM public.blog_get_article_publication_status() WHERE post_id='${post}';
  IF actual.state<>'queued' OR NOT actual.has_live_version OR actual.has_unpublished_changes THEN RAISE EXCEPTION 'Republish must retain the previous online version'; END IF;
  DELETE FROM public.blog_posts WHERE id='${post}';
  UPDATE public.blog_releases SET snapshot=(SELECT jsonb_build_object('posts',COALESCE(jsonb_agg(to_jsonb(p)),'[]')) FROM public.blog_posts p) WHERE id='${next}';
  SELECT * INTO actual FROM public.blog_get_article_publication_status() WHERE post_id='${post}';
  IF actual.state<>'queued' OR actual.action<>'withdraw' OR NOT actual.has_live_version THEN RAISE EXCEPTION 'Withdrawal must wait for deployment'; END IF;
  UPDATE public.blog_releases SET status='live' WHERE id='${next}';
  UPDATE public.blog_public_state SET release_id='${next}' WHERE id=1;
  SELECT * INTO actual FROM public.blog_get_article_publication_status() WHERE post_id='${post}';
  IF actual.state<>'draft' OR actual.has_live_version THEN RAISE EXCEPTION 'Withdrawn article must no longer report live'; END IF;
  PERFORM set_config('request.jwt.claim.sub','${randomUUID()}',true);
  BEGIN PERFORM public.blog_get_article_publication_status(); EXCEPTION WHEN insufficient_privilege THEN blocked=true; END;
  IF NOT blocked OR has_function_privilege('anon','public.blog_get_article_publication_status()','EXECUTE') THEN RAISE EXCEPTION 'Publication metadata must be admin only'; END IF;
 END $$;
 ROLLBACK;`);
 const response=await fetch(projectUrl+'/rest/v1/rpc/blog_get_article_publication_status',{method:'POST',headers:{apikey:conn.anon,Authorization:`Bearer ${conn.anon}`,'Content-Type':'application/json'},body:'{}'});
 assert.ok([401,403].includes(response.status));
 console.log('发布状态验收通过：草稿、排队、部署、成功、失败、重新发布、撤回及管理员权限；所有验收数据已回滚。');
}finally{await conn.close()}
