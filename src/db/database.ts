import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";

export class Migrator {
  constructor(private readonly sqlite: DatabaseSync) {}

  run() {
    this.sqlite.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )`);
    const dir = path.join(process.cwd(), "src", "db", "migrations");
    const files = readdirSync(dir)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    const applied = new Set(
      this.sqlite.prepare("SELECT id FROM schema_migrations").all().map((row) => String((row as { id: string }).id)),
    );
    for (const file of files) {
      if (applied.has(file)) continue;
      this.sqlite.exec("BEGIN");
      try {
        this.sqlite.exec(readFileSync(path.join(dir, file), "utf8"));
        this.sqlite.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(file, Date.now());
        this.sqlite.exec("COMMIT");
      } catch (error) {
        this.sqlite.exec("ROLLBACK");
        throw error;
      }
    }
  }
}

type WireDb = ReturnType<typeof drizzle>;

const globalDb = globalThis as unknown as { wireDb?: WireDb };

export class Database {
  static current() {
    if (!globalDb.wireDb) {
      const file = path.join(process.cwd(), "data", "wire.db");
      mkdirSync(path.dirname(file), { recursive: true });
      const sqlite = new DatabaseSync(file);
      sqlite.exec("PRAGMA journal_mode = WAL");
      sqlite.exec("PRAGMA foreign_keys = ON");
      globalDb.wireDb = drizzle({ client: sqlite });
    }
    new Migrator(globalDb.wireDb.$client).run();
    return globalDb.wireDb;
  }
}
