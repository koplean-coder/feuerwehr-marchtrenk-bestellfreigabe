-- Ideas table
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'allgemein',
  status TEXT NOT NULL DEFAULT 'neu' CHECK (status IN ('neu', 'in_bearbeitung', 'umgesetzt', 'abgelehnt')),
  image_url TEXT,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Votes table (one vote per user per idea)
CREATE TABLE public.idea_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

-- Comments table
CREATE TABLE public.idea_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Categories table
CREATE TABLE public.idea_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.idea_categories (name, color) VALUES
  ('Allgemein', '#6b7280'),
  ('Ausrüstung', '#ef4444'),
  ('Ausbildung', '#3b82f6'),
  ('Veranstaltungen', '#10b981'),
  ('Organisation', '#8b5cf6'),
  ('IT & Technik', '#f59e0b');

-- Indexes
CREATE INDEX idx_ideas_created_by ON public.ideas(created_by);
CREATE INDEX idx_ideas_status ON public.ideas(status);
CREATE INDEX idx_ideas_category ON public.ideas(category);
CREATE INDEX idx_idea_votes_idea_id ON public.idea_votes(idea_id);
CREATE INDEX idx_idea_votes_user_id ON public.idea_votes(user_id);
CREATE INDEX idx_idea_comments_idea_id ON public.idea_comments(idea_id);

-- RLS Policies for ideas
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ideas" ON public.ideas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create ideas" ON public.ideas
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can update own ideas" ON public.ideas
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Admins can update any idea" ON public.ideas
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'kommandant')));

CREATE POLICY "Users can delete own ideas" ON public.ideas
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = created_by);

-- RLS Policies for votes
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON public.idea_votes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can vote" ON public.idea_votes
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can change own vote" ON public.idea_votes
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can remove own vote" ON public.idea_votes
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- RLS Policies for comments
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.idea_comments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create comments" ON public.idea_comments
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own comments" ON public.idea_comments
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- RLS Policies for categories
ALTER TABLE public.idea_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.idea_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories" ON public.idea_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'kommandant')));

-- Update trigger for ideas
CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE
  ON public.ideas FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();