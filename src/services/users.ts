import type { SqlDatabase } from "../storage/database";

export type PublishStatus = "none" | "pending" | "approved";

export type UserRecord = {
  id: string;
  email: string;
  handle: string;
  passwordHash: string;
};

export type UserView = {
  id: string;
  email: string;
  handle: string;
  name: string;
  bioZh: string;
  bioEn: string;
  publishStatus: PublishStatus;
  brokerConnected: boolean;
};

type UserRow = {
  id: string;
  email: string;
  handle: string;
  password_hash: string;
};

type UserViewRow = {
  id: string;
  email: string;
  handle: string;
  display_name: string;
  bio_zh: string;
  bio_en: string;
  publish_status: PublishStatus | null;
  broker_connected: number;
};

function viewFromRow(row: UserViewRow): UserView {
  const publishStatus =
    row.publish_status === "pending" || row.publish_status === "approved" ? row.publish_status : "none";
  return {
    id: row.id,
    email: row.email,
    handle: row.handle,
    name: row.display_name,
    bioZh: row.bio_zh,
    bioEn: row.bio_en,
    publishStatus,
    brokerConnected: row.broker_connected === 1,
  };
}

function constraintField(error: unknown): "email" | "handle" | null {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("users.email")) return "email";
  if (message.includes("users.handle")) return "handle";
  return null;
}

class Users {
  constructor(private readonly db: SqlDatabase) {}

  async findByEmail(email: string) {
    const row = await this.db
      .prepare("SELECT id, email, handle, password_hash FROM users WHERE email = ? LIMIT 1")
      .bind(email)
      .first<UserRow>();
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      handle: row.handle,
      passwordHash: row.password_hash,
    } satisfies UserRecord;
  }

  async findByHandle(handle: string) {
    const row = await this.db
      .prepare("SELECT id FROM users WHERE handle = ? LIMIT 1")
      .bind(handle)
      .first<{ id: string }>();
    return row?.id ?? null;
  }

  async getView(id: string) {
    const row = await this.db
      .prepare(
        `SELECT u.id, u.email, u.handle, p.display_name, p.bio_zh, p.bio_en,
                pub.status AS publish_status,
                CASE WHEN EXISTS (SELECT 1 FROM broker_links b WHERE b.user_id = u.id) THEN 1 ELSE 0 END AS broker_connected
         FROM users u
         JOIN profiles p ON p.user_id = u.id
         LEFT JOIN publishers pub ON pub.user_id = u.id
         WHERE u.id = ?
         LIMIT 1`,
      )
      .bind(id)
      .first<UserViewRow>();
    return row ? viewFromRow(row) : null;
  }

  async create(input: { email: string; handle: string; passwordHash: string; name: string }) {
    const takenEmail = await this.findByEmail(input.email);
    if (takenEmail) return { error: "email_taken" as const };
    const takenHandle = await this.findByHandle(input.handle);
    if (takenHandle) return { error: "handle_taken" as const };

    const id = crypto.randomUUID();
    const createdAt = Date.now();
    try {
      await this.db.batch([
        this.db
          .prepare("INSERT INTO users (id, email, handle, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, input.email, input.handle, input.passwordHash, createdAt),
        this.db
          .prepare("INSERT INTO profiles (user_id, display_name, bio_zh, bio_en) VALUES (?, ?, '', '')")
          .bind(id, input.name),
      ]);
    } catch (error) {
      const field = constraintField(error);
      if (field === "email") return { error: "email_taken" as const };
      if (field === "handle") return { error: "handle_taken" as const };
      throw error;
    }

    const view = await this.getView(id);
    if (!view) throw new Error("user_create_failed");
    return { user: view };
  }

  async updateProfile(id: string, patch: { name?: string; bioZh?: string; bioEn?: string }) {
    const current = await this.getView(id);
    if (!current) return null;
    const name = patch.name ?? current.name;
    const bioZh = patch.bioZh ?? current.bioZh;
    const bioEn = patch.bioEn ?? current.bioEn;
    await this.db
      .prepare("UPDATE profiles SET display_name = ?, bio_zh = ?, bio_en = ? WHERE user_id = ?")
      .bind(name, bioZh, bioEn, id)
      .run();
    return this.getView(id);
  }
}

export { Users };
