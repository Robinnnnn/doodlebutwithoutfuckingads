import { env } from "cloudflare:workers";

export function getD1() {
  if (!env.DB) {
    throw new Error("The poll database is not available.");
  }
  return env.DB;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema() {
  if (!schemaReady) {
    const db = getD1();
    schemaReady = db
      .batch([
        db.prepare(`
          CREATE TABLE IF NOT EXISTS polls (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            organizer TEXT NOT NULL,
            location TEXT NOT NULL DEFAULT '',
            note TEXT NOT NULL DEFAULT '',
            timezone TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL DEFAULT 60,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS poll_options (
            id TEXT PRIMARY KEY,
            poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
            starts_at TEXT NOT NULL
          )
        `),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS responses (
            id TEXT PRIMARY KEY,
            poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
            voter_token TEXT NOT NULL,
            name TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `),
        db.prepare(`
          CREATE UNIQUE INDEX IF NOT EXISTS responses_poll_voter_idx
          ON responses (poll_id, voter_token)
        `),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS votes (
            response_id TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
            option_id TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
            PRIMARY KEY (response_id, option_id)
          )
        `),
        db.prepare(`
          CREATE INDEX IF NOT EXISTS poll_options_poll_idx
          ON poll_options (poll_id, starts_at)
        `),
      ])
      .then(() => undefined);
  }
  return schemaReady;
}
