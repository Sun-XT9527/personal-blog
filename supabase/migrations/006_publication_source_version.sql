BEGIN;
-- Keep the saved draft's version timestamp. Deployment completion has its own
-- timestamp on blog_releases and must not make an unchanged draft look newer.
CREATE OR REPLACE FUNCTION public.blog_create_release(p_action text,p_id uuid DEFAULT NULL,p_post jsonb DEFAULT NULL,p_settings jsonb DEFAULT NULL)
RETURNS public.blog_releases LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result public.blog_releases;release_id uuid=gen_random_uuid();source_stamp timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(701953);
 IF p_action='publish' THEN
  source_stamp=COALESCE(NULLIF(p_post->>'updated_at','')::timestamptz,now());
  INSERT INTO public.blog_posts(id,slug,title,excerpt,document,category,tags,cover,featured,published_at,updated_at)
   SELECT p_id,p_post->>'slug',p_post->>'title',p_post->>'excerpt',p_post->'document',p_post->>'category',
    ARRAY(SELECT jsonb_array_elements_text(p_post->'tags')),NULLIF(p_post->>'cover',''),COALESCE((p_post->>'featured')::boolean,false),
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
   'settings',COALESCE(p_settings,(SELECT data FROM public.blog_settings WHERE id=1)),
   'posts',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY published_at DESC) FROM public.blog_posts p),'[]'::jsonb))
  RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.blog_create_release(text,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blog_create_release(text,uuid,jsonb,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
