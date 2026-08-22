-- Create storage bucket for task attachments (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task attachments
-- Users can upload to their task folders
CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
);

-- Users can view task attachments they have access to
CREATE POLICY "Users can view task attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'task-attachments'
);

-- Users can delete their own task attachments
CREATE POLICY "Users can delete task attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'task-attachments'
);