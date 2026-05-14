-- Phase 1.1: Enable pg_trgm Extension for Text Search Optimization
-- This extension is required for the GIN trigram index on conversation_messages.content
-- Enables fast LIKE/ILIKE queries with pattern matching

CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;