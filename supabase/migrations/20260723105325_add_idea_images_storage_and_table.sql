-- Create storage bucket for idea images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('idea-images', 'idea-images', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for idea-images bucket
CREATE POLICY "Authenticated users can upload idea images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'idea-images');

CREATE POLICY "Anyone can view idea images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'idea-images');

CREATE POLICY "Users can delete own idea images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'idea-images' AND (select auth.uid())::text = (storage.foldername(name))[1]);

-- Create idea_images table for multiple images per idea
CREATE TABLE public.idea_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster queries
CREATE INDEX idx_idea_images_idea_id ON public.idea_images(idea_id);

-- Enable RLS
ALTER TABLE public.idea_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for idea_images
CREATE POLICY "Anyone can view idea images"
ON public.idea_images FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated users can insert idea images"
ON public.idea_images FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = uploaded_by);

CREATE POLICY "Users can delete own uploaded images"
ON public.idea_images FOR DELETE TO authenticated
USING ((select auth.uid()) = uploaded_by);