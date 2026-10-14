BEGIN;
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['budgets','events','fitness_logs','fitness_plan','habit_logs','habits','media','settings','shopping','transactions'] LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('DROP POLICY IF EXISTS workbench_admin ON public.%I',t);
  EXECUTE format('CREATE POLICY workbench_admin ON public.%I TO authenticated USING(public.blog_is_admin()) WITH CHECK(public.blog_is_admin())',t);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
