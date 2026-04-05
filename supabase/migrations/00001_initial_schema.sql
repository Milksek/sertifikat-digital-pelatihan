-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
CREATE TYPE user_role AS ENUM ('participant', 'assessor', 'admin');
CREATE TYPE scheme_status AS ENUM ('active', 'archived');
CREATE TYPE assessment_status AS ENUM ('pending', 'in_progress', 'evaluated', 'approved', 'rejected');
CREATE TYPE certificate_status AS ENUM ('active', 'revoked', 'expired');

-- Profiles Table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    wallet_address TEXT UNIQUE,
    full_name TEXT,
    role user_role DEFAULT 'participant',
    nik TEXT,
    email TEXT,
    phone TEXT,
    nonce TEXT, -- For MetaMask signature
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile when auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, wallet_address, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'wallet_address', 'participant');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Competency Schemes
CREATE TABLE competency_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB,
    created_by UUID REFERENCES profiles(id),
    status scheme_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessments
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES profiles(id) NOT NULL,
    scheme_id UUID REFERENCES competency_schemes(id) NOT NULL,
    assessor_id UUID REFERENCES profiles(id),
    status assessment_status DEFAULT 'pending',
    score JSONB,
    recommendation TEXT,
    signature TEXT,
    evaluated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_number TEXT UNIQUE NOT NULL,
    assessment_id UUID REFERENCES assessments(id) NOT NULL,
    participant_wallet TEXT NOT NULL,
    scheme_id UUID REFERENCES competency_schemes(id) NOT NULL,
    token_id TEXT,
    tx_hash TEXT,
    ipfs_uri TEXT,
    ipfs_image_uri TEXT,
    status certificate_status DEFAULT 'active',
    minted_at TIMESTAMPTZ,
    minted_by UUID REFERENCES profiles(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES profiles(id),
    revocation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification Logs
CREATE TABLE verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID REFERENCES certificates(id),
    verifier_ip TEXT,
    query TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Competency Schemes RLS
CREATE POLICY "Schemes are viewable by everyone" ON competency_schemes FOR SELECT USING (true);
CREATE POLICY "Only admins can insert schemes" ON competency_schemes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can update schemes" ON competency_schemes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Assessments RLS
CREATE POLICY "Participants see their own assessments" ON assessments FOR SELECT USING (
    participant_id = auth.uid() OR assessor_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Assessors and Admins can update assessments" ON assessments FOR UPDATE USING (
    assessor_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create assessments for themselves" ON assessments FOR INSERT WITH CHECK (
    participant_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Certificates RLS
CREATE POLICY "Certificates are viewable by everyone" ON certificates FOR SELECT USING (true);
CREATE POLICY "Only admins can insert certificates" ON certificates FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can update certificates" ON certificates FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Verification Logs RLS
CREATE POLICY "Anyone can insert a verification log" ON verification_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view verification logs" ON verification_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Triggers for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_assessments_modtime BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Sequence for certificate numbers
CREATE SEQUENCE IF NOT EXISTS cert_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.certificate_number IS NULL THEN
        NEW.certificate_number := 'CERT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('cert_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_cert_number
BEFORE INSERT ON certificates
FOR EACH ROW
EXECUTE PROCEDURE generate_certificate_number();
