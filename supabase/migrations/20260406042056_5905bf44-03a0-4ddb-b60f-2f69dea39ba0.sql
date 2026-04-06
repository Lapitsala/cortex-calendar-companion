
ALTER TABLE public.groups DROP CONSTRAINT groups_created_by_fkey;
ALTER TABLE public.group_members DROP CONSTRAINT group_members_user_id_fkey;
ALTER TABLE public.group_availability DROP CONSTRAINT group_availability_user_id_fkey;
ALTER TABLE public.calendar_shares DROP CONSTRAINT calendar_shares_owner_id_fkey;
ALTER TABLE public.calendar_shares DROP CONSTRAINT calendar_shares_shared_with_id_fkey;
