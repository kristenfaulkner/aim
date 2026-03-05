-- Migration 017: Add feedback text and insight body to ai_feedback
-- Allows users to explain their thumbs up/down and stores the AI output for CS review

ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS feedback_text TEXT;
ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS insight_body TEXT;
