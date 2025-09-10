# Деплой на Yandex Cloud (VM + Docker + Nginx)

## 1) Создай VM (Ubuntu 22.04 LTS)
- В YC Console: Compute Cloud → Create VM
- Image: Ubuntu 22.04 LTS
- e2-medium или выше (2 vCPU, 4GB RAM минимум)
- Disk: 30–50GB
- Set: публичный IP (static), Security Group: открыть 80/tcp (и 443 — на шаге TLS)
- SSH ключ добавь сразу

## 2) Установи Docker и docker compose plugin
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
sudo systemctl enable --now docker
```

## 3) Установи Nginx
```bash
sudo apt-get install -y nginx
sudo systemctl enable --now nginx
```

## 4) Склонируй репозиторий и настрой
```bash
git clone <YOUR_REPO_URL> /opt/codereview
cd /opt/codereview
```

## 5) Настрой переменные окружения
```bash
# Скопируй пример конфигурации
cp deploy/yandex/.env.sample server/.env

# Отредактируй server/.env и укажи свои значения:
# - YC_API_KEY: API ключ Yandex Cloud
# - YC_FOLDER_ID: ID папки в Yandex Cloud
nano server/.env
```

## 6) Собери и запусти приложение
```bash
# Собери Docker образ
docker compose -f docker-compose.prod.yml build

# Запусти приложение
docker compose -f docker-compose.prod.yml up -d
```

## 7) Настрой Nginx
```bash
# Скопируй конфигурацию nginx
sudo cp deploy/yandex/nginx.conf /etc/nginx/nginx.conf

# Проверь конфигурацию
sudo nginx -t

# Перезапусти nginx
sudo systemctl reload nginx
```

## 8) Проверь работу
```bash
# Проверь статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Проверь логи приложения
docker compose -f docker-compose.prod.yml logs -f

# Проверь доступность через nginx
curl http://localhost/healthz
```

## 9) Настрой автозапуск (опционально)
```bash
# Создай systemd сервис для автозапуска
sudo tee /etc/systemd/system/codereview.service > /dev/null <<EOF
[Unit]
Description=CodeReview Panel
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/codereview
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Включи автозапуск
sudo systemctl enable codereview.service
```

## 10) Настрой TLS (опционально)
Для настройки HTTPS используй Let's Encrypt:

```bash
# Установи certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Получи сертификат (замени example.com на свой домен)
sudo certbot --nginx -d example.com

# Настрой автообновление
sudo crontab -e
# Добавь строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## Полезные команды

### Мониторинг
```bash
# Статус сервисов
sudo systemctl status nginx
sudo systemctl status docker

# Логи приложения
docker compose -f docker-compose.prod.yml logs -f

# Использование ресурсов
docker stats
htop
```

### Обновление приложения
```bash
cd /opt/codereview
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Резервное копирование
```bash
# Создай бэкап данных
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Восстанови из бэкапа
tar -xzf backup-YYYYMMDD.tar.gz
```

## Troubleshooting

### Проблемы с Docker
```bash
# Перезапусти Docker
sudo systemctl restart docker

# Очисти неиспользуемые образы
docker system prune -a
```

### Проблемы с Nginx
```bash
# Проверь конфигурацию
sudo nginx -t

# Перезапусти nginx
sudo systemctl restart nginx

# Проверь логи
sudo tail -f /var/log/nginx/error.log
```

### Проблемы с приложением
```bash
# Проверь логи контейнера
docker compose -f docker-compose.prod.yml logs app

# Перезапусти приложение
docker compose -f docker-compose.prod.yml restart

# Проверь переменные окружения
docker compose -f docker-compose.prod.yml exec app env | grep -E "(YC_|LLM_)"
```
