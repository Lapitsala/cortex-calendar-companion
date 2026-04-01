
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add user_id to calendar_events
ALTER TABLE public.calendar_events ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policy on calendar_events
DROP POLICY IF EXISTS "Allow all access to calendar_events" ON public.calendar_events;

-- New RLS policies for calendar_events
CREATE POLICY "Users can view own events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- Add user_id to chat_sessions
ALTER TABLE public.chat_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policy on chat_sessions
DROP POLICY IF EXISTS "Allow all access to chat_sessions" ON public.chat_sessions;

CREATE POLICY "Users can view own sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Update chat_messages policy to work through sessions
DROP POLICY IF EXISTS "Allow all access to chat_messages" ON public.chat_messages;

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND (user_id = auth.uid() OR user_id IS NULL)));
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND (user_id = auth.uid() OR user_id IS NULL)));
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND (user_id = auth.uid() OR user_id IS NULL)));

-- Groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Group members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND role = 'admin' AND status = 'accepted'
  );
$$;

-- Groups RLS
CREATE POLICY "Members can view their groups" ON public.groups FOR SELECT 
  USING (public.is_group_member(auth.uid(), id) OR created_by = auth.uid());
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update groups" ON public.groups FOR UPDATE USING (public.is_group_admin(auth.uid(), id));
CREATE POLICY "Creator can delete groups" ON public.groups FOR DELETE USING (auth.uid() = created_by);

-- Group members RLS
CREATE POLICY "Members can view co-members" ON public.group_members FOR SELECT 
  USING (public.is_group_member(auth.uid(), group_id) OR user_id = auth.uid());
CREATE POLICY "Admins can add members" ON public.group_members FOR INSERT 
  WITH CHECK (public.is_group_admin(auth.uid(), group_id) OR 
    (SELECT created_by FROM public.groups WHERE id = group_id) = auth.uid());
CREATE POLICY "Admins can update members" ON public.group_members FOR UPDATE 
  USING (public.is_group_admin(auth.uid(), group_id) OR user_id = auth.uid());
CREATE POLICY "Admins can remove members" ON public.group_members FOR DELETE 
  USING (public.is_group_admin(auth.uid(), group_id) OR user_id = auth.uid());

-- Group availability table
CREATE TABLE public.group_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.group_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group availability" ON public.group_availability FOR SELECT 
  USING (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Users can manage own availability" ON public.group_availability FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Users can update own availability" ON public.group_availability FOR UPDATE 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own availability" ON public.group_availability FOR DELETE 
  USING (auth.uid() = user_id);

-- Calendar shares table
CREATE TABLE public.calendar_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_level TEXT NOT NULL DEFAULT 'availability_only',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, shared_with_id)
);
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_calendar_shares_updated_at BEFORE UPDATE ON public.calendar_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can view own shares" ON public.calendar_shares FOR SELECT 
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);
CREATE POLICY "Users can create shares" ON public.calendar_shares FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update shares" ON public.calendar_shares FOR UPDATE 
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);
CREATE POLICY "Owner can delete shares" ON public.calendar_shares FOR DELETE 
  USING (auth.uid() = owner_id);

-- Also allow viewing shared events based on calendar_shares
CREATE POLICY "Shared users can view events" ON public.calendar_events FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.calendar_shares 
    WHERE owner_id = calendar_events.user_id 
    AND shared_with_id = auth.uid() 
    AND status = 'accepted'
  ));

-- Auto-add creator as admin member when group is created
CREATE OR REPLACE FUNCTION public.auto_add_group_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'admin', 'accepted');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_group_creator();
