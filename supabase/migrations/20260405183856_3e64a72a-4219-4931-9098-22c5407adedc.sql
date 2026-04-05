
DROP POLICY "Users can insert own sessions" ON public.chat_sessions;
CREATE POLICY "Users can insert own sessions" ON public.chat_sessions FOR INSERT TO public WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY "Users can delete own sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete own sessions" ON public.chat_sessions FOR DELETE TO public USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY "Users can update own sessions" ON public.chat_sessions;
CREATE POLICY "Users can update own sessions" ON public.chat_sessions FOR UPDATE TO public USING (auth.uid() = user_id OR user_id IS NULL);
