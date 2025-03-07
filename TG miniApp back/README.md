# Бэкенд для Telegram Mini App

Бэкенд на Flask с PostgreSQL для мини-приложения Telegram.

## Требования

- Python 3.8+
- PostgreSQL

## Установка

1. Клонируйте репозиторий:

```bash
git clone <repository-url>
cd TG\ miniApp\ back
```

2. Создайте виртуальное окружение и активируйте его:

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. Установите зависимости:

```bash
pip install -r requirements.txt
```

4. Создайте базу данных PostgreSQL:

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE tg_miniapp;

# Выйдите из psql
\q
```

5. Настройте переменные окружения:

Создайте файл `.env` в корне проекта со следующим содержимым:

```
DATABASE_URL=postgresql://postgres:postgres@localhost/tg_miniapp
FLASK_APP=main.py
FLASK_ENV=development
```

Измените параметры подключения к базе данных, если необходимо.

## Инициализация базы данных

1. Выполните миграции:

```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

2. Заполните базу данных тестовыми данными:

```bash
flask init-db
```

## Запуск

```bash
flask run
```

Сервер будет доступен по адресу http://localhost:5000.

## API Endpoints

### Пользователи

- `GET /api/users` - Получить список всех пользователей
- `GET /api/users/<id>` - Получить информацию о пользователе по ID
- `GET /api/users/me` - Получить информацию о текущем пользователе
- `GET /api/leaderboard` - Получить таблицу лидеров

### Игровые комнаты

- `GET /api/game-rooms` - Получить список всех игровых комнат
- `POST /api/game-rooms` - Создать новую игровую комнату
- `POST /api/game-rooms/<id>/join` - Присоединиться к игровой комнате
- `POST /api/game-rooms/<id>/leave` - Покинуть игровую комнату 