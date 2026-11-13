# Converter

Офлайн-конвертер изображений: Angular 22 (standalone, zoneless, signals) + Tailwind CSS 4 + PWA.
Вся обработка идёт в браузере пользователя, файлы никуда не отправляются.

## Команды

```bash
npm start        # dev-сервер на http://localhost:4200 (service worker выключен)
npm run build    # прод-сборка: пререндер всех страниц + sitemap.xml + robots.txt → dist/converter/browser
npm test         # unit-тесты (Vitest)
```

Результат сборки — **чисто статический сайт** (сервер не нужен). Залить `dist/converter/browser` на любой
статический хостинг (Netlify, Vercel, Cloudflare Pages, GitHub Pages, nginx). Для неизвестных путей отдавать
`index.csr.html` (SPA-fallback).

## Деплой на GitHub Pages

Workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) на каждый push в `main` прогоняет тесты,
собирает сайт и публикует его в GitHub Pages.

Один раз настроить: репозиторий → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
На бесплатном аккаунте репозиторий должен быть публичным.

Адрес сайта workflow берёт у GitHub Pages сам:

- без своего домена — `https://<логин>.github.io/<репозиторий>/` (сборка идёт с `--base-href /<репозиторий>/`);
- со своим доменом (Settings → Pages → Custom domain) — `https://ваш-домен/`, ничего в коде менять не нужно.

Этот адрес подставляется в canonical, hreflang, Open Graph, JSON-LD и sitemap. `site.config.json` в репозитории
используется только для локальной сборки и других хостингов.

У GitHub Pages нет SPA-fallback: все страницы пререндерены, а для неизвестных адресов сборка кладёт `404.html`
(копия `index.csr.html`), из которого приложение загружается и уводит на главную.

## Другой хостинг

В [site.config.json](site.config.json) указать адрес сайта, `npm run build`, залить `dist/converter/browser`.

## Структура

```
site.config.json             адрес и имя сайта для SEO
scripts/seo-files.mjs        postbuild: sitemap.xml (с hreflang) и robots.txt из пререндеренных страниц
src/app/
  core/image/                форматы, список конвертеров, движок конвертации, ZIP
  core/i18n/                 языки, словари, язык из URL
  core/seo.service.ts        title, description, canonical, hreflang, OG/Twitter, JSON-LD
  core/theme.service.ts      светлая / тёмная / системная тема
  core/pwa.service.ts        установка, онлайн/офлайн, обновление версии
  core/pro/                  платный план: флаги, лимиты, лицензия
  pages/landing              лендинг (главная)
  pages/converter            страница конвертера (одна на каждую пару форматов)
  pages/pricing              тарифы (скрыта)
```

**Новый конвертер** — добавить пару в `PAIRS` в `core/image/converters.ts`. Маршрут во всех языках, вкладка,
карточка на лендинге, пререндер и запись в sitemap появятся сами.

**Новый язык** — скопировать `dictionaries/en.ts`, перевести, добавить в `LANGUAGES` в `i18n.service.ts`.

## Языки и URL

en, ru, de, fr, es, it, pt, pl, zh. Английский без префикса (`/png-to-jpg`), остальные — с префиксом
(`/ru/png-to-jpg`). Каждая языковая версия — отдельная индексируемая страница.
При первом заходе на английский URL посетитель переводится на язык браузера; явный выбор языка запоминается.

## SEO

- Все 198 страниц (9 языков × 22) пререндерятся в статический HTML — поисковики видят контент без JS.
- На каждой странице: уникальные `<title>` и `description`, `<html lang>`, canonical, hreflang + x-default,
  Open Graph, Twitter Card.
- JSON-LD: `WebSite`, `WebApplication`, `FAQPage` на лендинге; `WebApplication` и `BreadcrumbList` на конвертерах.
- На страницах конвертеров есть текстовые блоки «Как конвертировать», «О формате» и перелинковка «Другие конвертеры».
- `sitemap.xml` с альтернативными языковыми версиями и `robots.txt` генерируются после сборки.

## Офлайн

`ngsw-config.json` заранее кэширует все JS-чанки (включая декодер HEIC ≈1.3 МБ и ZIP) и иконки.
Навигация без сети обслуживается из `index.csr.html`. После первого визита интернет не нужен.

## Тема

Переключатель в шапке: системная → светлая → тёмная. Выбор хранится в `localStorage`;
инлайн-скрипт в `index.html` применяет тему до первой отрисовки, поэтому мигания нет.

## Pro (пакетная обработка)

| | Free | Pro |
|---|---|---|
| Файлов за раз | 1 | до 500 |
| Скачать всё ZIP-архивом | — | ✓ |

- Лимиты — `core/pro/features.ts` (`PLAN_LIMITS`).
- `FEATURES.paymentsEnabled = false` скрывает всё, что связано с оплатой: страницу `/pricing`, кнопку Pro, ввод ключа.
- `license-verify.ts` — заглушка проверки ключа (сейчас любой ключ невалиден). Задумано: ключ подписан Ed25519,
  проверяется через WebCrypto, поэтому активация работает офлайн.
- В dev-сборке в футере есть переключатель **Dev: Pro** для проверки пакетного режима.
