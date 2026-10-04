import { z } from "zod";

export const PLACEHOLDER_NAME = /^[A-Z][A-Z0-9_]*$/;

export const PlaceholderType = z.enum(["string", "url", "path", "enum", "boolean"]);

export const Placeholder = z
  .object({
    name: z.string().regex(PLACEHOLDER_NAME).max(32),
    prompt: z.string().min(1).max(120),
    type: PlaceholderType.default("string"),
    default: z.string().optional(),
    secret: z.boolean().default(false),
    pattern: z.string().max(200).optional(),
    options: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((p) => p.type !== "enum" || p.options !== undefined, {
    message: "enum placeholder needs options",
  });

export type Placeholder = z.infer<typeof Placeholder>;
