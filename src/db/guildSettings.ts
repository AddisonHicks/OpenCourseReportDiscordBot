import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import type { GuildSettings } from '../types/report.js'

export function initDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      radius_miles INTEGER NOT NULL DEFAULT 75,
      center_zip TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posted_reports (
      guild_id TEXT NOT NULL,
      report_id TEXT NOT NULL,
      posted_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (guild_id, report_id)
    );

    CREATE INDEX IF NOT EXISTS idx_posted_reports_report_id
      ON posted_reports(report_id);
  `)

  return db
}

export class GuildSettingsStore {
  constructor(private db: Database.Database) {}

  get(guildId: string): GuildSettings | null {
    const row = this.db
      .prepare(
        `SELECT guild_id, channel_id, city, state, radius_miles, center_zip, enabled, updated_at
         FROM guild_settings WHERE guild_id = ?`,
      )
      .get(guildId) as
      | {
          guild_id: string
          channel_id: string
          city: string
          state: string
          radius_miles: number
          center_zip: string
          enabled: number
          updated_at: string
        }
      | undefined

    if (!row) return null
    return {
      ...row,
      enabled: row.enabled === 1,
    }
  }

  setChannel(guildId: string, channelId: string): void {
    const existing = this.get(guildId)
    if (existing) {
      this.db
        .prepare(
          `UPDATE guild_settings SET channel_id = ?, updated_at = datetime('now') WHERE guild_id = ?`,
        )
        .run(channelId, guildId)
    } else {
      this.db
        .prepare(
          `INSERT INTO guild_settings (guild_id, channel_id, enabled) VALUES (?, ?, 0)`,
        )
        .run(guildId, channelId)
    }
  }

  setLocation(
    guildId: string,
    city: string,
    state: string,
    radiusMiles: number,
    centerZip: string,
  ): void {
    const existing = this.get(guildId)
    if (!existing) {
      throw new Error('Guild not configured. Run /setup first.')
    }
    this.db
      .prepare(
        `UPDATE guild_settings
         SET city = ?, state = ?, radius_miles = ?, center_zip = ?, enabled = 1, updated_at = datetime('now')
         WHERE guild_id = ?`,
      )
      .run(city, state, radiusMiles, centerZip, guildId)
  }

  setEnabled(guildId: string, enabled: boolean): void {
    const existing = this.get(guildId)
    if (!existing) {
      throw new Error('Guild not configured. Run /setup first.')
    }
    this.db
      .prepare(
        `UPDATE guild_settings SET enabled = ?, updated_at = datetime('now') WHERE guild_id = ?`,
      )
      .run(enabled ? 1 : 0, guildId)
  }

  getAllEnabled(): GuildSettings[] {
    const rows = this.db
      .prepare(
        `SELECT guild_id, channel_id, city, state, radius_miles, center_zip, enabled, updated_at
         FROM guild_settings WHERE enabled = 1 AND center_zip != ''`,
      )
      .all() as Array<{
      guild_id: string
      channel_id: string
      city: string
      state: string
      radius_miles: number
      center_zip: string
      enabled: number
      updated_at: string
    }>

    return rows.map((row) => ({
      ...row,
      enabled: row.enabled === 1,
    }))
  }

  hasPosted(guildId: string, reportId: string): boolean {
    const row = this.db
      .prepare(
        `SELECT 1 FROM posted_reports WHERE guild_id = ? AND report_id = ?`,
      )
      .get(guildId, reportId)
    return row != null
  }

  markPosted(guildId: string, reportId: string): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO posted_reports (guild_id, report_id) VALUES (?, ?)`,
      )
      .run(guildId, reportId)
  }
}
