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

## LLM (YandexGPT)

### Переменные окружения

Для работы с YandexGPT необходимо настроить следующие переменные окружения:

```bash
# YandexGPT API ключи
YC_API_KEY=your_yandex_api_key
YC_FOLDER_ID=your_folder_id
```

### Пример использования

```bash
curl -X POST http://localhost:3000/api/dev/llm \
  -H 'Content-Type: application/json' \
  -d '{ "system":"Echo only OK", "user":"test" }'
```

## HTML-промпты

### Размещение файлов

HTML-файлы с промптами размещаются в директории `server/llm/prompts/`:

```
server/llm/prompts/
├── Отчет студенту.html    # Промпт для генерации отчета студенту
└── Классификатор.html     # Промпт для классификации отчетов
```

### Переменные окружения

Для настройки путей к HTML-файлам используются переменные окружения:

```bash
# Путь к HTML-файлу с промптом для отчета студенту
REPORT_PROMPT_HTML_PATH=server/llm/prompts/Отчет студенту.html

# Путь к HTML-файлу с промптом для классификатора
CLASSIFIER_PROMPT_HTML_PATH=server/llm/prompts/Классификатор.html
```

Если переменные не заданы, используются пути по умолчанию.

### Проверка загрузки промптов

В режиме разработки доступны dev-эндпойнты для тестирования:

```bash
# Проверить загрузку HTML-промптов
curl http://localhost:3000/api/dev/llm/prompts

# Тестировать LLM с кастомными промптами
curl -X POST http://localhost:3000/api/dev/llm \
  -H 'Content-Type: application/json' \
  -d '{ "system":"Твой промпт", "user":"Тестовое сообщение" }'
```

## LLM Issues Artifact

### Что такое llm_issues.json

Файл `data/artifacts/<runId>/llm_issues.json` содержит результаты парсинга отчета LLM на предмет найденных проблем в коде. Этот файл создается автоматически при обработке отчета через функцию `extractIssuesFromReport()`.

### Формат JSON

```json
{
  "issues": [
    {
      "filePath": "src/main.py",
      "snippet": "def calculate_sum(a, b):\n    return a + b",
      "ranges": [
        {
          "startLine": 10,
          "startCol": 0,
          "endLine": 12,
          "endCol": 15
        }
      ],
      "message": "Функция не обрабатывает случай с None значениями",
      "errorNumber": 1
    },
    {
      "filePath": "src/utils.py",
      "snippet": "import os\nprint(os.getenv('API_KEY'))",
      "ranges": [
        {
          "startLine": 5,
          "startCol": 0,
          "endLine": 6,
          "endCol": 30
        }
      ],
      "message": "Прямой вывод секретных данных в консоль",
      "errorNumber": 2
    }
  ]
}
```

### Структура объекта Issue

- **`filePath`** (string) - путь к файлу относительно корня проекта
- **`snippet`** (string) - фрагмент кода, в котором найдена проблема
- **`ranges`** (array) - массив диапазонов в файле:
  - **`startLine`** (number) - начальная строка
  - **`startCol`** (number) - начальная колонка
  - **`endLine`** (number) - конечная строка
  - **`endCol`** (number) - конечная колонка
- **`message`** (string, optional) - комментарий из отчета LLM
- **`errorNumber`** (number, optional) - номер ошибки из отчета

### Как проверить парсер

В режиме разработки доступен dev-эндпойнт для ручной проверки парсера:

```bash
curl -X POST http://localhost:3000/api/dev/llm/parse \
  -H 'Content-Type: application/json' \
  -d '{
    "runId": "test-run-123",
    "reportText": "Ошибка №1 в файле src/main.py:\nФункция не обрабатывает случай с None значениями\n```python\ndef calculate_sum(a, b):\n    return a + b\n```",
    "files": [
      {
        "path": "src/main.py",
        "content": "def calculate_sum(a, b):\n    return a + b\n\nif __name__ == \"__main__\":\n    print(calculate_sum(1, 2))"
      }
    ]
  }'
```

Ответ:
```json
{
  "ok": true,
  "issues": [...],
  "outPath": "/path/to/data/artifacts/test-run-123/llm_issues.json"
}
```

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




