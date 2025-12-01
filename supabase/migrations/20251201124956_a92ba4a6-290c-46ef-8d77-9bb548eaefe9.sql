-- Enable REPLICA IDENTITY FULL on profiles table for better realtime support
-- This ensures that all column data is included in realtime events
ALTER TABLE profiles REPLICA IDENTITY FULL;