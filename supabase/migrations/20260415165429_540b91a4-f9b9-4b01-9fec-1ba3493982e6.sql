-- Remove overly permissive policies that let anyone see all groups and members
DROP POLICY IF EXISTS "Anon can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Anon can view all members" ON public.group_members;