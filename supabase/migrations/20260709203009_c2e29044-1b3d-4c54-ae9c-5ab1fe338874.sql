-- Add DRAFT stage to qualification status to support the four-stage universal badge
-- (grey draft, amber under-review, green approved, red rejected).
ALTER TYPE public.p2a_qualification_status ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'PENDING';