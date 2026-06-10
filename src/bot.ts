import { Bot, Context, InlineKeyboard, webhookCallback } from "grammy";
import { config } from "./config";
import {
  afterMoodInline,
  breatheInline,
  mainReplyKeyboard,
  miniAppInline,
  moodInline,
  premiumInline,
  sosInline,
  welcomeInline,
} from "./keyboards";
import {
  activatePremium,
  addMoodEntry,
  getMoodRecommendation,
  getOrCreateUser,
  getWeekStats,
  isPremiumActive,
} from "./storage";

const MOOD_EMOJI = ["😰", "😟", "😐", "🙂", "😊"];

function moodBar(scores: number[]): string {
  if (scores.length === 0) return "Пока нет записей за неделю";
  return scores.map((s) => MOOD_EMOJI[s - 1] || "❓").join(" ");
}

function progressCard(userId: number): string {
  const stats = getWeekStats(userId);
  const premium = isPremiumActive(userId);

  let card = `📊 *Твой прогресс за 7 дней*\n\n`;
  card += `Среднее настроение: *${stats.avgMood || "—"}*/5\n`;
  card += `Дыхательных сессий: *${stats.totalSessions}*\n`;
  card += `Тренд: ${moodBar(stats.moodTrend)}\n`;

  if (stats.topTechnique) {
    card += `\n💡 Лучше всего помогает: *${stats.topTechnique}*`;
  }

  if (!premium) {
    card += `\n\n⭐ _Премиум открывает подробную аналитику и 20+ техник_`;
  }

  return card;
}

export function createBot(): Bot {
  const bot = new Bot(config.botToken);

  bot.api.setMyCommands([
    { command: "start", description: "Начать работу с CalmMind" },
    { command: "sos", description: "Экстренная помощь при тревоге" },
    { command: "breathe", description: "Дыхательные упражнения" },
    { command: "mood", description: "Записать настроение" },
    { command: "progress", description: "Статистика за неделю" },
  ]);

  bot.command("start", async (ctx) => {
    const user = ctx.from;
    if (!user) return;

    getOrCreateUser(user.id, user.username, user.first_name);

    await ctx.reply(
      `🌊 *Добро пожаловать в CalmMind*\n\n` +
        `Твой персональный помощник в борьбе с тревогой .\n\n` +
        `Здесь ты найдёшь:\n` +
        `• 🆘 SOS-техники для моментов паники\n` +
        `• 🌬 Дыхательные упражнения с анимацией\n` +
        `• 📔 Дневник настроения и мыслей\n` +
        `• 📊 Отслеживание прогресса\n\n` +
        `_Выбери действие или открой приложение:_`,
      {
        parse_mode: "Markdown",
        reply_markup: welcomeInline(config.webappUrl),
      }
    );

    await ctx.reply("Быстрый доступ:", {
      reply_markup: mainReplyKeyboard(),
    });
  });

  bot.command("sos", async (ctx) => {
    await sendSos(ctx);
  });

  bot.command("breathe", async (ctx) => {
    await ctx.reply(
      `🌬 *Дыхательные упражнения*\n\n` +
        `Выбери технику — откроется интерактивная анимация в приложении:`,
      {
        parse_mode: "Markdown",
        reply_markup: breatheInline(config.webappUrl),
      }
    );
  });

  bot.command("mood", async (ctx) => {
    await sendMoodPrompt(ctx);
  });

  bot.command("progress", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await sendProgress(ctx, user.id);
  });

  bot.hears("🆘 SOS — Мне тревожно", async (ctx) => sendSos(ctx));
  bot.hears("🌬 Дыхание", async (ctx) => {
    await ctx.reply("Выбери дыхательную технику:", {
      reply_markup: breatheInline(config.webappUrl),
    });
  });
  bot.hears("😊 Настроение", async (ctx) => sendMoodPrompt(ctx));
  bot.hears("📊 Прогресс", async (ctx) => {
    const user = ctx.from;
    if (!user) return;
    await sendProgress(ctx, user.id);
  });

  bot.callbackQuery("onboarding_start", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `Как ты себя чувствуешь прямо сейчас? (1 — очень тревожно, 5 — спокойно)`,
      { reply_markup: moodInline() }
    );
  });

  bot.callbackQuery("sos", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Помощь рядом 💙" });
    await sendSos(ctx);
  });

  bot.callbackQuery(/^mood_(\d)$/, async (ctx) => {
    const score = parseInt(ctx.match[1], 10);
    const user = ctx.from;
    if (!user) return;

    await ctx.answerCallbackQuery();

    getOrCreateUser(user.id, user.username, user.first_name);
    addMoodEntry({
      id: `${Date.now()}-${user.id}`,
      userId: user.id,
      score,
      timestamp: new Date().toISOString(),
    });

    await ctx.api.sendChatAction(ctx.chat!.id, "typing");
    await new Promise((r) => setTimeout(r, 1500));

    const recommendation = getMoodRecommendation(user.id);
    const emoji = MOOD_EMOJI[score - 1];

    await ctx.editMessageText(
      `${emoji} Записано: *${score}/5*\n\n` +
        `💭 _Анализирую твои паттерны..._\n\n` +
        `🎯 *Рекомендация:*\n${recommendation}`,
      {
        parse_mode: "Markdown",
        reply_markup: afterMoodInline(config.webappUrl),
      }
    );
  });

  bot.callbackQuery("progress", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = ctx.from;
    if (!user) return;
    await sendProgress(ctx, user.id, true);
  });

  bot.callbackQuery("buy_premium", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendPremiumInvoice(ctx);
  });

  bot.on("pre_checkout_query", async (ctx) => {
    await ctx.answerPreCheckoutQuery(true);
  });

  bot.on("message:successful_payment", async (ctx) => {
    const user = ctx.from;
    if (!user) return;

    activatePremium(user.id, 1);
    await ctx.reply(
      `⭐ *Премиум активирован!*\n\n` +
        `Теперь доступны:\n` +
        `• 20+ техник КПТ\n` +
        `• Подробная аналитика настроения\n` +
        `• Экспорт данных\n` +
        `• Персональные рекомендации\n\n` +
        `Спасибо за поддержку 💙`,
      {
        parse_mode: "Markdown",
        reply_markup: miniAppInline(config.webappUrl, "#premium"),
      }
    );
  });

  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  return bot;
}

