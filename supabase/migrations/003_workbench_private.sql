BEGIN;
DO $$ DECLARE t text;BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.blog_admins) THEN RAISE EXCEPTION '请先初始化并验证管理员登录';END IF;
 FOREACH t IN ARRAY ARRAY['budgets','events','fitness_logs','fitness_plan','habit_logs','habits','media','settings','shopping','transactions'] LOOP
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I','anon_all_'||t,t);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
