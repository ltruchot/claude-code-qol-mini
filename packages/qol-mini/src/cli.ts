#!/usr/bin/env node
import { main } from "./app.ts";

// A reader that closes the pipe early, `| head`, is not an error
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code !== "EPIPE") throw error;
});

process.exitCode = await main(process.argv);
