import { z } from "zod";

const handle = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/);

const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8).max(128);

const registerBody = z
  .object({
    handle,
    email,
    password,
    confirm: z.string().optional(),
  })
  .refine((value) => value.confirm == null || value.confirm === value.password, {
    path: ["confirm"],
    message: "password_mismatch",
  });

const loginBody = z.object({
  email,
  password,
});

const patchProfileBody = z
  .object({
    name: z.string().trim().min(1).max(24).optional(),
    bioZh: z.string().max(280).optional(),
    bioEn: z.string().max(280).optional(),
  })
  .refine((value) => value.name != null || value.bioZh != null || value.bioEn != null);

export { loginBody, patchProfileBody, registerBody };
