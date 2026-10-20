import { z } from "zod";

const market = z.enum(["us", "hk"]);

const applyBody = z.object({
  markets: z.array(market).min(1),
  note: z.string().max(500).optional(),
});

const shareBody = z
  .object({
    listed: z.boolean().optional(),
    price: z.number().int().min(1).max(999).optional(),
  })
  .refine((value) => value.listed != null || value.price != null);

export { applyBody, shareBody };
