import { z } from "zod";

const connectBody = z.object({
  broker: z.enum(["futu"]).optional(),
});

const accountsBody = z.object({
  ids: z.array(z.string().min(1).max(64)).max(50),
});

export { accountsBody, connectBody };
