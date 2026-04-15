
-- Update groups SELECT policy to include pending members
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
CREATE POLICY "Members can view their groups"
ON public.groups
FOR SELECT
USING (
  created_by = auth.uid()
  OR is_group_member(auth.uid(), id)
  OR EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'pending'
  )
);
