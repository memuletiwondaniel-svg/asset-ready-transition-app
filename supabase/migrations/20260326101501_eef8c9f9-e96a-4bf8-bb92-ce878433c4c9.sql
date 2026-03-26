DELETE FROM dms_sync_logs WHERE dms_platform = 'assai';
DELETE FROM dms_sync_credentials WHERE dms_platform = 'assai';
DELETE FROM dms_external_sync WHERE dms_platform = 'assai';
DELETE FROM dms_field_mappings WHERE platform = 'assai';