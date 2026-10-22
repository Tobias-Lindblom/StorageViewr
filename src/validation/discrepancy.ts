import { z } from "zod";

export const discrepancyActionSchema = z.object({
  action: z.enum(["INVESTIGATE", "APPROVE", "RESOLVE"]),
  comment: z.string().trim().max(500).default(""),
}).strict().superRefine((value, context) => {
  if ((value.action === "INVESTIGATE" || value.action === "RESOLVE") && value.comment.length < 2)
    context.addIssue({ code: "custom", path: ["comment"], message: "Lägg till en kort kommentar." });
});
