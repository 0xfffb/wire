import { z } from "zod";

const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8).max(128);
const link = z.string().trim().max(300).nullable();

const setupBody = z
  .object({
    email,
    password,
    confirm: z.string(),
  })
  .refine((value) => value.confirm === value.password, {
    path: ["confirm"],
    message: "password_mismatch",
  });

const loginBody = z.object({
  email,
  password,
});

const profileBody = z.object({
  name: z.string().trim().min(1).max(24).optional(),
  bio: z.string().max(280).optional(),
  avatar: link.optional(),
  x: link.optional(),
  site: link.optional(),
  youtube: link.optional(),
});

const shareBody = z
  .object({
    listed: z.boolean().optional(),
    showQty: z.boolean().optional(),
    showFills: z.boolean().optional(),
  })
  .refine((value) => value.listed != null || value.showQty != null || value.showFills != null);

const accountBody = z.object({
  accountId: z.string().min(1).max(64),
});

const keysBody = z.object({
  clientId: z.string().trim().min(1).max(200),
  consumerKey: z.string().trim().max(500).optional(),
});

export { accountBody, keysBody, loginBody, profileBody, setupBody, shareBody };
