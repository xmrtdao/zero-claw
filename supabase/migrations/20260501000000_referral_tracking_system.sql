-- Migration: Referral Tracking System
-- Date: 2026-05-01
-- Description: Adds referral code generation, tracking, and commission accounting
-- for the XMRT mining proxy referral program.

-- ============================================================
-- TABLE: referral_codes
-- Each wallet address gets a unique referral code.
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    custom_slug TEXT UNIQUE,
    total_referred INTEGER DEFAULT 0,
    total_commission_paid NUMERIC(20, 12) DEFAULT 0,
    total_commission_pending NUMERIC(20, 12) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: referral_links
-- Records which wallet referred which wallet/worker.
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_wallet TEXT NOT NULL,
    referred_wallet TEXT,
    referred_worker_id TEXT,
    referral_code_used TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive', 'banned')),
    registered_at TIMESTAMPTZ DEFAULT now(),
    last_activity TIMESTAMPTZ DEFAULT now(),
    total_shares_earned NUMERIC(20, 4) DEFAULT 0,
    -- Ensure a wallet can only be referred once
    CONSTRAINT unique_referred_wallet UNIQUE (referred_wallet),
    CONSTRAINT unique_referred_worker UNIQUE (referred_worker_id)
);

-- ============================================================
-- TABLE: referral_commissions
-- Tracks individual commission payouts for referred mining.
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_link_id UUID NOT NULL REFERENCES referral_links(id),
    commission_amount NUMERIC(20, 12) NOT NULL,
    commission_currency TEXT DEFAULT 'XMR',
    source_worker_id TEXT NOT NULL,
    source_hashes NUMERIC(20, 4) DEFAULT 0,
    commission_basis_hashes NUMERIC(20, 4) DEFAULT 0,
    commission_rate NUMERIC(5, 4) DEFAULT 0.2000, -- 20%
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'paid', 'cancelled')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    credited_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_referral_codes_wallet ON referral_codes(wallet_address);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_links_referrer ON referral_links(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referral_links_referred_wallet ON referral_links(referred_wallet);
CREATE INDEX IF NOT EXISTS idx_referral_links_referred_worker ON referral_links(referred_worker_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_link ON referral_commissions(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_period ON referral_commissions(period_start, period_end);

-- ============================================================
-- FUNCTION: generate_referral_code
-- Creates a unique short referral code from a wallet address.
-- ============================================================
CREATE OR REPLACE FUNCTION generate_referral_code(p_wallet TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_code TEXT;
    v_hash TEXT;
BEGIN
    -- Take first 8 chars of wallet hash
    v_hash := substring(p_wallet FROM 1 FOR 8);
    
    -- Make it uppercase and prepend 'XMRT-'
    v_code := 'XMRT-' || upper(v_hash);
    
    -- Ensure uniqueness by appending suffix if needed
    WHILE EXISTS (SELECT 1 FROM referral_codes WHERE referral_code = v_code) LOOP
        v_code := v_code || substring(gen_random_uuid()::text FROM 1 FOR 4);
    END LOOP;
    
    RETURN v_code;
END;
$$;

-- ============================================================
-- FUNCTION: get_or_create_referral_code
-- Gets existing code or creates one for a wallet.
-- ============================================================
CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_wallet TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
BEGIN
    SELECT referral_code INTO v_code FROM referral_codes WHERE wallet_address = p_wallet;
    
    IF v_code IS NULL THEN
        v_code := generate_referral_code(p_wallet);
        INSERT INTO referral_codes (wallet_address, referral_code)
        VALUES (p_wallet, v_code);
    END IF;
    
    RETURN v_code;
END;
$$;

-- ============================================================
-- FUNCTION: apply_referral_code
-- Called when someone registers with a referral code.
-- Returns their referral link row.
-- ============================================================
CREATE OR REPLACE FUNCTION apply_referral_code(
    p_referral_code TEXT,
    p_referred_wallet TEXT DEFAULT NULL,
    p_referred_worker_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer_wallet TEXT;
    v_link_id UUID;
BEGIN
    -- Look up the referrer's wallet
    SELECT wallet_address INTO v_referrer_wallet
    FROM referral_codes
    WHERE referral_code = p_referral_code AND is_active = true;
    
    IF v_referrer_wallet IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive referral code: %', p_referral_code;
    END IF;
    
    -- Can't refer yourself
    IF p_referred_wallet IS NOT NULL AND v_referrer_wallet = p_referred_wallet THEN
        RAISE EXCEPTION 'Cannot use your own referral code';
    END IF;
    
    -- Insert the referral link
    INSERT INTO referral_links (
        referrer_wallet,
        referred_wallet,
        referred_worker_id,
        referral_code_used
    ) VALUES (
        v_referrer_wallet,
        p_referred_wallet,
        p_referred_worker_id,
        p_referral_code
    )
    RETURNING id INTO v_link_id;
    
    -- Increment the referrer's counter
    UPDATE referral_codes
    SET total_referred = total_referred + 1,
        updated_at = now()
    WHERE referral_code = p_referral_code;
    
    RETURN v_link_id;
END;
$$;

-- ============================================================
-- FUNCTION: calculate_referral_commissions
-- CRON function to calculate pending commissions.
-- Called periodically to credit referrers based on referred miner hashrate.
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_referral_commissions(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_rec RECORD;
BEGIN
    -- Iterate over active referral links
    FOR v_rec IN
        SELECT 
            rl.id AS link_id,
            rl.referrer_wallet,
            rl.referred_worker_id,
            COALESCE(wr.hashrate_sum, 0) AS total_hashrate
        FROM referral_links rl
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(wr_inner.hashrate), 0) AS hashrate_sum
            FROM worker_registrations wr_inner
            WHERE wr_inner.worker_id = rl.referred_worker_id
              AND wr_inner.last_seen >= p_start_date
              AND wr_inner.last_seen <= p_end_date
        ) wr ON true
        WHERE rl.status = 'active'
    LOOP
        -- Calculate 20% commission on hashrate contribution
        IF v_rec.total_hashrate > 0 THEN
            INSERT INTO referral_commissions (
                referral_link_id,
                commission_amount,
                source_worker_id,
                source_hashes,
                commission_basis_hashes,
                status,
                period_start,
                period_end
            ) VALUES (
                v_rec.link_id,
                v_rec.total_hashrate * 0.000000001 * 0.20, -- Convert hashrate basis to XMR estimate
                COALESCE(v_rec.referred_worker_id, 'unknown'),
                v_rec.total_hashrate,
                v_rec.total_hashrate,
                'pending',
                p_start_date,
                p_end_date
            );
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- ============================================================
-- VIEW: referral_stats
-- Queryable view for referral dashboard.
-- ============================================================
CREATE OR REPLACE VIEW referral_stats AS
SELECT 
    rc.wallet_address AS referrer_wallet,
    rc.referral_code,
    rc.custom_slug,
    rc.total_referred,
    rc.total_commission_paid,
    rc.total_commission_pending,
    rc.is_active,
    COUNT(DISTINCT rl.id) AS active_referrals,
    COUNT(DISTINCT rc2.id) AS total_referral_links,
    COALESCE(SUM(rcomm.commission_amount), 0) AS total_commissions_earned
FROM referral_codes rc
LEFT JOIN referral_links rl ON rc.wallet_address = rl.referrer_wallet AND rl.status = 'active'
LEFT JOIN referral_commissions rcomm ON rl.id = rcomm.referral_link_id AND rcomm.status IN ('pending', 'credited')
LEFT JOIN referral_codes rc2 ON rc.wallet_address = rc2.wallet_address
GROUP BY rc.wallet_address, rc.referral_code, rc.custom_slug, rc.total_referred, 
         rc.total_commission_paid, rc.total_commission_pending, rc.is_active;

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access to referral_codes"
    ON referral_codes FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to referral_links"
    ON referral_links FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to referral_commissions"
    ON referral_commissions FOR ALL
    USING (auth.role() = 'service_role');

-- Authenticated users can read their own referral data
CREATE POLICY "Users can read own referral codes"
    ON referral_codes FOR SELECT
    USING (wallet_address = auth.jwt() ->> 'wallet_address' OR auth.role() = 'service_role');

CREATE POLICY "Users can read own referral links"
    ON referral_links FOR SELECT
    USING (referrer_wallet = auth.jwt() ->> 'wallet_address' OR auth.role() = 'service_role');

CREATE POLICY "Users can read own referral commissions"
    ON referral_commissions FOR SELECT
    USING (
        referral_link_id IN (
            SELECT id FROM referral_links 
            WHERE referrer_wallet = auth.jwt() ->> 'wallet_address'
        ) OR auth.role() = 'service_role'
    );

-- Allow anon/service_role to insert new referrals
CREATE POLICY "Anyone can insert referral links"
    ON referral_links FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- FUNCTIONS for API consumption
-- ============================================================

-- GET a referral code for a wallet
CREATE OR REPLACE FUNCTION api_get_referral_code(p_wallet TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
BEGIN
    SELECT referral_code INTO v_code FROM referral_codes WHERE wallet_address = p_wallet;
    IF v_code IS NULL THEN
        v_code := get_or_create_referral_code(p_wallet);
    END IF;
    RETURN v_code;
END;
$$;

-- GET stats for referrer dashboard
CREATE OR REPLACE FUNCTION api_get_referral_dashboard(p_wallet TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'referral_code', rc.referral_code,
        'total_referred', rc.total_referred,
        'total_commission_paid', rc.total_commission_paid::TEXT,
        'total_commission_pending', rc.total_commission_pending::TEXT,
        'referral_links', COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'referred_wallet', rl.referred_wallet,
                'referred_worker_id', rl.referred_worker_id,
                'status', rl.status,
                'registered_at', rl.registered_at,
                'last_activity', rl.last_activity
            ))
            FROM referral_links rl
            WHERE rl.referrer_wallet = p_wallet
            ORDER BY rl.registered_at DESC),
            '[]'::jsonb
        ),
        'pending_commissions', COALESCE(
            (SELECT SUM(commission_amount) FROM referral_commissions rc2
             WHERE rc2.referral_link_id IN (
                 SELECT id FROM referral_links WHERE referrer_wallet = p_wallet
             ) AND rc2.status = 'pending'),
            0
        )::TEXT,
        'total_earned', COALESCE(
            (SELECT SUM(commission_amount) FROM referral_commissions rc2
             WHERE rc2.referral_link_id IN (
                 SELECT id FROM referral_links WHERE referrer_wallet = p_wallet
             ) AND rc2.status IN ('credited', 'paid')),
            0
        )::TEXT
    ) INTO v_result
    FROM referral_codes rc
    WHERE rc.wallet_address = p_wallet;
    
    RETURN v_result;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION generate_referral_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_referral_code(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION apply_referral_code(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION calculate_referral_commissions(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION api_get_referral_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION api_get_referral_dashboard(TEXT) TO anon, authenticated;

-- Comments
COMMENT ON TABLE referral_codes IS 'Unique referral codes per wallet for the XMRT mining referral program';
COMMENT ON TABLE referral_links IS 'Links between referrer wallets and their referred miners';
COMMENT ON TABLE referral_commissions IS 'Commission records tracking referral rewards earned';
COMMENT ON FUNCTION generate_referral_code IS 'Generates a unique XMRT-XXXX referral code from a wallet address';
COMMENT ON FUNCTION apply_referral_code IS 'Records a referral when someone registers using a referral code';
COMMENT ON FUNCTION calculate_referral_commissions IS 'Batch process to calculate and create pending commission records';
