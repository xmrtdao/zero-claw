-- Fix RLS security issues by enabling RLS on missing tables
ALTER TABLE public.learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_contexts ENABLE ROW LEVEL SECURITY;

-- Add policies for learning_patterns table
CREATE POLICY "Allow all operations on learning_patterns" 
ON public.learning_patterns 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add policies for memory_contexts table  
CREATE POLICY "Allow all operations on memory_contexts" 
ON public.memory_contexts 
FOR ALL 
USING (true) 
WITH CHECK (true);