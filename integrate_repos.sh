#!/bin/bash

# =============================================================================
# Скрипт интеграции репозиториев: GitHub (база) + Sourcecraft (черновик)
# =============================================================================

# Конфигурация
GITHUB_URL="https://github.com/EverLieF/CodeReviewPanel.git"
SOURCECRAFT_URL="https://git@git.sourcecraft.dev/bueno-top-one/mvp.git"
MAIN_BRANCH="main"
DRAFT_BRANCH="main"
SUBTREE_PREFIX="legacy"
INTEGRATION_BRANCH="integrate/subtree"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка наличия git
check_git() {
    log_info "Проверка наличия git..."
    if ! command -v git &> /dev/null; then
        log_error "Git не найден. Установите git и повторите попытку."
        exit 1
    fi
    
    local git_version=$(git --version | cut -d' ' -f3)
    log_success "Git найден: версия $git_version"
}

# Проверка наличия tree (опционально)
check_tree() {
    if command -v tree &> /dev/null; then
        log_success "Tree утилита найдена"
        return 0
    else
        log_warning "Tree утилита не найдена, будет использован ls"
        return 1
    fi
}

# Создание временной директории
create_temp_dir() {
    local temp_dir=$(mktemp -d)
    log_info "Создана временная директория: $temp_dir" >&2
    echo "$temp_dir"
}

# Клонирование базы с GitHub
clone_base_repo() {
    local temp_dir="$1"
    local repo_name=$(basename "$GITHUB_URL" .git)
    local repo_path="$temp_dir/$repo_name"
    
    log_info "Клонирование базы с GitHub..." >&2
    if git clone "$GITHUB_URL" "$repo_path"; then
        log_success "База успешно клонирована в $repo_path" >&2
        echo "$repo_path"
    else
        log_error "Ошибка клонирования базы" >&2
        exit 1
    fi
}

# Создание ветки интеграции
create_integration_branch() {
    local repo_path="$1"
    cd "$repo_path" || exit 1
    
    log_info "Создание ветки интеграции: $INTEGRATION_BRANCH"
    if git checkout -b "$INTEGRATION_BRANCH"; then
        log_success "Ветка $INTEGRATION_BRANCH создана"
    else
        log_error "Ошибка создания ветки интеграции"
        exit 1
    fi
}

# Добавление удалённого репозитория черновика
add_draft_remote() {
    local repo_path="$1"
    cd "$repo_path" || exit 1
    
    log_info "Добавление удалённого репозитория черновика..."
    if git remote add draft "$SOURCECRAFT_URL"; then
        log_success "Удалённый репозиторий 'draft' добавлен"
    else
        log_error "Ошибка добавления удалённого репозитория"
        exit 1
    fi
    
    log_info "Получение данных из черновика..."
    if git fetch draft; then
        log_success "Данные из черновика получены"
    else
        log_error "Ошибка получения данных из черновика"
        exit 1
    fi
}

# Добавление черновика как subtree
add_draft_subtree() {
    local repo_path="$1"
    cd "$repo_path" || exit 1
    
    log_info "Добавление черновика как subtree в папку '$SUBTREE_PREFIX'..."
    log_warning "Используется --squash для минимизации конфликтов"
    
    if git subtree add --prefix="$SUBTREE_PREFIX" draft "$DRAFT_BRANCH" --squash; then
        log_success "Черновик успешно добавлен как subtree"
    else
        log_error "Ошибка добавления subtree"
        exit 1
    fi
}

# Показ результата интеграции
show_integration_result() {
    local repo_path="$1"
    cd "$repo_path" || exit 1
    
    log_info "Результат интеграции:"
    echo ""
    
    # Показ истории коммитов
    log_info "Последние 20 коммитов:"
    git log --oneline --graph --decorate -n 20
    echo ""
    
    # Показ структуры проекта
    log_info "Структура проекта:"
    if check_tree; then
        tree -L 2
    else
        ls -la
        echo ""
        if [ -d "$SUBTREE_PREFIX" ]; then
            log_info "Содержимое папки $SUBTREE_PREFIX:"
            ls -la "$SUBTREE_PREFIX"
        fi
    fi
    echo ""
}

