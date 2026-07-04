-- ============================================================
-- SSDP Round 4: Security Hardening
-- 1. nonce_timestamp column
-- 2. Drop dangerous RLS policies
-- 3. handle_new_user force role=participant
-- 4. is_admin helper
-- 5. verify_certificate_public lockdown
-- ============================================================

-- 1. nonce_timestamp column
ALTER TABLE public.profil ADD COLUMN IF NOT EXISTS nonce_timestamp TIMESTAMPTZ;

-- 2. Drop dangerous RLS policies
DROP POLICY IF EXISTS "profil_insert_own" ON public.profil;
DROP POLICY IF EXISTS "profil_update_own" ON public.profil;

-- 3. handle_new_user: force role = participant always (drop first)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profil (id, wallet_address, role)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'wallet_address', 'participant');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. is_admin helper (drop dependent policies first, then recreate)
DROP POLICY IF EXISTS "penilaian_select_role_based" ON public.penilaian;
DROP POLICY IF EXISTS "penilaian_update_role_based" ON public.penilaian;
DROP POLICY IF EXISTS "penilaian_insert_participant_or_admin" ON public.penilaian;
DROP POLICY IF EXISTS "profil_select_own_or_admin" ON public.profil;
DROP FUNCTION IF EXISTS public.is_admin(UUID);
CREATE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profil
    WHERE id = uid
      AND role = 'admin'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- 5b. Recreate dependent policies
CREATE POLICY "penilaian_select_role_based" ON public.penilaian
    FOR SELECT USING (public.is_admin(auth.uid()) OR assessor_id = auth.uid() OR participant_id = auth.uid());
CREATE POLICY "penilaian_update_role_based" ON public.penilaian
    FOR UPDATE USING (public.is_admin(auth.uid()) OR assessor_id = auth.uid());
CREATE POLICY "penilaian_insert_participant_or_admin" ON public.penilaian
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR participant_id = auth.uid());
CREATE POLICY "profil_select_own_or_admin" ON public.profil
    FOR SELECT USING (public.is_admin(auth.uid()) OR id = auth.uid());

-- 6. verify_certificate_public with SECURITY DEFINER (drop first to avoid parameter defaults conflict)
DROP FUNCTION IF EXISTS public.verify_certificate_public(TEXT, TEXT);
CREATE FUNCTION public.verify_certificate_public(
    search_query TEXT,
    verifier_ip_input TEXT
)
RETURNS TABLE (
    certificate_number TEXT,
    training_name TEXT,
    training_field TEXT,
    participant_wallet TEXT,
    token_id TEXT,
    tx_hash TEXT,
    ipfs_image_uri TEXT,
    metadata_uri TEXT,
    status TEXT,
    minted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    participant_name TEXT,
    recommendation TEXT,
    score JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_cert RECORD;
BEGIN
    SELECT 
        s.id AS cert_id,
        s.certificate_number,
        s.training_name,
        s.training_field,
        s.participant_wallet,
        s.token_id,
        s.tx_hash,
        s.ipfs_image_uri,
        s.metadata_uri,
        s.status,
        s.minted_at,
        s.revoked_at,
        s.revocation_reason,
        p.full_name AS participant_name,
        pen.recommendation,
        pen.score
    INTO found_cert
    FROM public.sertifikat s
    LEFT JOIN public.profil p ON s.participant_wallet = p.wallet_address
    LEFT JOIN public.penilaian pen ON s.assessment_id = pen.id
    WHERE s.certificate_number ILIKE '%' || search_query || '%'
       OR s.participant_wallet ILIKE '%' || search_query || '%'
       OR p.full_name ILIKE '%' || search_query || '%'
    LIMIT 1;

    IF found_cert IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.log_verifikasi (sertifikat_id, verifier_ip, search_query)
    VALUES (found_cert.cert_id, verifier_ip_input, search_query);

    RETURN QUERY SELECT 
        found_cert.certificate_number,
        found_cert.training_name,
        found_cert.training_field,
        found_cert.participant_wallet,
        found_cert.token_id,
        found_cert.tx_hash,
        found_cert.ipfs_image_uri,
        found_cert.metadata_uri,
        found_cert.status,
        found_cert.minted_at,
        found_cert.revoked_at,
        found_cert.revocation_reason,
        found_cert.participant_name,
        found_cert.recommendation,
        found_cert.score;
END;
$$;

-- 7. Lockdown: REVOKE PUBLIC, GRANT only service_role + authenticated
REVOKE ALL ON FUNCTION public.verify_certificate_public(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate_public(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_certificate_public(TEXT, TEXT) TO authenticated;
