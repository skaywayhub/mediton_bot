import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  botToken: requireEnv("BOT_TOKEN"),
  webappUrl: requireEnv("WEBAPP_URL").replace(/\/$/, ""),
  webhookPath: process.env.WEBHOOK_PATH || "/webhook",
  port: parseInt(process.env.PORT || "3000", 10),
  premiumPriceStars: parseInt(process.env.PREMIUM_PRICE_STARS || "49", 10),
};
