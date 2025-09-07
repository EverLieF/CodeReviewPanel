# CodeReviewPanel

Монорепо для системы ревью кода с современным фронтендом и готовностью к интеграции с бэкендом.

## Архитектура

### Frontend (client/)
- **Vite + React + TypeScript** - современный стек разработки
- **Tailwind CSS + Radix UI (shadcn/ui)** - стилизация и компоненты
- **Wouter** - легковесный роутер
- **Zustand** - управление состоянием
- **TanStack Query** - работа с серверным состоянием и кэширование
- **MSW (Mock Service Worker)** - мокирование API для разработки

### Backend (server/)
- **Express + TypeScript** - серверная часть (пока заглушка)
- **Drizzle ORM** - работа с базой данных
- **PostgreSQL** - основная база данных

### Shared (shared/)
- **Zod схемы** - валидация данных
- **Drizzle схемы** - типы базы данных

## Настройка окружения

### Переменные окружения

Создайте файл `.env.development` в корне проекта:

```bash
# Настройки для разработки
VITE_USE_MSW=true
VITE_API_BASE_URL=/api
```

### Переменные для продакшена

Для продакшена создайте `.env.production`:

```bash
# Настройки для продакшена
VITE_USE_MSW=false
VITE_API_BASE_URL=https://your-api-domain.com/api
```

## Управление MSW (Mock Service Worker)

### Включение/выключение MSW

MSW управляется через переменную окружения `VITE_USE_MSW`:

- **`VITE_USE_MSW=true`** - MSW включен, используются моки
- **`VITE_USE_MSW=false`** - MSW выключен, запросы идут на реальный API

### Когда использовать MSW

**Включите MSW когда:**
- Разрабатываете фронтенд без готового бэкенда
- Тестируете различные сценарии (ошибки, задержки)
- Работаете офлайн

**Выключите MSW когда:**
- Бэкенд готов и работает
- Тестируете интеграцию с реальным API
- Деплоите в продакшен

### Настройка API URL

Переменная `VITE_API_BASE_URL` определяет базовый URL для API запросов:

- **Разработка**: `/api` (проксируется на localhost:3000)
- **Продакшен**: `https://your-domain.com/api`

## Запуск проекта

### Установка зависимостей

```bash
npm install
```

### Разработка

```bash
# Запуск в режиме разработки с MSW
npm run dev
```

### Сборка для продакшена

```bash
# Сборка без MSW
npm run build

# Предварительный просмотр продакшен сборки
npm run preview
```

## API Endpoints

Все API запросы начинаются с `/api`:

- `GET /api/projects` - список проектов
- `POST /api/projects` - создание проекта
- `GET /api/projects/:id/comments` - комментарии проекта
- `POST /api/projects/:id/comments` - добавление комментария
- `PUT /api/projects/:id/comments/:commentId` - обновление комментария
- `DELETE /api/projects/:id/comments/:commentId` - удаление комментария
- `GET /api/timeline` - события истории
- `GET /api/projects/:id/files/:filePath` - получение файла

## Структура проекта

```
├── client/                 # Frontend приложение
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/          # Страницы приложения
│   │   ├── lib/            # Утилиты, типы, API клиент
│   │   ├── hooks/          # React хуки
│   │   ├── store/          # Zustand store
│   │   └── mocks/          # MSW моки
├── server/                 # Backend приложение
├── shared/                 # Общие схемы и типы
└── attached_assets/        # Ресурсы проекта
```

## Технические особенности

- **TypeScript strict mode** - строгая типизация без `any`
- **HTTP клиент** - типизированные обертки для API запросов
- **Обработка ошибок** - централизованная обработка с понятными сообщениями
- **Loading/Error состояния** - корректное отображение состояний загрузки
- **Responsive дизайн** - адаптивный интерфейс
- **Темная/светлая тема** - поддержка переключения тем

## Разработка

### Добавление новых API endpoints

1. Добавьте типы в `client/src/lib/types.ts`
2. Создайте функции в `client/src/lib/api.ts`
3. Добавьте моки в `client/src/mocks/handlers.ts`
4. Используйте TanStack Query для кэширования

### Стилизация

Используйте компоненты из `client/src/components/ui/` (shadcn/ui) и Tailwind CSS классы.

### Состояние

- **Глобальное состояние**: Zustand store в `client/src/store/`
- **Серверное состояние**: TanStack Query в компонентах



