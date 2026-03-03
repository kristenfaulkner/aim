-- Add ftp_at_time to activities: records which FTP was used for TSS computation.
-- Once stamped, TSS is never retroactively recalculated — only new rides use the
-- updated FTP. This is correct because FTP reflects fitness at the time of the ride.

ALTER TABLE activities ADD COLUMN IF NOT EXISTS ftp_at_time INTEGER;
