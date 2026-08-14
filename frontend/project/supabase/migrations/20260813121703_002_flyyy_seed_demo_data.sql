/*
# FLYYY.AI seed demo data

Populates the platform with realistic demo content so the dashboard is not
empty on first launch. All rows are clearly demo data. Includes:
- 2 AI assets (Customer Support AI chatbot, Customer Support Agent)
- 2 data sources (FAQ Database [declared default], Orders Database)
- FAQ entries and Orders rows (simulated data sources)
- Sample AI activity, PII events, agent runs, governance alerts, otel spans
*/

DO $$
DECLARE
  asset_chat uuid;
  asset_agent uuid;
  ds_faq uuid;
  ds_orders uuid;
  act1 uuid; act2 uuid; act3 uuid;
  run1 uuid; run2 uuid;
BEGIN
  INSERT INTO ai_assets (id, name, type, provider, model, description, status)
  VALUES
    ('a1111111-1111-1111-1111-111111111111','Customer Support AI','chatbot','demo','demo-support-v1','Demo chatbot that answers customer-support questions. (DEMO ASSET)','active'),
    ('a2222222-2222-2222-2222-222222222222','Customer Support Agent','agent','demo','demo-agent-v1','Demo AI agent that retrieves answers from declared data sources. (DEMO ASSET)','active')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO asset_chat FROM ai_assets WHERE name='Customer Support AI';
  SELECT id INTO asset_agent FROM ai_assets WHERE name='Customer Support Agent';

  INSERT INTO data_sources (id, name, description, source_type, is_declared_default)
  VALUES
    ('d1111111-1111-1111-1111-111111111111','FAQ Database','Simulated FAQ knowledge base. (DEMO DATA SOURCE)','database',true),
    ('d2222222-2222-2222-2222-222222222222','Orders Database','Simulated customer orders. (DEMO DATA SOURCE — NOT declared for the agent)','database',false)
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO ds_faq FROM data_sources WHERE name='FAQ Database';
  SELECT id INTO ds_orders FROM data_sources WHERE name='Orders Database';

  INSERT INTO faq_entries (question, answer) VALUES
    ('What is your return policy?','You can return any item within 30 days of purchase for a full refund. (DEMO FAQ)'),
    ('How long does shipping take?','Standard shipping takes 3-5 business days. (DEMO FAQ)'),
    ('Do you offer international shipping?','Yes, we ship to over 40 countries. (DEMO FAQ)')
  ON CONFLICT DO NOTHING;

  INSERT INTO orders (order_number, customer_name, status, total_cents) VALUES
    ('ORD-1001','Demo Customer A','shipped',5499),
    ('ORD-1002','Demo Customer B','processing',12999),
    ('ORD-1003','Demo Customer C','delivered',3200)
  ON CONFLICT DO NOTHING;

  INSERT INTO ai_activity (id, request_id, asset_id, provider, model, sanitized_prompt, pii_detected, pii_counts, prompt_monitoring_enabled, token_usage, tools_invoked, duration_ms, status, started_at, completed_at)
  VALUES
    ('c1111111-1111-1111-1111-111111111111','REQ-2001',asset_chat,'demo','demo-support-v1','What is the status of my order?',false,'{}'::jsonb,true,jsonb_build_object('prompt_tokens',12,'completion_tokens',24,'total_tokens',36),'{}',420,'success',now() - interval '2 hours', now() - interval '2 hours' + interval '420 milliseconds'),
    ('c2222222-2222-2222-2222-222222222222','REQ-2002',asset_chat,'demo','demo-support-v1','Write a reminder email to <NAME>, phone <PHONE>.',true,jsonb_build_object('NAME',1,'PHONE',1),true,jsonb_build_object('prompt_tokens',14,'completion_tokens',40,'total_tokens',54),'{}',610,'success',now() - interval '1 hour', now() - interval '1 hour' + interval '610 milliseconds'),
    ('c3333333-3333-3333-3333-333333333333','REQ-2003',asset_chat,'demo','demo-support-v1','Call <NAME> at <PHONE> about his insurance claim.',true,jsonb_build_object('NAME',1,'PHONE',1),true,jsonb_build_object('prompt_tokens',12,'completion_tokens',30,'total_tokens',42),'{}',380,'success',now() - interval '40 minutes', now() - interval '40 minutes' + interval '380 milliseconds')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO act1 FROM ai_activity WHERE request_id='REQ-2001';
  SELECT id INTO act2 FROM ai_activity WHERE request_id='REQ-2002';
  SELECT id INTO act3 FROM ai_activity WHERE request_id='REQ-2003';

  INSERT INTO pii_events (activity_id, asset_id, pii_type, count) VALUES
    (act2, asset_chat, 'NAME', 1),
    (act2, asset_chat, 'PHONE', 1),
    (act3, asset_chat, 'NAME', 1),
    (act3, asset_chat, 'PHONE', 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO governance_alerts (alert_id, type, severity, asset_id, description, status, related_id, created_at) VALUES
    ('ALR-3001','pii_detected','medium',asset_chat,'PII detected in prompt to Customer Support AI (NAME, PHONE).','open',act2, now() - interval '1 hour'),
    ('ALR-3002','pii_detected','medium',asset_chat,'PII detected in prompt to Customer Support AI (NAME, PHONE).','open',act3, now() - interval '40 minutes')
  ON CONFLICT (alert_id) DO NOTHING;

  -- Agent runs (valid UUIDs)
  INSERT INTO agent_runs (id, run_id, asset_id, status, tools_invoked, duration_ms, has_unexpected_access, started_at, completed_at)
  VALUES
    ('e1111111-1111-1111-1111-111111111111','RUN-4001',asset_agent,'success','{"faq_search"}',250,false, now() - interval '3 hours', now() - interval '3 hours' + interval '250 milliseconds'),
    ('e2222222-2222-2222-2222-222222222222','RUN-4002',asset_agent,'success','{"faq_search","orders_query"}',520,true, now() - interval '90 minutes', now() - interval '90 minutes' + interval '520 milliseconds')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO run1 FROM agent_runs WHERE run_id='RUN-4001';
  SELECT id INTO run2 FROM agent_runs WHERE run_id='RUN-4002';

  INSERT INTO agent_run_data_sources (run_id, data_source_id, access_type) VALUES
    (run1, ds_faq, 'declared'),
    (run1, ds_faq, 'observed'),
    (run2, ds_faq, 'declared'),
    (run2, ds_faq, 'observed'),
    (run2, ds_orders, 'observed')
  ON CONFLICT DO NOTHING;

  INSERT INTO governance_alerts (alert_id, type, severity, asset_id, description, status, related_id, created_at) VALUES
    ('ALR-3003','unexpected_data_access','high',asset_agent,'Unexpected data source access: Orders Database was accessed but not declared for RUN-4002.','open',run2, now() - interval '90 minutes')
  ON CONFLICT (alert_id) DO NOTHING;

  INSERT INTO otel_spans (trace_id, span_id, parent_span_id, activity_id, span_name, span_kind, attributes, start_time, end_time, status_code) VALUES
    ('tr-2002','sp-2002a',NULL,act2,'openai.chat','client',jsonb_build_object('provider','demo','model','demo-support-v1','operation','chat.completion','prompt_tokens',14,'completion_tokens',40), now() - interval '1 hour', now() - interval '1 hour' + interval '610 milliseconds','ok'),
    ('tr-2002','sp-2002b','sp-2002a',act2,'pii.detect','internal',jsonb_build_object('pii_detected',true,'types',jsonb_build_array('NAME','PHONE')), now() - interval '1 hour' - interval '20 milliseconds', now() - interval '1 hour','ok'),
    ('tr-4002','sp-4002a',NULL,NULL,'agent.run','internal',jsonb_build_object('run_id','RUN-4002','asset','Customer Support Agent'), now() - interval '90 minutes', now() - interval '90 minutes' + interval '520 milliseconds','ok'),
    ('tr-4002','sp-4002b','sp-4002a',NULL,'datasource.access','internal',jsonb_build_object('source','FAQ Database','access_type','observed'), now() - interval '90 minutes' - interval '100 milliseconds', now() - interval '90 minutes' - interval '60 milliseconds','ok'),
    ('tr-4002','sp-4002c','sp-4002a',NULL,'datasource.access','internal',jsonb_build_object('source','Orders Database','access_type','observed','unexpected',true), now() - interval '90 minutes' - interval '50 milliseconds', now() - interval '90 minutes' - interval '20 milliseconds','ok')
  ON CONFLICT DO NOTHING;

  UPDATE otel_spans SET agent_run_id = run2 WHERE trace_id = 'tr-4002';

END $$;