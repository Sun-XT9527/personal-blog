BEGIN;
CREATE OR REPLACE FUNCTION public.blog_take_summary_slot(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE attempts integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.blog_admins WHERE user_id=p_user_id) THEN RAISE EXCEPTION 'unauthorized';END IF;
 INSERT INTO public.blog_rate_limits(client_key,window_start,count)
 VALUES('summary:'||p_user_id::text,date_trunc('minute',now()),1)
 ON CONFLICT(client_key) DO UPDATE SET
 count=CASE WHEN blog_rate_limits.window_start=date_trunc('minute',now()) THEN blog_rate_limits.count+1 ELSE 1 END,
 window_start=date_trunc('minute',now()) RETURNING count INTO attempts;
 IF attempts>3 THEN RAISE EXCEPTION 'rate_limited';END IF;
END $$;
REVOKE ALL ON FUNCTION public.blog_take_summary_slot(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.blog_take_summary_slot(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
