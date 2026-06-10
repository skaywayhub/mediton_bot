import express from "express";
import path from "path";
import apiRouter from "./api";
import { createBot, createWebhookHandler, setupBotMenu } from "./bot";
import { config } from "./config";

export async function createServer() {
  const app = express();
  const bot = createBot();

  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), "public")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "calmmind" });
  });

  app.use("/api", apiRouter);

  const webhookHandler = createWebhookHandler(bot);
  app.use(config.webhookPath, webhookHandler);

  app.get("/", (_req, res) => {
    res.redirect("/app/");
  });

  return { app, bot };
}

export async function startServer() {
  const { app, bot } = await createServer();

  await setupBotMenu(bot);

  const baseUrl =
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    "https://meditonbot-production.up.railway.app";
  
  const webhookUrl = `${baseUrl}${config.webhookPath}`;
  
  await bot.api.setWebhook(webhookUrl, {
    allowed_updates: [
      "message",
      "callback_query",
      "pre_checkout_query",
    ],
  });
  
  console.log(`Webhook set: ${webhookUrl}`);
  
  const PORT = parseInt(process.env.PORT || "3000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
  console.log(`CalmMind running`);
  console.log(`Mini App: ${config.webappUrl}`);
});
}