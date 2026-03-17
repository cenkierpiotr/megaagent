-- Megabot Database Initialization Schema

CREATE TABLE IF NOT EXISTS agent_logs (
    id SERIAL PRIMARY KEY,
    source TEXT,
    chat_id TEXT,
    capability TEXT,
    prompt TEXT,
    result TEXT,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster result retrieval if needed
CREATE INDEX IF NOT EXISTS idx_agent_logs_source ON agent_logs(source);
CREATE INDEX IF NOT EXISTS idx_agent_logs_chat_id ON agent_logs(chat_id);
