
-- Classroom courses table
CREATE TABLE public.classroom_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  section text NOT NULL DEFAULT '',
  teacher text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'hsl(220, 70%, 55%)',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.classroom_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses" ON public.classroom_courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own courses" ON public.classroom_courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON public.classroom_courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON public.classroom_courses FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_classroom_courses_updated_at
  BEFORE UPDATE ON public.classroom_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Classroom assignments table
CREATE TABLE public.classroom_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.classroom_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_date date NOT NULL,
  due_time text NOT NULL DEFAULT '23:59',
  points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  is_synced boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments" ON public.classroom_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assignments" ON public.classroom_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assignments" ON public.classroom_assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assignments" ON public.classroom_assignments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_classroom_assignments_updated_at
  BEFORE UPDATE ON public.classroom_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
