import {
  attachSessionCookie,
  clearSession,
  createSession,
  optionalAuth,
  requireAuth,
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  sessionKey,
} from "./auth";
import type { AuthEnv, SessionRecord } from "./auth";
import { requirePublisher } from "./publisher";
import type { PublisherEnv } from "./publisher";

export {
  attachSessionCookie,
  clearSession,
  createSession,
  optionalAuth,
  requireAuth,
  requirePublisher,
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  sessionKey,
};
export type { AuthEnv, PublisherEnv, SessionRecord };
