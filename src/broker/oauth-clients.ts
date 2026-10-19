import { eq } from "drizzle-orm";
import type { Broker } from "./broker";
import { Database } from "@/db/database";
import { oauthClients } from "@/db/schema";
import { tokenVault } from "@/token/vault";

export class OAuthClients {
  async ensure(broker: Broker, redirectUri: string) {
    const db = Database.current();
    const existing = db.select().from(oauthClients).where(eq(oauthClients.broker, broker.id)).get();
    if (existing?.redirectUri === redirectUri) return existing;
    const registered = await broker.register(redirectUri);
    const values = {
      clientId: registered.clientId,
      redirectUri,
      registrationAccessTokenEnc: registered.registrationAccessToken
        ? tokenVault.encrypt(registered.registrationAccessToken)
        : "",
    };
    if (existing) {
      db.update(oauthClients).set(values).where(eq(oauthClients.broker, broker.id)).run();
    } else {
      db.insert(oauthClients).values({ broker: broker.id, ...values }).run();
    }
    return { ...values, broker: broker.id };
  }

  get(brokerId: string) {
    return Database.current().select().from(oauthClients).where(eq(oauthClients.broker, brokerId)).get() ?? null;
  }
}

export const oauthClientStore = new OAuthClients();
