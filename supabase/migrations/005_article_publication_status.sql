BEGIN;
-- Return only publication metadata. Draft contents remain behind the admin check.
CREATE OR REPLACE FUNCTION public.blog_get_article_publication_status()
RETURNS TABLE(post_id uuid,slug text,state text,action text,release_id uuid,submitted_at timestamptz,error text,has_live_version boolean,has_unpublished_changes boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT public.blog_is_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  WITH live_posts AS (
    SELECT s.release_id,entry.post
    FROM public.blog_public_state s
    JOIN public.blog_releases online ON online.id=s.release_id
    CROSS JOIN LATERAL jsonb_array_elements(online.snapshot->'posts') entry(post)
    WHERE s.id=1
  )
  SELECT d.id,d.slug,
    CASE WHEN published.id IS NULL AND live.post IS NULL THEN 'draft'
      WHEN published.id IS NOT NULL AND live.post @> jsonb_build_object('updated_at',published.updated_at) THEN 'live'
      ELSE COALESCE(attempt.status,'unknown') END,
    CASE WHEN published.id IS NULL AND live.post IS NOT NULL THEN 'withdraw' ELSE 'publish' END,
    CASE WHEN published.id IS NOT NULL AND live.post @> jsonb_build_object('updated_at',published.updated_at) THEN live.release_id ELSE attempt.id END,
    attempt.created_at,
    CASE WHEN attempt.status='failed' THEN attempt.error ELSE NULL END,
    live.post IS NOT NULL,
    published.id IS NOT NULL AND d.updated_at IS DISTINCT FROM published.updated_at
  FROM public.blog_drafts d
  LEFT JOIN public.blog_posts published ON published.id=d.id
  LEFT JOIN live_posts live ON live.post->>'id'=d.id::text
  LEFT JOIN LATERAL (
    SELECT r.id,r.status,r.error,r.created_at
    FROM public.blog_releases r
    WHERE (published.id IS NOT NULL AND r.snapshot->'posts' @>
      jsonb_build_array(jsonb_build_object('id',d.id,'updated_at',published.updated_at)))
      OR (published.id IS NULL AND live.post IS NOT NULL AND NOT r.snapshot->'posts' @>
        jsonb_build_array(jsonb_build_object('id',d.id)))
    ORDER BY r.sequence DESC LIMIT 1
  ) attempt ON true
  WHERE d.deleted_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.blog_get_article_publication_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.blog_get_article_publication_status() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
