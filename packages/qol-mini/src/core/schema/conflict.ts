import { z } from "zod";

// How an update treats a file edited locally
export const ConflictMode = z.enum(["inline", "rej", "ours", "theirs"]);

export type ConflictMode = z.infer<typeof ConflictMode>;
