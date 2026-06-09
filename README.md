# CalmMind 🌊

Telegram-бот + Mini App для быстрой помощи при тревоге. Дыхательные упражнения, дневник настроения, техники КПТ и монетизация через Telegram Stars.

## Возможности MVP

### Бот
- `/start` — приветствие и быстрый доступ
- `/sos` — экстренные техники (4-7-8, заземление, дневник)
- `/breathe` — дыхательные упражнения
- `/mood` — запись настроения (1–5) с рекомендациями
- `/progress` — статистика за 7 дней
- Кнопка меню «Приложение CalmMind»
- Оплата Premium через Telegram Stars (XTR)

### Mini App
- Интерактивные дыхательные упражнения с CSS-анимацией
- Техника заземления 5-4-3-2-1
- Дневник мыслей (Telegram Cloud Storage + сервер)
- Статистика и тренд настроения
- Адаптация к теме Telegram (тёмная тема)
- Haptic feedback и MainButton

## Быстрый старт

### 1. Создайте бота

1. Откройте [@BotFather](https://t.me/BotFather)
2. `/newbot` → задайте имя и username (например `@calmmind_bot`)
3. Сохраните токен

### 2. Настройте команды в BotFather

```
start - Начать работу с CalmMind
sos - Экстренная помощь при тревоге
breathe - Дыхательные упражнения
mood - Записать настроение
progress - Статистика за неделю
```

### 3. Установите зависимости

```bash
npm install
```

### 4. Настройте окружение

```bash
cp .env.example .env
```

Заполните `.env`:

```env
BOT_TOKEN=123456:ABC-DEF...
WEBAPP_URL=https://your-domain.com
PORT=3000
PREMIUM_PRICE_STARS=49
```

> **Важно:** `WEBAPP_URL` должен быть HTTPS. Для локальной разработки используйте [ngrok](https://ngrok.com/) или [localtunnel](https://localtunnel.github.io/www/).

### 5. Запуск

**Разработка:**
```bash
npm run dev
```

**Продакшен:**
```bash
npm run build
npm start
```

### 6. Настройте Mini App в BotFather

1. `/mybots` → ваш бот → **Bot Settings** → **Menu Button**
2. Укажите URL: `https://your-domain.com/app/`

Или через API (выполняется автоматически при старте):
- Menu Button → Web App → `Приложение CalmMind`

### 7. Webhook

При запуске сервер автоматически регистрирует webhook:
```
https://your-domain.com/webhook
```

## Структура проекта

```
├── src/
│   ├── index.ts       # Точка входа
│   ├── server.ts      # Express + webhook
│   ├── bot.ts         # Логика бота (grammy)
│   ├── api.ts         # REST API для Mini App
│   ├── auth.ts        # Валидация initData
│   ├── storage.ts     # JSON-хранилище
│   ├── keyboards.ts   # Клавиатуры
│   └── config.ts      # Конфигурация
├── public/app/        # Mini App (статика)
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
└── data/              # Данные пользователей (создаётся автоматически)
```

## API Mini App

Все запросы требуют заголовок `X-Telegram-Init-Data` с `initData` из `Telegram.WebApp`.

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/mood` | Записать настроение |
| POST | `/api/breathing` | Сохранить сессию дыхания |
| GET | `/api/stats` | Статистика за неделю |
| GET | `/api/profile` | Профиль и Premium-статус |

## Монетизация (Stars)

- Бесплатно: SOS-техники, базовое дыхание, дневник, статистика
- Premium (49 Stars/мес): расширенная библиотека, аналитика, экспорт

Оплата через `sendInvoice` с валютой `XTR`. Токен провайдера — пустая строка (требование Telegram для Stars).

## Деплой

### Railway / Render / Fly.io

1. Подключите репозиторий
2. Build: `npm run build`
3. Start: `npm start`
4. Установите переменные окружения из `.env.example`

### VPS (PM2)

```bash
npm run build
pm2 start dist/index.js --name calmmind
```

## Локальная разработка с ngrok

```bash
# Терминал 1
npm run dev

# Терминал 2
ngrok http 3000
```

Скопируйте HTTPS URL в `WEBAPP_URL` и перезапустите сервер.

## Вне области MVP (v1)

- Профессиональная терапия
- Интеграция с Apple Health / Google Fit
- Групповые сессии
- Голосовой контент
- ИИ-анализ речи

## Лицензия

MIT
