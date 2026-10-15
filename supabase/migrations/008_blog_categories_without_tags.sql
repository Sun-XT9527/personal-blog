BEGIN;
SELECT pg_advisory_xact_lock(701953);

-- Preserve old releases for rollback; normalize their public representation.
CREATE OR REPLACE FUNCTION public.blog_normalize_category(p_category text,p_slug text,p_title text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT CASE
  WHEN p_category IN ('日常记录','研究札记','视频文案') THEN p_category
  WHEN p_slug='note-1792034936291' OR trim(p_title)='为什么你连上校园网，却不能和舍友玩 Minecraft？' THEN '视频文案'
  ELSE '日常记录' END
$$;

CREATE OR REPLACE FUNCTION public.blog_public_settings(p_settings jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE STRICT SET search_path=public,pg_temp AS $$
 SELECT jsonb_set(p_settings,'{projects}',COALESCE(
  (SELECT jsonb_agg(project-'tags' ORDER BY position)
   FROM jsonb_array_elements(p_settings->'projects') WITH ORDINALITY AS item(project,position)),
  '[]'::jsonb))
$$;

CREATE OR REPLACE FUNCTION public.blog_clean_snapshot(p_snapshot jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE STRICT SET search_path=public,pg_temp AS $$
 SELECT p_snapshot || jsonb_build_object(
  'settings',public.blog_public_settings(p_snapshot->'settings'),
  'posts',COALESCE((SELECT jsonb_agg((post-'tags') || jsonb_build_object(
    'category',public.blog_normalize_category(post->>'category',post->>'slug',post->>'title')) ORDER BY position)
   FROM jsonb_array_elements(p_snapshot->'posts') WITH ORDINALITY AS item(post,position)),'[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.blog_normalize_category(text,text,text),public.blog_public_settings(jsonb),public.blog_clean_snapshot(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blog_normalize_category(text,text,text),public.blog_public_settings(jsonb),public.blog_clean_snapshot(jsonb) TO service_role;

-- Metadata only: do not change document contents, visibility or version stamps.
UPDATE public.blog_drafts SET category=public.blog_normalize_category(category,slug,title)
 WHERE category NOT IN ('日常记录','研究札记','视频文案');
UPDATE public.blog_posts SET category=public.blog_normalize_category(category,slug,title)
 WHERE category NOT IN ('日常记录','研究札记','视频文案');
ALTER TABLE public.blog_drafts ALTER COLUMN category SET DEFAULT '日常记录';
ALTER TABLE public.blog_drafts DROP CONSTRAINT IF EXISTS blog_drafts_category_check;
ALTER TABLE public.blog_drafts ADD CONSTRAINT blog_drafts_category_check CHECK(category IN ('日常记录','研究札记','视频文案'));
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_category_check;
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_category_check CHECK(category IN ('日常记录','研究札记','视频文案'));
ALTER TABLE public.blog_posts ALTER COLUMN tags SET DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.blog_get_live_snapshot() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.blog_clean_snapshot(COALESCE(
  (SELECT r.snapshot FROM public.blog_public_state s JOIN public.blog_releases r ON r.id=s.release_id WHERE s.id=1),
  '{"settings":{"name":"Sun XT 的博客","author":"Sun XT","description":"把学习中的发现、生活里的片段，和慢慢长成的想法，留在这里。","github":"https://github.com/Sun-XT9527","about":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"你好，我是 Sun XT。这里是我的个人记录空间。关于我的更多介绍，正在慢慢整理中。"}]}]},"projects":[]},"posts":[]}'::jsonb))
$$;
CREATE OR REPLACE FUNCTION public.blog_get_build_snapshot(p_release_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.blog_clean_snapshot(snapshot) FROM public.blog_releases WHERE id=p_release_id AND status IN ('queued','building','live')
$$;
REVOKE ALL ON FUNCTION public.blog_get_live_snapshot(),public.blog_get_build_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blog_get_live_snapshot(),public.blog_get_build_snapshot(uuid) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.blog_create_release(p_action text,p_id uuid DEFAULT NULL,p_post jsonb DEFAULT NULL,p_settings jsonb DEFAULT NULL)
RETURNS public.blog_releases LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result public.blog_releases;release_id uuid=gen_random_uuid();source_stamp timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(701953);
 IF p_action='publish' THEN
  IF COALESCE(p_post->>'category','') NOT IN ('日常记录','研究札记','视频文案') THEN RAISE EXCEPTION 'invalid_category'; END IF;
  source_stamp=COALESCE(NULLIF(p_post->>'updated_at','')::timestamptz,now());
  INSERT INTO public.blog_posts(id,slug,title,excerpt,document,category,tags,cover,featured,published_at,updated_at)
   SELECT p_id,p_post->>'slug',p_post->>'title',p_post->>'excerpt',p_post->'document',p_post->>'category',
    '{}'::text[],NULLIF(p_post->>'cover',''),COALESCE((p_post->>'featured')::boolean,false),
    COALESCE((SELECT published_at FROM public.blog_posts WHERE id=p_id),now()),source_stamp
   ON CONFLICT(id) DO UPDATE SET slug=EXCLUDED.slug,title=EXCLUDED.title,excerpt=EXCLUDED.excerpt,
    document=EXCLUDED.document,category=EXCLUDED.category,tags=EXCLUDED.tags,cover=EXCLUDED.cover,
    featured=EXCLUDED.featured,updated_at=EXCLUDED.updated_at;
  UPDATE public.blog_drafts SET published_at=(SELECT published_at FROM public.blog_posts WHERE id=p_id) WHERE id=p_id;
 ELSIF p_action IN ('unpublish','delete') THEN
  DELETE FROM public.blog_posts WHERE id=p_id;
  UPDATE public.blog_drafts SET published_at=NULL,deleted_at=CASE WHEN p_action='delete' THEN now() ELSE deleted_at END WHERE id=p_id;
 ELSIF p_action NOT IN ('settings','retry') THEN RAISE EXCEPTION 'invalid_action';END IF;
 INSERT INTO public.blog_releases(id,snapshot)
  SELECT release_id,jsonb_build_object('revision',release_id,'created_at',now(),
   'settings',public.blog_public_settings(COALESCE(p_settings,(SELECT data FROM public.blog_settings WHERE id=1))),
   'posts',COALESCE((SELECT jsonb_agg(to_jsonb(p)-'tags' ORDER BY published_at DESC) FROM public.blog_posts p),'[]'::jsonb))
  RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.blog_create_release(text,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blog_create_release(text,uuid,jsonb,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
