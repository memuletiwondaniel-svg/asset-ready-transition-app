-- Enable realtime for chat_conversations table
ALTER TABLE chat_conversations REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;