-- Menambahkan kolom portfolio_files ke tabel assessments
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS portfolio_files JSONB DEFAULT '[]'::jsonb;

-- Membuat Bucket untuk penyimpanan portfolios jika belum ada
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolios', 'portfolios', true)
ON CONFLICT (id) DO NOTHING;

-- Mengatur Policy agar siapa saja bisa melihat isi portfolios
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'portfolios' );

-- Mengatur Policy agar user terautentikasi (Asesor) bisa mengupload file
CREATE POLICY "Assessor Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'portfolios' AND auth.role() = 'authenticated' );

-- Mengizinkan pemilik file (Asesor) mengubah/update filenya (Opsional)
CREATE POLICY "Assessor Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'portfolios' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'portfolios' AND auth.uid() = owner );

-- Mengizinkan pemilik menghapus filenya
CREATE POLICY "Assessor Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'portfolios' AND auth.uid() = owner );
