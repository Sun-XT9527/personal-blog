BEGIN;
-- A release is already an intentional public snapshot. Expose only its queue ID.
CREATE OR REPLACE FUNCTION public.blog_get_pending_release() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT jsonb_build_object('id',id,'sequence',sequence)
  FROM public.blog_releases WHERE status='queued' ORDER BY sequence DESC LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.blog_get_pending_release() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blog_get_pending_release() TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.blog_finish_release(p_id uuid,p_status text,p_error text DEFAULT NULL,p_run_id bigint DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE seq bigint; active_seq bigint; previous_status text;
BEGIN
  PERFORM pg_advisory_xact_lock(701953);
  IF p_status NOT IN ('live','failed','building') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  SELECT sequence,status INTO seq,previous_status FROM public.blog_releases WHERE id=p_id FOR UPDATE;
  IF seq IS NULL THEN RAISE EXCEPTION 'release_missing'; END IF;
  IF previous_status='superseded' OR (previous_status='live' AND p_status IN ('building','failed'))
     OR (previous_status='failed' AND p_status='building') THEN RETURN; END IF;
  UPDATE public.blog_releases SET status=p_status,error=left(p_error,1000),run_id=p_run_id,
    completed_at=CASE WHEN p_status IN ('live','failed') THEN now() ELSE NULL END WHERE id=p_id;
  IF p_status='building' THEN
    UPDATE public.blog_releases SET status='superseded' WHERE status='queued' AND sequence<seq;
  END IF;
  SELECT r.sequence INTO active_seq FROM public.blog_public_state s JOIN public.blog_releases r ON r.id=s.release_id WHERE s.id=1;
  IF p_status='live' AND (active_seq IS NULL OR seq>active_seq) THEN
    UPDATE public.blog_releases SET status='superseded' WHERE status='live' AND id<>p_id;
    UPDATE public.blog_public_state SET release_id=p_id WHERE id=1;
  ELSIF p_status='live' AND seq<active_seq THEN
    UPDATE public.blog_releases SET status='superseded' WHERE id=p_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.blog_finish_release(uuid,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blog_finish_release(uuid,text,text,bigint) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
