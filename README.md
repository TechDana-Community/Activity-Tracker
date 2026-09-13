# 🚀 TechDana Activity Tracker (سامانه رتبه‌بندی اعضای تک‌دانا)

<div align="center">

![TechDana Banner](https://raw.githubusercontent.com/TechDana-Community/Activity-Tracker/main/public/favicon.ico)

### **باشگاه برنامه‌نویسان تک دانا | TechDana Coders Club**

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-Native%20node%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-28%20Passing-success?logo=checkmarx&logoColor=white)](#-تست‌ها-و-کیفیت-کد)
[![Official Link](https://img.shields.io/badge/Bio--Link-zil.ink%2Ftd__iaun-FF6A00)](https://zil.ink/td_iaun)

<p align="center">
  <b>سامانه پایش هوشمند، رتبه‌بندی و رهگیری زنده فعالیت‌های گیت‌هاب اعضای جامعه تک‌دانا</b>
</p>

[ویژگی‌ها](#-ویژگی‌های-کلیدی) • [نصب و راه‌اندازی](#-راهنمای-نصب-و-اجرای-محلی) • [معماری](#-معماری-سیستم) • [متغیرهای محیطی](#-تنظیمات-محیطی-env) • [تست‌ها](#-تست‌ها-و-کیفیت-کد)

</div>

---

## 📖 درباره پروژه (About the Project)

**TechDana Activity Tracker** یک داشبورد مدرن، تعاملی و پرسرعت برای جامعه برنامه‌نویسان دانشگاه آزاد اسلامی نجف‌آباد است. این سامانه با ارتباط مستقیم با **GitHub API**، کامیت‌ها، فعالیت‌های تداومی (Streak Days) و امتیازات اعضا را در یک پایگاه داده مشترک تجمیع و رتبه‌بندی می‌کند.

---

## ✨ ویژگی‌های کلیدی (Key Features)

- ⚡ **رصد زنده از طریق GitHub GraphQL API**: استخراج دقیق تقویم ۳۶۵ روزه مشارکت‌ها (`contributionCalendar`) با محاسبه دقیق روزهای متوالی فعالیت (Streak).
- 🏆 **الگوریتم ضد دستکاری امتیاز (Anti-Gaming Scoring)**:
  $$\text{Total Score} = (\text{Commits} \times 1) + (\text{Streak Days} \times 5)$$
  *تشویق اعضا به استمرار روزانه در برنامه‌نویسی به‌جای کامیت‌های انبوه تک‌روزه.*
- 🛡️ **جداسازی مسیرها و امنیت ادمین**:
  - رتبه‌بندی عمومی در روت `/` (بدون نیاز به لاگین)
  - پنل مدیریت در روت `/admin` محافظت‌شده با **رمز عبور/PIN اختصاصی** و اعتبارسنجی Bearer Token در سمت سرور.
- 🔄 **موتور همگام‌سازی خودکار و دستی (Sync Engine)**:
  - ورکر پس‌زمینه خودکار در بازه‌های منظم
  - دکمه بروزرسانی زنده تمام اعضا همراه با قفل همزمانی (Mutex Lock) و محافظت ضداسپم ۶۰ ثانیه‌ای (Cooldown).
  - عایق‌بندی خطای اعضا (اگر اکانت یک دانشجو نامعتبر باشد، پردازش بقیه متوقف نمی‌شود).
- 💾 **پایگاه‌داده داخلی بومی (`node:sqlite`)**:
  - بدون نیاز به نصب پکیج‌های حجیم سنگین خارجی و باینری‌های کامپایلری.
  - داده‌ها در `./data/leaderboard.db` ماندگار هستند و با ری‌استارت سرور پاک نمی‌شوند.
- 🌐 **پشتیبانی دو زبانه و طراحی واکنش‌گرا**:
  - فارسی (RTL راست‌به‌چپ با فونت وزیرمتن) و انگلیسی (LTR).
  - انیمیشن‌های روان و استایل لوکس با پالت اختصاصی برند تک‌دانا (Navy Blue `#0D2146` و Vibrant Orange `#FF6A00`).

---

## 🛠 معماری و تکنولوژی‌ها (Tech Stack)

| لایه | تکنولوژی‌های به‌کار رفته |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, React Router DOM v7, Tailwind CSS v4, Lucide React |
| **Backend** | Node.js 24, Express, `node:sqlite` (بومی), Vite Dev Middleware |
| **API Ingestion** | GitHub GraphQL API (365-day calendar) + REST API Fallback Proxy |
| **Testing** | Node Native Test Runner (`tsx --test`) با ایزولاسیون کامل دیتابیس حافظه‌ای |
| **Build & Bundle** | Vite (Client) + esbuild (Server CJS Bundle) |

---

## 🚀 راهنمای نصب و اجرای محلی (Quick Start)

### پیش‌نیازها
- **Node.js**: نسخه 22.x یا جدیدتر (پیشنهاد می‌شود: Node 24+)
- **npm** یا **pnpm** یا **bun**

### گام‌های راه‌اندازی

1. **کلون کردن مخزن:**
   ```bash
   git clone https://github.com/TechDana-Community/Activity-Tracker.git
   cd Activity-Tracker
   ```

2. **نصب وابستگی‌ها:**
   ```bash
   npm install
   ```

3. **تنظیم متغیرهای محیطی:**
   یک فایل `.env` بر اساس نمونه بسازید:
   ```bash
   cp .env.example .env
   ```
   مقادیر زیر را در فایل `.env` بررسی و تنظیم کنید:
   ```env
   PORT=3000
   ADMIN_SECRET_KEY="techdana2026"
   GITHUB_TOKEN="your_personal_access_token" # اختیاری جهت افزایش لیمیت گیت‌هاب تا ۵۰۰۰ ریکوئست
   ```

4. **اجرای سرور توسعه (Development):**
   ```bash
   npm run dev
   ```
   سپس مرورگر خود را باز کرده و به آدرس [http://localhost:3000](http://localhost:3000) مراجعه کنید.

---

## 🧪 تست‌ها و کیفیت کد (Testing & Verification)

این پروژه با متدولوژی تست‌محور (TDD) پیاده‌سازی شده و تمام سناریوهای دیتابیس، امنیت، موتور سینک و ارتباط با گیت‌هاب دارای تست‌های خودکار هستند:

```bash
# اجرای کل سوئیت تست‌های بک‌اند (۲۸ تست کامل)
npm test

# اعتبارسنجی استاتیک تایپ‌ها
npm run lint

# تست بیلد نهایی پروداکشن
npm run build
```

---

## 📁 ساختار پوشه‌ها (Directory Structure)

```text
├── data/                     # مسیر دیتابیس محلی SQLite (مستثنی در .gitignore)
├── server/
│   ├── __tests__/            # سوئیت تست‌های جامع TDD (db, api, auth, github, sync)
│   ├── services/
│   │   ├── github.ts         # کلاینت GraphQL تقویم ۳۶۵ روزه و الگوریتم Streak
│   │   ├── scheduler.ts      # اسکژولر خودکار پس‌زمینه
│   │   └── sync.ts           # هماهنگ‌کننده همگام‌سازی با Mutex و Cooldown
│   └── db.ts                 # ماژول دیتابیس SQLite و ریپازیتوری دانشجویان
├── src/
│   ├── components/           # کامپوننت‌های فرانت‌اند (Leaderboard, AdminView, AdminGateModal, ...)
│   ├── services/api.ts       # کلاینت REST فرانت‌اند و مدیریت نشست توکن در sessionStorage
│   ├── types.ts              # تایپ‌های یکپارچه TypeScript
│   └── App.tsx               # روت‌های اپلیکیشن (React Router)
├── server.ts                 # سرور Express، میدل‌ویر احراز هویت و ادغام با Vite
└── package.json
```

---

## 🤝 مشارکت و کامیونیتی (Community & Contribution)

این مخزن برای توسعه باز اعضای **باشگاه برنامه‌نویسان تک‌دانا** ایجاد شده است.
- 🔗 برای عضویت در کانال‌ها و گروه‌های جامعه، به درگاه ارتباطی ما سر بزنید: **[zil.ink/td_iaun](https://zil.ink/td_iaun)**
- 💡 برای ارسال باگ یا پیشنهاد قابلیت جدید، یک **Issue** جدید ایجاد کنید یا از طریق **Pull Request** کد خود را ارسال فرمایید.

---

<div align="center">
  <b>توسعه‌داده‌شده با افتخار برای اعضای تک دانا 🧡</b><br>
  دانشگاه آزاد اسلامی واحد نجف‌آباد (IAUN)
</div>
