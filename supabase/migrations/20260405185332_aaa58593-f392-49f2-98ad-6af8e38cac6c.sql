
DROP POLICY "Users can insert own events" ON public.calendar_events;
CREATE POLICY "Users can insert own events" ON public.calendar_events
  FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));
