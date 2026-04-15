CREATE POLICY "Group members can view co-member events"
ON public.calendar_events
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = calendar_events.user_id
      AND gm1.status = 'accepted'
      AND gm2.status = 'accepted'
  )
);