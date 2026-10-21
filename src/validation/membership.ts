import { z } from "zod";
import { objectIdSchema } from "./organization";

export const memberRoleSchema = z.enum(["admin", "warehouse"]);
export const invitationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, "Ogiltig inbjudningslänk.");
export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ange en giltig e-postadress.").max(254),
  role: memberRoleSchema,
}).strict();
export const invitationIdSchema = objectIdSchema;
