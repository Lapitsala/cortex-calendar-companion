
-- Temporary anonymous-read policies for demo purposes

CREATE POLICY "Anon can view all groups"
ON public.groups FOR SELECT
TO public
USING (true);

CREATE POLICY "Anon can view all members"
ON public.group_members FOR SELECT
TO public
USING (true);

CREATE POLICY "Anon can view all shares"
ON public.calendar_shares FOR SELECT
TO public
USING (true);