async function sendSos(ctx: Context): Promise<void> {
  await ctx.reply(
    `🆘 *Ты не один/одна. Давай успокоимся вместе.*\n\n` +
      `Выбери технику — каждая занимает 1–3 минуты:\n\n` +
      `🌬 *4-7-8* — вдох 4 сек, задержка 7, выдох 8\n` +
      `🌍 *Заземление 5-4-3-2-1* — верни внимание в настоящее\n` +
      `📔 *Дневник* — выпиши навязчивые мысли\n\n` +
      `_Дыши медленно. Ты в безопасности._`,
    {
      parse_mode: "Markdown",
      reply_markup: sosInline(config.webappUrl),
    }
  );
}

async function sendMoodPrompt(ctx: Context): Promise<void> {
  await ctx.reply(
    `😊 *Как твоё настроение?*\n\nОцени от 1 (очень тревожно) до 5 (спокойно):`,
    {
      parse_mode: "Markdown",
      reply_markup: moodInline(),
    }
  );
}

async function sendProgress(
  ctx: Context,
  userId: number,
  asNewMessage = false
): Promise<void> {
  const text = progressCard(userId);
  const markup = new InlineKeyboard()
    .webApp("📱 Подробнее в приложении", `${config.webappUrl}/app/#stats`)
    .row()
    .text("⭐ Премиум", "buy_premium");

  if (asNewMessage) {
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: markup });
  } else {
    await ctx.reply(text, { parse_mode: "Markdown", reply_markup: markup });
  }
}

async function sendPremiumInvoice(ctx: Context): Promise<void> {
  const user = ctx.from;
  if (!user) return;

  if (isPremiumActive(user.id)) {
    await ctx.reply("⭐ У тебя уже активен премиум!");
    return;
  }

  await ctx.replyWithInvoice(
    "CalmMind Premium",
    "Расширенная библиотека техник, аналитика настроения, экспорт данных и персональные рекомендации на 1 месяц.",
    `premium-${user.id}-${Date.now()}`,
    "XTR",
    [{ label: "Premium 1 месяц", amount: config.premiumPriceStars }],
    {
      provider_token: "",
      photo_url: `${config.webappUrl}/app/assets/wave.svg`,
    }
  );
}

export async function setupBotMenu(bot: Bot): Promise<void> {
  await bot.api.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: "Приложение CalmMind",
      web_app: { url: `${config.webappUrl}` },
    },
  });
}

export function createWebhookHandler(bot: Bot) {
  return webhookCallback(bot, "express");
}