# Настройка удалённого репозитория для пуша
setup_sourcecraft_remote() {
    local repo_path="$1"
    cd "$repo_path" || exit 1
    
    log_info "Настройка удалённого репозитория для пуша..."
    
    # Проверяем, есть ли уже remote с именем sourcecraft
    if git remote get-url sourcecraft &> /dev/null; then
        log_info "Обновление существующего remote 'sourcecraft'"
        git remote set-url sourcecraft "$SOURCECRAFT_URL"
    else
        log_info "Добавление нового remote 'sourcecraft'"
        git remote add sourcecraft "$SOURCECRAFT_URL"
    fi
    
    log_success "Remote 'sourcecraft' настроен: $SOURCECRAFT_URL"
    log_info "Remote 'origin' остаётся: $(git remote get-url origin)"
}

# Пуш результата в Sourcecraft
push_to_sourcecraft() {
    local repo_path="$1"
    cd "$repo_path" || exit 1
    
    log_info "Отправка результата в Sourcecraft..."
    log_warning "Используется --force-with-lease для безопасной перезаписи истории"
    
    if git push sourcecraft "$INTEGRATION_BRANCH:$MAIN_BRANCH" --force-with-lease; then
        log_success "Результат успешно отправлен в Sourcecraft"
    else
        log_error "Ошибка отправки в Sourcecraft"
        log_warning "Попробуйте выполнить команду вручную:"
        echo "cd $repo_path"
        echo "git push sourcecraft $INTEGRATION_BRANCH:$MAIN_BRANCH --force-with-lease"
        exit 1
    fi
}

# Показ инструкций
show_instructions() {
    local repo_path="$1"
    
    echo ""
    log_success "Интеграция завершена успешно!"
    echo ""
    log_info "Следующие шаги:"
    echo "1. Откройте репозиторий на Sourcecraft: $SOURCECRAFT_URL"
    echo "2. Проверьте, что ветка $MAIN_BRANCH содержит интегрированный код"
    echo "3. При необходимости создайте PR для ревью"
    echo "4. После одобрения слейте изменения в основную ветку"
    echo ""
    log_info "Для дальнейшей работы с черновиком:"
    echo "  # Подтянуть обновления из черновика:"
    echo "  git subtree pull --prefix=\"$SUBTREE_PREFIX\" draft \"$DRAFT_BRANCH\" --squash"
    echo ""
    log_info "Миграция модулей из legacy/:"
    echo "  # Переместить файлы из legacy/ в основную структуру:"
    echo "  git mv legacy/some-module ./new-location/"
    echo "  git commit -m \"Migrate module from legacy\""
    echo ""
    log_info "Временная директория: $repo_path"
    log_warning "Не удаляйте временную директорию до завершения проверки!"
}

# Основная функция
main() {
    log_info "Начало интеграции репозиториев"
    log_info "GitHub (база): $GITHUB_URL"
    log_info "Sourcecraft (черновик): $SOURCECRAFT_URL"
    echo ""
    
    # Проверки
    check_git
    check_tree
    echo ""
    
    # Создание временной директории
    local temp_dir=$(create_temp_dir)
    
    # Клонирование базы
    local repo_path=$(clone_base_repo "$temp_dir")
    echo ""
    
    # Интеграция
    create_integration_branch "$repo_path"
    echo ""
    
    add_draft_remote "$repo_path"
    echo ""
    
    add_draft_subtree "$repo_path"
    echo ""
    
    show_integration_result "$repo_path"
    
    setup_sourcecraft_remote "$repo_path"
    echo ""
    
    push_to_sourcecraft "$repo_path"
    echo ""
    
    show_instructions "$repo_path"
}

# Запуск скрипта
main "$@"
