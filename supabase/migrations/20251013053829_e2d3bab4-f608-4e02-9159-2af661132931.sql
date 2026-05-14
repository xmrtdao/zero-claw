-- Add indexes for unindexed foreign keys
-- These dramatically improve JOIN performance and prevent table locks

-- charging_sessions
CREATE INDEX IF NOT EXISTS idx_charging_sessions_session_id 
ON public.charging_sessions(session_id);

-- decisions
CREATE INDEX IF NOT EXISTS idx_decisions_agent_id 
ON public.decisions(agent_id);

-- entity_relationships
CREATE INDEX IF NOT EXISTS idx_entity_relationships_target_entity_id 
ON public.entity_relationships(target_entity_id);

-- faucet_claims
CREATE INDEX IF NOT EXISTS idx_faucet_claims_device_id 
ON public.faucet_claims(device_id);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_agent_id 
ON public.tasks(assignee_agent_id);

-- user_worker_mappings
CREATE INDEX IF NOT EXISTS idx_user_worker_mappings_device_id 
ON public.user_worker_mappings(device_id);

-- worker_registrations
CREATE INDEX IF NOT EXISTS idx_worker_registrations_device_id 
ON public.worker_registrations(device_id);

-- Remove indexes that have never been used (idx_scan = 0)
-- This improves INSERT/UPDATE performance and reduces storage costs

-- Agent performance metrics
DROP INDEX IF EXISTS public.idx_agent_performance_agent_id;
DROP INDEX IF EXISTS public.idx_agent_performance_metric_type;

-- Agent specializations
DROP INDEX IF EXISTS public.idx_agent_spec_agent_id;
DROP INDEX IF EXISTS public.idx_agent_spec_proficiency;

-- Battery tracking
DROP INDEX IF EXISTS public.idx_battery_sessions_device;
DROP INDEX IF EXISTS public.idx_battery_sessions_session_key;
DROP INDEX IF EXISTS public.idx_battery_sessions_started_at;
DROP INDEX IF EXISTS public.idx_battery_sessions_active;
DROP INDEX IF EXISTS public.idx_battery_readings_session;
DROP INDEX IF EXISTS public.idx_battery_readings_device;
DROP INDEX IF EXISTS public.idx_battery_readings_timestamp;
DROP INDEX IF EXISTS public.idx_battery_readings_device_timestamp;
DROP INDEX IF EXISTS public.idx_battery_health_device;
DROP INDEX IF EXISTS public.idx_battery_health_assessed_at;
DROP INDEX IF EXISTS public.idx_charging_sessions_device;
DROP INDEX IF EXISTS public.idx_charging_sessions_started_at;

-- Chat messages
DROP INDEX IF EXISTS public.idx_chat_messages_role;

-- Conversation history
DROP INDEX IF EXISTS public.idx_conversation_history_session_id;
DROP INDEX IF EXISTS public.idx_conversation_history_session_key;
DROP INDEX IF EXISTS public.idx_conversation_history_participant_type;
DROP INDEX IF EXISTS public.idx_conversation_history_last_activity;

-- Devices
DROP INDEX IF EXISTS public.idx_devices_fingerprint;
DROP INDEX IF EXISTS public.idx_devices_worker_id;
DROP INDEX IF EXISTS public.idx_devices_wallet_address;
DROP INDEX IF EXISTS public.idx_devices_last_seen;

-- IP address log
DROP INDEX IF EXISTS public.idx_ip_log_ip;
DROP INDEX IF EXISTS public.idx_ip_log_device;
DROP INDEX IF EXISTS public.idx_ip_log_worker;
DROP INDEX IF EXISTS public.idx_ip_log_wallet;
DROP INDEX IF EXISTS public.idx_ip_log_activity;
DROP INDEX IF EXISTS public.idx_ip_log_last_seen;

-- API call logs
DROP INDEX IF EXISTS public.idx_api_call_logs_function_name;
DROP INDEX IF EXISTS public.idx_api_call_logs_called_at;
DROP INDEX IF EXISTS public.idx_api_call_logs_status;
DROP INDEX IF EXISTS public.idx_api_call_logs_execution_time;

-- Autonomous actions log
DROP INDEX IF EXISTS public.idx_autonomous_actions_timestamp;
DROP INDEX IF EXISTS public.idx_autonomous_actions_type;
DROP INDEX IF EXISTS public.idx_autonomous_actions_outcome;
DROP INDEX IF EXISTS public.idx_autonomous_actions_trigger;

-- System logs
DROP INDEX IF EXISTS public.idx_system_logs_created_at;
DROP INDEX IF EXISTS public.idx_system_logs_log_category;
DROP INDEX IF EXISTS public.idx_system_logs_resolved;
DROP INDEX IF EXISTS public.idx_system_logs_details_gin;

-- System metrics
DROP INDEX IF EXISTS public.idx_system_metrics_name_measured;
DROP INDEX IF EXISTS public.idx_system_metrics_category;

-- Learning sessions
DROP INDEX IF EXISTS public.idx_learning_sessions_agent_id;
DROP INDEX IF EXISTS public.idx_learning_sessions_status;

-- Eliza activity log
DROP INDEX IF EXISTS public.idx_eliza_activity_gatekeeper;

-- Recent conversation messages
DROP INDEX IF EXISTS public.idx_recent_conv_messages_session_timestamp;
DROP INDEX IF EXISTS public.idx_recent_conv_messages_timestamp;

-- System performance logs
DROP INDEX IF EXISTS public.idx_system_performance_logs_recorded_at;
DROP INDEX IF EXISTS public.idx_system_performance_logs_snapshot_type;
DROP INDEX IF EXISTS public.idx_system_performance_logs_health_status;
DROP INDEX IF EXISTS public.idx_system_performance_logs_health_score;

-- Device miner associations
DROP INDEX IF EXISTS public.idx_device_miner_device;
DROP INDEX IF EXISTS public.idx_device_miner_worker;
DROP INDEX IF EXISTS public.idx_device_miner_wallet;

-- DAO members
DROP INDEX IF EXISTS public.idx_dao_members_wallet;

-- XMR assistant interactions
DROP INDEX IF EXISTS public.idx_assistant_device;
DROP INDEX IF EXISTS public.idx_assistant_session;
DROP INDEX IF EXISTS public.idx_assistant_created_at;

-- Workload forecasts
DROP INDEX IF EXISTS public.idx_workload_forecast_type;
DROP INDEX IF EXISTS public.idx_workload_forecast_at;

-- Skill gap analysis
DROP INDEX IF EXISTS public.idx_skill_gap_priority;

-- Eliza Python executions archive
DROP INDEX IF EXISTS public.eliza_python_executions_archive_created_at_idx;