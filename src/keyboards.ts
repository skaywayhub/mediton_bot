import { InlineKeyboard, Keyboard } from "grammy";
import { config } from "./config";

const webappUrl = config.webappUrl;

export function mainReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text("🆘 SOS — Мне тревожно")
    .text("🌬 Дыхание")
    .row()
    .text("😊 Настроение")
    .text("📊 Прогресс")
    .resized();
}

export function welcomeInline(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🆘 SOS — Мне тревожно сейчас", "sos")
    .row()
    .webApp("📱 Открыть приложение", webappUrl)
    .row()
    .text("✨ Начать", "onboarding_start");
}

export function sosInline(): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("🌬 Дыхание", webappUrl)
    .row()
    .webApp("🌍 Заземление", webappUrl)
    .row()
    .webApp("📔 Дневник", webappUrl)
    .row()
    .webApp("📱 Открыть приложение", webappUrl);
}

export function breatheInline(): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("🌬 Начать дыхание", webappUrl)
    .row()
    .webApp("4-7-8 техника", webappUrl)
    .webApp("Коробочное дыхание", webappUrl)
    .row()
    .webApp("Все упражнения", webappUrl);
}

export function moodInline(): InlineKeyboard {
  return new InlineKeyboard()
    .text("😰 1", "mood_1")
    .text("😟 2", "mood_2")
    .text("😐 3", "mood_3")
    .text("🙂 4", "mood_4")
    .text("😊 5", "mood_5");
}

export function afterMoodInline(): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("📔 Открыть дневник", webappUrl)
    .row()
    .webApp("🌬 Дыхание", webappUrl)
    .row()
    .text("📊 Мой прогресс", "progress");
}

export function miniAppInline(): InlineKeyboard {
  return new InlineKeyboard().webApp(
    "📱 Открыть CalmMind",
    webappUrl
  );
}

export function premiumInline(): InlineKeyboard {
  return new InlineKeyboard().text(
    `⭐ Премиум — ${config.premiumPriceStars} Stars/мес`,
    "buy_premium"
  );
}