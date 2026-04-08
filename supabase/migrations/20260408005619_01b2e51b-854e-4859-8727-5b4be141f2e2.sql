ALTER TABLE agent_training_sessions
  ADD COLUMN IF NOT EXISTS completeness_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS knowledge_status text DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS correction_history jsonb DEFAULT '[]';