ALTER TABLE public.auth_nonces
ADD COLUMN IF NOT EXISTS used_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_auth_nonces_wallet_nonce
ON public.auth_nonces(wallet_address, nonce);
