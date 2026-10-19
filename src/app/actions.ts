"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { passwords } from "@/auth/passwords";
import { sessionStore } from "@/auth/sessions";
import { brokerConnections } from "@/broker/connections";
import { oauthClientStore } from "@/broker/oauth-clients";
import { brokerRegistry } from "@/broker/registry";
import { Database } from "@/db/database";
import { follows, notes, oauthStates, publisherProfiles, sharePolicies, users, webhooks } from "@/db/schema";
import { portfolio } from "@/read/portfolio";
import { syncService } from "@/sync/service";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = credentials.extend({
  handle: z.string().regex(/^[a-z0-9_]{3,20}$/),
  displayName: z.string().trim().min(1).max(40),
});

async function requireUser() {
  const user = await sessionStore.currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    handle: formData.get("handle"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) redirect("/login?error=register");
  const db = Database.current();
  const email = parsed.data.email.toLowerCase();
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  const handleTaken = db.select().from(publisherProfiles).where(eq(publisherProfiles.handle, parsed.data.handle)).get();
  if (existing || handleTaken) redirect("/login?error=taken");
  const { hash, salt } = await passwords.hash(parsed.data.password);
  const userId = crypto.randomUUID();
  db.insert(users).values({ id: userId, email, passwordHash: hash, passwordSalt: salt, createdAt: Date.now() }).run();
  db.insert(publisherProfiles)
    .values({ userId, handle: parsed.data.handle, displayName: parsed.data.displayName, bio: "" })
    .run();
  db.insert(sharePolicies).values({ userId, audience: "public", showCost: 0, showFillPrice: 0, showFillQty: 0, delayMinutes: 0 }).run();
  await sessionStore.create(userId);
  redirect("/publisher");
}

export async function loginAction(formData: FormData) {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=login");
  const user = Database.current().select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).get();
  if (!user || !(await passwords.verify(parsed.data.password, user.passwordSalt, user.passwordHash))) {
    redirect("/login?error=login");
  }
  await sessionStore.create(user.id);
  redirect("/publisher");
}

export async function logoutAction() {
  await sessionStore.destroy();
  redirect("/");
}

async function callbackUrl() {
  if (process.env.FUTU_REDIRECT_URI) return process.env.FUTU_REDIRECT_URI;
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/oauth/futu/callback`;
}

export async function startFutuAuth() {
  const user = await requireUser();
  const broker = brokerRegistry.get("futu");
  let client;
  try {
    client = await oauthClientStore.ensure(broker, await callbackUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "向富途注册应用失败";
    redirect(`/publisher/broker?error=${encodeURIComponent(message)}`);
  }
  const authorization = broker.createAuthorization(client.clientId, client.redirectUri);
  Database.current()
    .insert(oauthStates)
    .values({
      state: authorization.state,
      userId: user.id,
      codeVerifier: authorization.verifier,
      expiresAt: Date.now() + 10 * 60 * 1000,
    })
    .run();
  redirect(authorization.url);
}

export async function completeFutuAuth(code: string, state: string) {
  const db = Database.current();
  const saved = db.select().from(oauthStates).where(eq(oauthStates.state, state)).get();
  if (!saved || saved.expiresAt < Date.now()) {
    db.delete(oauthStates).where(eq(oauthStates.state, state)).run();
    redirect("/publisher/broker?error=state");
  }
  const broker = brokerRegistry.get("futu");
  const client = oauthClientStore.get(broker.id);
  if (!client) redirect("/publisher/broker?error=client");
  try {
    const token = await broker.exchangeCode(code, saved.codeVerifier, client.clientId, client.redirectUri);
    const accounts = await broker.listAccounts(token.accessToken);
    brokerConnections.saveAuthorization(saved.userId, broker.id, token, accounts);
    db.delete(oauthStates).where(eq(oauthStates.state, state)).run();
  } catch (error) {
    db.delete(oauthStates).where(eq(oauthStates.state, state)).run();
    const message = error instanceof Error ? error.message : "换取富途授权失败";
    redirect(`/publisher/broker?error=${encodeURIComponent(message)}`);
  }
  redirect("/publisher/broker");
}

export async function saveAccountsAction(formData: FormData) {
  const user = await requireUser();
  const selected = new Set(formData.getAll("account").map(String));
  const { connection } = brokerConnections.forUser(user.id, "futu");
  if (!connection) redirect("/publisher/broker?error=connect");
  brokerConnections.setIncluded(connection.id, selected);
  if (selected.size > 0) await syncService.sync(connection.id).catch(() => undefined);
  redirect("/publisher");
}

export async function saveShareAction(formData: FormData) {
  const user = await requireUser();
  const audience = formData.get("audience") === "followers" ? "followers" : "public";
  Database.current()
    .update(sharePolicies)
    .set({
      audience,
      subscribeAmount: /^\d+(\.\d{1,2})?$/.test(String(formData.get("subscribeAmount") ?? "").trim())
        ? String(formData.get("subscribeAmount")).trim()
        : "0",
    })
    .where(eq(sharePolicies.userId, user.id))
    .run();
  redirect("/publisher/share");
}

export async function saveNoteAction(formData: FormData) {
  const user = await requireUser();
  const activityId = String(formData.get("activityId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!activityId || !body) redirect("/publisher/activity");
  const db = Database.current();
  const existing = db.select().from(notes).where(eq(notes.activityId, activityId)).get();
  if (existing) {
    db.update(notes).set({ body }).where(eq(notes.id, existing.id)).run();
  } else {
    db.insert(notes).values({ id: crypto.randomUUID(), activityId, userId: user.id, body, createdAt: Date.now() }).run();
  }
  redirect("/publisher/activity");
}

export async function followAction(formData: FormData) {
  const user = await requireUser();
  const publisherId = String(formData.get("publisherId") ?? "");
  if (!publisherId || publisherId === user.id) redirect("/");
  const db = Database.current();
  const month = 30 * 24 * 60 * 60 * 1000;
  const existing = db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.publisherId, publisherId)))
    .get();
  if (formData.get("intent") === "cancel") {
    db.delete(follows).where(and(eq(follows.followerId, user.id), eq(follows.publisherId, publisherId))).run();
  } else if (existing) {
    const start = existing.expiresAt > Date.now() ? existing.expiresAt : Date.now();
    db.update(follows).set({ expiresAt: start + month }).where(and(eq(follows.followerId, user.id), eq(follows.publisherId, publisherId))).run();
  } else {
    db.insert(follows).values({ followerId: user.id, publisherId, createdAt: Date.now(), expiresAt: Date.now() + month }).run();
  }
  const profile = db.select().from(publisherProfiles).where(eq(publisherProfiles.userId, publisherId)).get();
  redirect(profile ? `/p/${profile.handle}` : "/");
}

export async function saveWebhookAction(formData: FormData) {
  const user = await requireUser();
  const publisherId = String(formData.get("publisherId") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const parsed = z.string().url().safeParse(url);
  const profile = Database.current().select().from(publisherProfiles).where(eq(publisherProfiles.userId, publisherId)).get();
  const back = profile ? `/p/${profile.handle}` : "/";
  if (!parsed.success || !portfolio.subscribed(publisherId, user.id) || publisherId === user.id) redirect(back);
  const protocol = new URL(parsed.data).protocol;
  if (protocol !== "https:" && protocol !== "http:") redirect(back);
  Database.current()
    .insert(webhooks)
    .values({ id: crypto.randomUUID(), followerId: user.id, publisherId, url: parsed.data, createdAt: Date.now() })
    .run();
  redirect(back);
}
