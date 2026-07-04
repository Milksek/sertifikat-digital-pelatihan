-- ============================================================
-- SSDP Round 5: Auth Nonce Table + Verify Permission Fix
-- ============================================================

-- 1. Dedicated nonce table (replaces profil.nonce storage)
CREATE TABLE IF NOT EXISTS public.auth_nonces (
  wallet_address TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  message TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.auth_nonces ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.auth_nonces FROM PUBLIC;
GRANT ALL ON public.auth_nonces TO service_role;

-- 2. Fix migration file: remove authenticated from verify_certificate_public
-- (Live DB already fixed, this ensures fresh deploys are also safe)
REVOKE ALL ON FUNCTION public.verify_certificate_public(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_certificate_public(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.verify_certificate_public(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate_public(TEXT, TEXT) TO service_role;

-- 3. Clean up nonce columns from profil (no longer needed)
ALTER TABLE public.profil DROP COLUMN IF EXISTS nonce;
ALTER TABLE public.profil DROP COLUMN IF EXISTS nonce_timestamp;
