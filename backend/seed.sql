-- ============================================================
-- FLYYY.AI Demo Data Seed
-- ============================================================
-- Provides sample data for testing and demonstration

-- ============================================================
-- AI ASSETS
-- ============================================================

INSERT INTO ai_assets (name, type, provider, model, description, status)
VALUES
    (
        'Customer Support AI',
        'chatbot',
        'demo',
        'demo-support-v1',
        'AI-powered customer support chat system',
        'active'
    ),
    (
        'Customer Support Agent',
        'agent',
        'demo',
        'demo-agent-v1',
        'Autonomous agent for customer support tasks',
        'active'
    ),
    (
        'Content Generator',
        'workflow',
        'demo',
        'demo-content-v1',
        'AI content generation and optimization',
        'active'
    )
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- DATA SOURCES
-- ============================================================

INSERT INTO data_sources (name, type, description)
VALUES
    ('FAQ Database', 'database', 'Frequently asked questions and answers'),
    ('Orders Database', 'database', 'Customer orders and order history'),
    ('Knowledge Base', 'api', 'Internal knowledge base API'),
    ('Customer Database', 'database', 'Customer profiles and information')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ORDERS (Sample data for agent demo)
-- ============================================================

INSERT INTO orders (order_number, status, customer_name)
VALUES
    ('ORD-001', 'completed', 'John Smith'),
    ('ORD-002', 'shipped', 'Jane Doe'),
    ('ORD-003', 'processing', 'Bob Johnson'),
    ('ORD-004', 'pending', 'Alice Williams'),
    ('ORD-005', 'completed', 'Charlie Brown')
ON CONFLICT (order_number) DO NOTHING;

-- ============================================================
-- END OF SEED DATA
-- ============================================================
