
-- Group events table
CREATE TABLE public.group_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group events" ON public.group_events
  FOR SELECT USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can create group events" ON public.group_events
  FOR INSERT WITH CHECK (auth.uid() = created_by AND is_group_member(auth.uid(), group_id));

CREATE POLICY "Creator can update group events" ON public.group_events
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete group events" ON public.group_events
  FOR DELETE USING (auth.uid() = created_by);

CREATE TRIGGER update_group_events_updated_at
  BEFORE UPDATE ON public.group_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Group event responses table
CREATE TABLE public.group_event_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  response TEXT NOT NULL CHECK (response IN ('accepted', 'declined', 'maybe')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (group_event_id, user_id)
);

ALTER TABLE public.group_event_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view responses" ON public.group_event_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_events ge
      WHERE ge.id = group_event_id AND is_group_member(auth.uid(), ge.group_id)
    )
  );

CREATE POLICY "Users can insert own response" ON public.group_event_responses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_events ge
      WHERE ge.id = group_event_id AND is_group_member(auth.uid(), ge.group_id)
    )
  );

CREATE POLICY "Users can update own response" ON public.group_event_responses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own response" ON public.group_event_responses
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_group_event_responses_updated_at
  BEFORE UPDATE ON public.group_event_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for responses
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_event_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_events;
