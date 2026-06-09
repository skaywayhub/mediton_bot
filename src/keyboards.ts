import { InlineKeyboard, Keyboard } from "grammy";
import { config } from "./config";

export function mainReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text("🆘 SOS — Мне тревожно")
    .text("🌬 Дыхание")
    .row()
    .text("😊 Настроение")
    .text("📊 Прогресс")
    .resized();
}

export function welcomeInline(webappUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🆘 SOS — Мне тревожно сейчас", "sos")
    .row()
    .webApp("📱 Открыть приложение", `${webappUrl}/app/`)
    .row()
    .text("✨ Начать", "onboarding_start");
}

export function sosInline(webappUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("🌬 Дыхание 4-7-8", `${webappUrl}/app/#breathe-478`)
    .row()
    .webApp("🌍 Техника заземления", `${webappUrl}/app/#grounding`)
    .row()
    .webApp("📔 Открыть дневник", `${webappUrl}/app/#journal`)
    .row()
    .webApp("📱 Подробнее в приложении", `${webappUrl}/app/`);
}

export function breatheInline(webappUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("4-7-8 (SOS)", `${webappUrl}/app/#breathe-478`)
    .webApp("Коробочное 4-4-4", `${webappUrl}/app/#breathe-box`)
    .row()
    .webApp("Все упражнения", `${webappUrl}/app/#breathe`);
}

export function moodInline(): InlineKeyboard {
  return new InlineKeyboard()
    .text("😰 1", "mood_1")
    .text("😟 2", "mood_2")
    .text("😐 3", "mood_3")
    .text("🙂 4", "mood_4")
    .text("😊 5", "mood_5");
}

export function afterMoodInline(webappUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp("📔 Записать в дневник", `${webappUrl}/app/#journal`)
    .row()
    .webApp("🌬 Дыхательное упражнение", `${webappUrl}/app/#breathe`)
    .row()
    .text("📊 Мой прогресс", "progress");
}

export function miniAppInline(webappUrl: string, hash = ""): InlineKeyboard {
  return new InlineKeyboard().webApp(
    "📱 Открыть приложение CalmMind",
    `${webappUrl}/app/${hash}`
  );
}

export function premiumInline(): InlineKeyboard {
  return new InlineKeyboard().text(
    `⭐ Премиум — ${config.premiumPriceStars} Stars/мес`,
    "buy_premium"
  );
}
