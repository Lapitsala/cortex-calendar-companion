
CREATE TABLE public.want_to_do (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  deadline DATE,
  deadline_time TEXT DEFAULT '09:00',
  priority TEXT NOT NULL DEFAULT 'medium',
  synced_event_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.want_to_do ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own todos" ON public.want_to_do FOR SELECT USING ((auth.uid() = user_id) OR (user_id IS NULL));
CREATE POLICY "Users can insert own todos" ON public.want_to_do FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));
CREATE POLICY "Users can update own todos" ON public.want_to_do FOR UPDATE USING ((auth.uid() = user_id) OR (user_id IS NULL));
CREATE POLICY "Users can delete own todos" ON public.want_to_do FOR DELETE USING ((auth.uid() = user_id) OR (user_id IS NULL));

CREATE TRIGGER update_want_to_do_updated_at BEFORE UPDATE ON public.want_to_do FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
