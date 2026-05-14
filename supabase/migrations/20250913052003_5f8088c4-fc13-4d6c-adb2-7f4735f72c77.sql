-- Enhanced Memory & Task Execution System Schema (Fixed)
-- Building on existing memory_contexts and learning_patterns tables

-- Create conversation_sessions table for organizing conversations
CREATE TABLE public.conversation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE, -- browser-based session identifier
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true
);

-- Create conversation_messages table for detailed message history
CREATE TABLE public.conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processing_data JSONB -- store AI processing details, emotions, etc.
);

-- Create knowledge_entities table for building knowledge graphs
CREATE TABLE public.knowledge_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- person, concept, topic, crypto, dao, etc.
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  confidence_score REAL DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entity_name, entity_type)
);

-- Create entity_relationships table for knowledge graph connections
CREATE TABLE public.entity_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_entity_id UUID NOT NULL REFERENCES public.knowledge_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES public.knowledge_entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- related_to, part_of, causes, etc.
  strength REAL DEFAULT 0.5, -- relationship strength 0-1
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Create tasks table for task management system
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL, -- associate with browser session
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL, -- research, monitor, remind, execute, etc.
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5), -- 1=highest, 5=lowest
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  execution_data JSONB, -- store execution results, progress, etc.
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE -- for subtasks
);

-- Create task_executions table for tracking task execution history
CREATE TABLE public.task_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  execution_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  execution_end TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error', 'timeout')),
  result_data JSONB,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create user_preferences table for personalization (session-based)
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_key, preference_key)
);

-- Create interaction_patterns table for behavioral learning
CREATE TABLE public.interaction_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_occurrence TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_score REAL DEFAULT 0.5,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(session_key, pattern_name)
);

-- Create scheduled_actions table for recurring tasks
CREATE TABLE public.scheduled_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL,
  action_name TEXT NOT NULL,
  action_type TEXT NOT NULL, -- reminder, check, monitor, etc.
  schedule_expression TEXT NOT NULL, -- cron-like expression or interval
  action_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  next_execution TIMESTAMP WITH TIME ZONE,
  last_execution TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for better performance
CREATE INDEX idx_conversation_messages_session_time ON public.conversation_messages(session_id, timestamp DESC);
CREATE INDEX idx_memory_contexts_session ON public.memory_contexts(session_id);
CREATE INDEX idx_tasks_session_status ON public.tasks(session_key, status);
CREATE INDEX idx_tasks_scheduled_for ON public.tasks(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_knowledge_entities_type ON public.knowledge_entities(entity_type);
CREATE INDEX idx_entity_relationships_source ON public.entity_relationships(source_entity_id);
CREATE INDEX idx_user_preferences_session ON public.user_preferences(session_key);

-- Enable Row Level Security (basic security even without auth)
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_actions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for session-based access (no auth required)
CREATE POLICY "Allow all operations" ON public.conversation_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.conversation_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.knowledge_entities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.entity_relationships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.task_executions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.user_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.interaction_patterns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.scheduled_actions FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_conversation_sessions_updated_at
  BEFORE UPDATE ON public.conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_entities_updated_at
  BEFORE UPDATE ON public.knowledge_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();