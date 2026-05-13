-- Column lastReelsPaginationToken is included in 20260514120000_competitor_per_user_daily.
-- Legacy installs may already have this column; avoid duplicate ALTER errors.
SELECT 1;
