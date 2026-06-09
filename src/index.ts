import { startServer } from "./server";

startServer().catch((err) => {
  console.error("Failed to start CalmMind:", err);
  process.exit(1);
});
