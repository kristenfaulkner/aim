-- Create the import-files bucket for TrainingPeaks ZIP uploads (500MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('import-files', 'import-files', false, 524288000)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 524288000;

-- Users can upload their own import files
CREATE POLICY "Users can upload own import files"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'import-files' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own import files
CREATE POLICY "Users can view own import files"
ON storage.objects FOR SELECT USING (
  bucket_id = 'import-files' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own import files
CREATE POLICY "Users can delete own import files"
ON storage.objects FOR DELETE USING (
  bucket_id = 'import-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
