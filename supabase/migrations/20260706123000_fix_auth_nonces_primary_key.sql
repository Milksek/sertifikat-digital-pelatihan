BEGIN;

CREATE TEMP TABLE auth_nonces_backup_20260706123000 AS
SELECT * FROM public.auth_nonces;

ALTER TABLE public.auth_nonces
ADD COLUMN IF NOT EXISTS id uuid,
ADD COLUMN IF NOT EXISTS message text,
ADD COLUMN IF NOT EXISTS nonce_timestamp timestamptz,
ADD COLUMN IF NOT EXISTS used_at timestamptz,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.auth_nonces
ALTER COLUMN id SET DEFAULT gen_random_uuid(),
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN nonce_timestamp SET DEFAULT now();

UPDATE public.auth_nonces
SET id = COALESCE(id, gen_random_uuid()),
    created_at = COALESCE(created_at, now()),
    nonce_timestamp = COALESCE(nonce_timestamp, created_at, now()),
    expires_at = COALESCE(expires_at, COALESCE(nonce_timestamp, created_at, now()) + interval '60 seconds'),
    message = COALESCE(
      message,
      'Login ke Sistem Sertifikat Digital Pelatihan' || E'\n' ||
      'Wallet: ' || COALESCE(wallet_address, '') || E'\n' ||
      'Nonce: ' || COALESCE(nonce, '') || E'\n' ||
      'Waktu: ' || FLOOR(EXTRACT(EPOCH FROM COALESCE(nonce_timestamp, created_at, now())) * 1000)::bigint
    )
WHERE id IS NULL
   OR created_at IS NULL
   OR nonce_timestamp IS NULL
   OR expires_at IS NULL
   OR message IS NULL;

DO $$
DECLARE
  pk_name text;
  pk_cols text[];
BEGIN
  SELECT c.conname,
         array_agg(a.attname ORDER BY x.ordinality)
  INTO pk_name, pk_cols
  FROM pg_constraint c
  JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS x(attnum, ordinality) ON true
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid
   AND a.attnum = x.attnum
  WHERE c.conrelid = 'public.auth_nonces'::regclass
    AND c.contype = 'p'
  GROUP BY c.conname;

  IF pk_name IS NOT NULL AND pk_cols <> ARRAY['id'] THEN
    EXECUTE format('ALTER TABLE public.auth_nonces DROP CONSTRAINT %I', pk_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.auth_nonces'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.auth_nonces ADD CONSTRAINT auth_nonces_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
DECLARE
  row_record record;
BEGIN
  FOR row_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) AS x(attnum) ON true
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = x.attnum
    WHERE c.conrelid = 'public.auth_nonces'::regclass
      AND c.contype = 'u'
    GROUP BY c.conname
    HAVING array_agg(a.attname::text ORDER BY a.attname::text) = ARRAY['wallet_address']::text[]
  LOOP
    EXECUTE format('ALTER TABLE public.auth_nonces DROP CONSTRAINT %I', row_record.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.auth_nonces_wallet_address_key;
DROP INDEX IF EXISTS public.idx_auth_nonces_nonce;
DROP INDEX IF EXISTS public.idx_auth_nonces_active_wallet;

ALTER TABLE public.auth_nonces
ALTER COLUMN id SET NOT NULL,
ALTER COLUMN wallet_address SET NOT NULL,
ALTER COLUMN nonce SET NOT NULL,
ALTER COLUMN message SET NOT NULL,
ALTER COLUMN nonce_timestamp SET NOT NULL,
ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.auth_nonces'::regclass
      AND contype = 'u'
      AND conname = 'auth_nonces_nonce_key'
  ) THEN
    ALTER TABLE public.auth_nonces
    ADD CONSTRAINT auth_nonces_nonce_key UNIQUE (nonce);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auth_nonces_wallet ON public.auth_nonces(wallet_address);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_nonce ON public.auth_nonces(nonce);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_active_wallet ON public.auth_nonces(wallet_address) WHERE used_at IS NULL;

COMMIT;
