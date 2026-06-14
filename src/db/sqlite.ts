import initSqlJs from 'sql.js/dist/sql-wasm.js';

let SQL: any = null;
let db: any = null;

export function getDB(): any {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

export async function initDB(): Promise<void> {
  if (db) return;
  SQL = await initSqlJs({ locateFile: (file: string) => `https://sql.js.org/dist/${file}` });

  const saved = localStorage.getItem('zero_claw_db');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const uint8 = new Uint8Array(parsed);
      db = new SQL.Database(uint8);
      db.exec('SELECT 1');
      console.log('[ZeroClaw] Loaded database from localStorage');
    } catch (e) {
      console.warn('[ZeroClaw] Failed to load saved DB, creating fresh:', e);
      db = null;
    }
  }

  if (!db) {
    db = new SQL.Database();
    createSchema();
    seedData();
    saveDB();
    console.log('[ZeroClaw] Created fresh database');
  }

  // Migration: check for missing tables
  migrateIfNeeded();
}

function createSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      category TEXT,
      created_by TEXT,
      votes_for INTEGER DEFAULT 0,
      votes_against INTEGER DEFAULT 0,
      quorum INTEGER DEFAULT 100,
      deadline TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id INTEGER NOT NULL,
      nullifier TEXT UNIQUE NOT NULL,
      vote_commitment TEXT NOT NULL,
      vote_choice INTEGER NOT NULL CHECK(vote_choice IN (0, 1)),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proposal_id) REFERENCES proposals(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      content_encrypted TEXT,
      content_plaintext TEXT,
      iv TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_type TEXT NOT NULL,
      task_name TEXT NOT NULL,
      task_data TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS governance_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      actor TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_votes_nullifier ON votes(nullifier);
    CREATE INDEX IF NOT EXISTS idx_messages_case ON chat_messages(case_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(type);
  `);
}

function seedData(): void {
  // Seed proposals
  db.exec(`
    INSERT OR IGNORE INTO proposals (title, description, status, category, created_by, votes_for, votes_against, quorum, deadline)
    VALUES
      ('Treasury Allocation Q2 2026', 'Allocate 500 XMR from the community treasury for Q2 development grants, marketing initiatives, and infrastructure costs.', 'active', 'Treasury', 'XMRT DAO Council', 47, 12, 100, '2026-07-01T00:00:00Z'),
      ('Privacy Feature: Stealth Addresses v2', 'Upgrade the stealth address protocol to support multi-output transactions with enhanced entropy.', 'active', 'Protocol', 'Crypto Architect', 89, 3, 75, '2026-06-30T00:00:00Z'),
      ('Partnership with Cake Wallet', 'Formalize integration partnership with Cake Wallet for native ZeroClaw governance voting.', 'active', 'Partnership', 'Business Agent', 62, 8, 50, '2026-07-15T00:00:00Z'),
      ('On-Chain Identity Verification', 'Implement zero-knowledge identity verification for DAO members without doxxing.', 'pending', 'Protocol', 'Research Agent', 0, 0, 100, '2026-08-01T00:00:00Z'),
      ('Reduce Proposal Quorum to 50', 'Lower the minimum vote threshold from 100 to 50 votes to increase governance participation.', 'active', 'Governance', 'Governance Agent', 34, 21, 100, '2026-07-10T00:00:00Z');
  `);

  // Seed activity log
  db.exec(`
    INSERT OR IGNORE INTO activity_log (type, description, actor, metadata)
    VALUES
      ('proposal_created', 'Treasury Allocation Q2 2026 submitted for vote', 'XMRT DAO Council', '{"proposal_id": 1}'),
      ('vote_cast', 'Privacy Feature v2 received 89 approval votes', 'Anonymous Voter', '{"proposal_id": 2, "choice": 1}'),
      ('agent_executed', 'Business Agent completed partnership analysis', 'Business Agent', '{"task": "partnership_analysis"}'),
      ('system', 'ZeroClaw DAO governance initialized', 'System', '{}');
  `);

  // Seed default settings
  db.exec(`
    INSERT OR IGNORE INTO governance_settings (key, value)
    VALUES
      ('quorum_default', '100'),
      ('vote_threshold', '0.51'),
      ('proposal_duration_days', '30'),
      ('dao_name', 'XMRT DAO'),
      ('dao_token', 'XMRT');
  `);
}

function migrateIfNeeded(): void {
  // Check if any tables are missing and create them
  const tables = ['proposals', 'votes', 'chat_messages', 'agent_tasks', 'governance_settings', 'activity_log'];
  for (const table of tables) {
    const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
    stmt.bind([table]);
    const exists = stmt.step();
    stmt.free();
    if (!exists) {
      console.log(`[ZeroClaw] Migrating: creating missing table ${table}`);
      createSchema();
      seedData();
      saveDB();
      break;
    }
  }
}

export function saveDB(): void {
  if (!db) return;
  try {
    const data = db.export();
    localStorage.setItem('zero_claw_db', JSON.stringify(Array.from(data)));
  } catch (e) {
    console.warn('[ZeroClaw] Failed to save DB:', e);
  }
}

export function resetDB(): void {
  if (db) {
    db.close();
    db = null;
  }
  localStorage.removeItem('zero_claw_db');
}
