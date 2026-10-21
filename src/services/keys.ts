import { Snaptrade } from "../brokerage/snaptrade";
import type { Deps } from "../deps";
import { decryptSecret, encryptSecret } from "../lib/secret";

type SettingsRow = {
  snaptrade_client_id_enc: string | null;
  snaptrade_consumer_key_enc: string | null;
};

class Keys {
  constructor(private readonly deps: Deps) {}

  static from(deps: Deps) {
    return new Keys(deps);
  }

  async client() {
    const pair = await this.read();
    if (!pair) return null;
    return Snaptrade.of(pair.clientId, pair.consumerKey);
  }

  async publicView() {
    const pair = await this.read();
    return { configured: Boolean(pair), clientId: pair?.clientId ?? "" };
  }

  async save(input: { clientId: string; consumerKey?: string }) {
    if (!this.deps.tokenKey) return { error: "snaptrade_unconfigured" as const };
    const current = await this.read();
    const clientId = input.clientId.trim();
    const consumerKey = input.consumerKey?.trim() || current?.consumerKey || "";
    if (!clientId || !consumerKey) return { error: "snaptrade_unconfigured" as const };
    const now = Date.now();
    const clientEnc = await encryptSecret(clientId, this.deps.tokenKey);
    const consumerEnc = await encryptSecret(consumerKey, this.deps.tokenKey);
    await this.deps.database
      .prepare(
        `INSERT INTO settings (id, snaptrade_client_id_enc, snaptrade_consumer_key_enc, updated_at)
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           snaptrade_client_id_enc = excluded.snaptrade_client_id_enc,
           snaptrade_consumer_key_enc = excluded.snaptrade_consumer_key_enc,
           updated_at = excluded.updated_at`,
      )
      .bind(clientEnc, consumerEnc, now)
      .run();
    return { configured: true, clientId };
  }

  private async read() {
    if (!this.deps.tokenKey) return null;
    const row = await this.deps.database
      .prepare("SELECT snaptrade_client_id_enc, snaptrade_consumer_key_enc FROM settings WHERE id = 1 LIMIT 1")
      .first<SettingsRow>();
    if (!row?.snaptrade_client_id_enc || !row.snaptrade_consumer_key_enc) return null;
    try {
      return {
        clientId: await decryptSecret(row.snaptrade_client_id_enc, this.deps.tokenKey),
        consumerKey: await decryptSecret(row.snaptrade_consumer_key_enc, this.deps.tokenKey),
      };
    } catch {
      return null;
    }
  }
}

export { Keys };
