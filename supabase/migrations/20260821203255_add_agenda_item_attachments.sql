-- Table for agenda item attachments (max 5 per item enforced in app)
CREATE TABLE public.meeting_agenda_item_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agenda_item_id UUID NOT NULL REFERENCES public.meeting_agenda_items(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agenda_attachments_item ON public.meeting_agenda_item_attachments(agenda_item_id);
CREATE INDEX idx_agenda_attachments_uploader ON public.meeting_agenda_item_attachments(uploaded_by);

-- Enable RLS
ALTER TABLE public.meeting_agenda_item_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can read all attachments, insert own, delete own
CREATE POLICY "Authenticated users can read attachments"
  ON public.meeting_agenda_item_attachments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload attachments"
  ON public.meeting_agenda_item_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = uploaded_by);

CREATE POLICY "Users can delete own attachments"
  ON public.meeting_agenda_item_attachments
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = uploaded_by);

-- Storage bucket for agenda attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agenda-attachments',
  'agenda-attachments',
  false,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
);

-- Storage policies
CREATE POLICY "Authenticated users can read agenda attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'agenda-attachments');

CREATE POLICY "Authenticated users can upload agenda attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'agenda-attachments');

CREATE POLICY "Users can delete own agenda attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'agenda-attachments' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);