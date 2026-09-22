import { z } from "zod";

export const updateAccountSchema = z.object({
  name: z.string().trim().min(2, "Namnet måste ha minst två tecken.").max(100, "Namnet får ha högst 100 tecken."),
}).strict();
