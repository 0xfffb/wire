import type { SqlDatabase } from "../storage/database";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  bio: string;
  avatar: string | null;
  x: string | null;
  site: string | null;
  youtube: string | null;
  listed: number;
  show_qty: number;
  show_fills: number;
  created_at: number;
};

export type Profile = {
  name: string;
  bio: string;
  avatar: string | null;
  x: string | null;
  site: string | null;
  youtube: string | null;
};

export type Me = Profile & { id: string; email: string };

export type Share = {
  listed: boolean;
  showQty: boolean;
  showFills: boolean;
};

function blank(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text || null;
}

function profileOf(row: UserRow): Profile {
  return {
    name: row.name,
    bio: row.bio,
    avatar: row.avatar,
    x: row.x,
    site: row.site,
    youtube: row.youtube,
  };
}

function meOf(row: UserRow): Me {
  return { id: row.id, email: row.email, ...profileOf(row) };
}

function shareOf(row: UserRow): Share {
  return {
    listed: row.listed === 1,
    showQty: row.show_qty === 1,
    showFills: row.show_fills === 1,
  };
}

class Users {
  constructor(private readonly db: SqlDatabase) {}

  async hasAdmin() {
    const row = await this.db.prepare("SELECT id FROM users LIMIT 1").first<{ id: string }>();
    return Boolean(row);
  }

  async get() {
    return this.db.prepare("SELECT * FROM users LIMIT 1").first<UserRow>();
  }

  async getById(id: string) {
    return this.db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(id).first<UserRow>();
  }

  async findByEmail(email: string) {
    return this.db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").bind(email).first<UserRow>();
  }

  async create(input: { email: string; passwordHash: string; name: string }) {
    const existing = await this.get();
    if (existing) return { error: "admin_exists" as const };
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO users (id, email, password_hash, name, bio, listed, show_qty, show_fills, created_at)
         VALUES (?, ?, ?, ?, '', 0, 0, 1, ?)`,
      )
      .bind(id, input.email, input.passwordHash, input.name, Date.now())
      .run();
    const row = await this.getById(id);
    if (!row) throw new Error("user_create_failed");
    return { user: meOf(row) };
  }

  async updateProfile(
    id: string,
    patch: Partial<{ name: string; bio: string; avatar: string | null; x: string | null; site: string | null; youtube: string | null }>,
  ) {
    const current = await this.getById(id);
    if (!current) return null;
    const next = {
      name: patch.name?.trim() || current.name,
      bio: patch.bio != null ? patch.bio : current.bio,
      avatar: patch.avatar !== undefined ? blank(patch.avatar) : current.avatar,
      x: patch.x !== undefined ? blank(patch.x) : current.x,
      site: patch.site !== undefined ? blank(patch.site) : current.site,
      youtube: patch.youtube !== undefined ? blank(patch.youtube) : current.youtube,
    };
    await this.db
      .prepare("UPDATE users SET name = ?, bio = ?, avatar = ?, x = ?, site = ?, youtube = ? WHERE id = ?")
      .bind(next.name, next.bio, next.avatar, next.x, next.site, next.youtube, id)
      .run();
    const row = await this.getById(id);
    return row ? meOf(row) : null;
  }

  async setShare(id: string, patch: Partial<Share>) {
    const current = await this.getById(id);
    if (!current) return null;
    const listed = patch.listed != null ? (patch.listed ? 1 : 0) : current.listed;
    const showQty = patch.showQty != null ? (patch.showQty ? 1 : 0) : current.show_qty;
    const showFills = patch.showFills != null ? (patch.showFills ? 1 : 0) : current.show_fills;
    await this.db
      .prepare("UPDATE users SET listed = ?, show_qty = ?, show_fills = ? WHERE id = ?")
      .bind(listed, showQty, showFills, id)
      .run();
    const row = await this.getById(id);
    return row ? shareOf(row) : null;
  }

  me(row: UserRow) {
    return meOf(row);
  }

  profile(row: UserRow) {
    return profileOf(row);
  }

  share(row: UserRow) {
    return shareOf(row);
  }
}

export { Users };
