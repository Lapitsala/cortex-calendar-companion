CREATE POLICY "Anon can view shared events"
ON public.calendar_events
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM calendar_shares
    WHERE calendar_shares.owner_id = calendar_events.user_id
      AND calendar_shares.status = 'accepted'
  )
);