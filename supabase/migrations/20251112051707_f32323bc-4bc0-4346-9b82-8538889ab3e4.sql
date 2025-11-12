-- Add is_read column to chat_conversations table
ALTER TABLE chat_conversations 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT true;