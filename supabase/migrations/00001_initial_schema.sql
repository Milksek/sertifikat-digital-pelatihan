-- ============================================================
-- Migration Final: Sistem Sertifikat Digital Pelatihan
-- Skema: Junior Web Developer | Pengembangan Web
-- Token: Sertifikat Pelatihan Digital (SPDW)
-- Network: Polygon Amoy (chain 80002)
-- ============================================================

-- Pastikan pgcrypto ada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABEL: profil
-- ============================================================
CREATE TABLE public.profil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_address TEXT UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'participant'
        CHECK (role IN ('admin', 'assessor', 'participant')),
    nik TEXT,
    email TEXT,
    phone TEXT,
    nonce TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: penilaian
-- ============================================================
CREATE TABLE public.penilaian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL
        REFERENCES public.profil(id) ON DELETE CASCADE,
    assessor_id UUID
        REFERENCES public.profil(id) ON DELETE SET NULL,
    training_name TEXT NOT NULL DEFAULT 'Junior Web Developer',
    training_field TEXT NOT NULL DEFAULT 'Pengembangan Web',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'in_progress', 'evaluated',
            'approved', 'rejected', 'certified'
        )),
    score JSONB,
    recommendation TEXT,
    signature TEXT,
    portfolio_files JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT penilaian_assessor_required_when_active CHECK (
        status = 'pending'
        OR assessor_id IS NOT NULL
    )
);

-- ============================================================
-- TABEL: sertifikat
-- ============================================================
CREATE TABLE public.sertifikat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_name TEXT NOT NULL DEFAULT 'Junior Web Developer',
    training_field TEXT NOT NULL DEFAULT 'Pengembangan Web',
    certificate_number TEXT NOT NULL UNIQUE,
    assessment_id UUID NOT NULL UNIQUE
        REFERENCES public.penilaian(id) ON DELETE CASCADE,
    participant_wallet TEXT NOT NULL,
    token_id TEXT,
    tx_hash TEXT,
    ipfs_uri TEXT,
    ipfs_image_uri TEXT,
    metadata_uri TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'revoked', 'expired', 'minted', 'certified')),
    minted_at TIMESTAMPTZ,
    minted_by UUID
        REFERENCES public.profil(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID
        REFERENCES public.profil(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: log_verifikasi
-- ============================================================
CREATE TABLE public.log_verifikasi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID
        REFERENCES public.sertifikat(id) ON DELETE SET NULL,
    verifier_ip TEXT,
    query TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: log_aktivitas
-- ============================================================
CREATE TABLE public.log_aktivitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID
        REFERENCES public.profil(id) ON DELETE SET NULL,
    actor_role TEXT,
    activity_type TEXT NOT NULL,
    activity_detail TEXT,
    reference_table TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: log_transaksi
-- ============================================================
CREATE TABLE public.log_transaksi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID
        REFERENCES public.sertifikat(id) ON DELETE SET NULL,
    tx_hash TEXT NOT NULL,
    tx_type TEXT NOT NULL,
    wallet_address TEXT,
    status TEXT,
    network TEXT DEFAULT 'Polygon Amoy',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profil_modtime
    BEFORE UPDATE ON public.profil
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

CREATE TRIGGER update_penilaian_modtime
    BEFORE UPDATE ON public.penilaian
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- Auto-generate certificate number
CREATE SEQUENCE IF NOT EXISTS cert_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
        NEW.certificate_number := 'WEB-' || TO_CHAR(NOW(), 'YYYY')
            || '-' || LPAD(nextval('cert_number_seq')::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_cert_number
    BEFORE INSERT ON public.sertifikat
    FOR EACH ROW EXECUTE PROCEDURE public.generate_certificate_number();

CREATE INDEX IF NOT EXISTS idx_penilaian_participant_id
    ON public.penilaian(participant_id);
CREATE INDEX IF NOT EXISTS idx_penilaian_assessor_id
    ON public.penilaian(assessor_id);
CREATE INDEX IF NOT EXISTS idx_penilaian_status
    ON public.penilaian(status);

-- Auto-create profil on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profil (id, wallet_address, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'wallet_address',
        COALESCE(NEW.raw_user_meta_data->>'role', 'participant')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penilaian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sertifikat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_verifikasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_aktivitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_transaksi ENABLE ROW LEVEL SECURITY;

-- profil: user sendiri bisa read/write, admin bisa baca semua
CREATE POLICY "profil_select_own_or_admin" ON public.profil
    FOR SELECT USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profil
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
CREATE POLICY "profil_insert_own" ON public.profil
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profil_update_own" ON public.profil
    FOR UPDATE USING (auth.uid() = id);

-- penilaian: participant own row, assessor assigned row, admin semua
CREATE POLICY "penilaian_select_role_based" ON public.penilaian
    FOR SELECT USING (
        participant_id = auth.uid()
        OR assessor_id = auth.uid()
        OR public.is_admin(auth.uid())
    );
CREATE POLICY "penilaian_insert" ON public.penilaian
    FOR INSERT WITH CHECK (
        participant_id = auth.uid()
        OR public.is_admin(auth.uid())
    );
CREATE POLICY "penilaian_update_role_based" ON public.penilaian
    FOR UPDATE USING (
        assessor_id = auth.uid()
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        assessor_id = auth.uid()
        OR public.is_admin(auth.uid())
    );

-- sertifikat: owner wallet + admin bisa baca, admin bisa insert/update
CREATE POLICY "sertifikat_select_owner_or_admin" ON public.sertifikat
    FOR SELECT USING (
        LOWER(participant_wallet) = LOWER(
            COALESCE(
                (SELECT wallet_address FROM public.profil WHERE id = auth.uid()),
                ''
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.profil
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
CREATE POLICY "sertifikat_insert_admin" ON public.sertifikat
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profil
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
CREATE POLICY "sertifikat_update_admin" ON public.sertifikat
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profil
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- log tables: admin only
CREATE POLICY "log_verifikasi_admin_only" ON public.log_verifikasi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profil
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "log_aktivitas_admin_only" ON public.log_aktivitas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profil
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "log_transaksi_admin_only" ON public.log_transaksi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profil
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
