# FootBot - Бэкенд мини-приложения для Telegram

Бэкенд часть приложения FootBot, построенного на Flask и PostgreSQL. Серверное API для мини-приложения Telegram, обеспечивающее работу платформы для организации футбольных игр.

## Технический стек

- **Язык:** Python 3.8+
- **Фреймворк:** Flask
- **База данных:** PostgreSQL
- **ORM:** SQLAlchemy
- **Миграции:** Flask-Migrate
- **CORS:** Flask-CORS

## Модели данных

### Пользователь (User)
```python
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    photo_url = db.Column(db.String(255))
    score = db.Column(db.Integer, default=0)
    games_played = db.Column(db.Integer, default=0)
    games_won = db.Column(db.Integer, default=0)
    telegram_id = db.Column(db.String(100), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    score_mismatch_count = db.Column(db.Integer, default=0)
    theme_preference = db.Column(db.String(10), default='light')
```

### Игровая комната (GameRoom)
```python
class GameRoom(db.Model):
    __tablename__ = 'game_rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    max_players = db.Column(db.Integer, default=16)
    location = db.Column(db.String(100))
    time_range = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='waiting')
    captain_a_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    captain_b_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    score_a = db.Column(db.Integer, nullable=True)
    score_b = db.Column(db.Integer, nullable=True)
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
```

### История игр (GameHistory)
```python
class GameHistory(db.Model):
    __tablename__ = 'game_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_room_id = db.Column(db.Integer, db.ForeignKey('game_rooms.id'), nullable=False)
    was_winner = db.Column(db.Boolean, default=False)
    team = db.Column(db.String(1))  # 'A' или 'B'
    score_a = db.Column(db.Integer)
    score_b = db.Column(db.Integer)
    was_captain = db.Column(db.Boolean, default=False)
    result = db.Column(db.String(10))  # 'win', 'loss', 'draw'
    points_earned = db.Column(db.Integer, default=0)
    played_at = db.Column(db.DateTime, default=datetime.utcnow)
    game_start_time = db.Column(db.DateTime, nullable=True)
    game_end_time = db.Column(db.DateTime, nullable=True)
```

## Установка и настройка

### Требования
- Python 3.8+
- PostgreSQL

### Установка

1. Клонируйте репозиторий:

```bash
git clone <repository-url>
cd footbot/TG_miniApp_back
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

### Настройка базы данных

1. Создайте базу данных PostgreSQL:

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE tg_miniapp;

# Выйдите из psql
\q
```

2. Настройте переменные окружения:

Создайте файл `.env` в корне проекта со следующим содержимым:

```
DATABASE_URL=postgresql://postgres:postgres@localhost/tg_miniapp
FLASK_APP=main.py
FLASK_ENV=development
```

Измените параметры подключения к базе данных, если необходимо.

### Миграции и инициализация базы данных

1. Инициализируйте миграции:

```bash
flask db init
```

2. Создайте и примените миграции:

```bash
flask db migrate -m "Initial migration"
flask db upgrade
```

3. Заполните базу тестовыми данными (опционально):

```bash
flask init-db
```

## Запуск сервера

```bash
# В режиме разработки
flask run --debug

# Для production
gunicorn main:app
```

Сервер будет доступен по адресу http://localhost:5000.

## API Endpoints

### Пользователи
- `GET /api/users` - Получение списка всех пользователей
- `GET /api/users/<id>` - Получение пользователя по ID
- `GET /api/users/me` - Получение текущего пользователя
- `POST /api/users/set-current/<id>` - Установка текущего пользователя (для тестирования)
- `GET /api/users/game-history` - Получение истории игр текущего пользователя
- `GET /api/users/<id>/game-history` - Получение истории игр конкретного пользователя
- `POST /api/users/theme-preference` - Установка предпочтений темы пользователя

### Игровые комнаты
- `GET /api/game-rooms` - Получение списка игровых комнат (с фильтрацией)
- `GET /api/game-rooms/<id>` - Получение игровой комнаты по ID
- `POST /api/game-rooms` - Создание игровой комнаты
- `POST /api/game-rooms/<id>/join` - Присоединение к игровой комнате
- `POST /api/game-rooms/<id>/leave` - Выход из игровой комнаты
- `DELETE /api/game-rooms/<id>` - Удаление игровой комнаты
- `POST /api/game-rooms/<id>/start-team-selection` - Начало выбора команд
- `POST /api/game-rooms/<id>/start-game` - Начало игры
- `POST /api/game-rooms/<id>/end-game` - Завершение игры
- `POST /api/game-rooms/<id>/submit-score` - Ввод счета игры
- `POST /api/game-rooms/<id>/report-player` - Жалоба на игрока

### Прочее
- `GET /api/leaderboard` - Получение таблицы лидеров
- `GET /api/user-active-rooms` - Получение активных комнат пользователя
- `GET /api/locations/search` - Поиск локаций
- `GET /api/locations` - Получение всех локаций

## Особенности реализации

### Часовые пояса и даты

Все даты хранятся в UTC формате. При отдаче в JSON они преобразуются в строку ISO формата с явным указанием часового пояса UTC (суффикс 'Z'):

```python
# Пример из метода to_dict модели GameHistory
return {
    # другие поля...
    'playedAt': self.played_at.isoformat() + 'Z' if self.played_at else None,
    'gameStartTime': self.game_start_time.isoformat() + 'Z' if self.game_start_time else None,
    'gameEndTime': self.game_end_time.isoformat() + 'Z' if self.game_end_time else None,
}
```

### Система расчета очков

В приложении реализована сложная система начисления очков игрокам:

```python
def update_player_stats(room):
    # Определяем победившую команду
    team_a_win = room.score_a > room.score_b
    team_b_win = room.score_b > room.score_a
    is_draw = room.score_a == room.score_b
    
    # Коэффициенты и базовые значения
    base_win_points = 10
    max_additional_points = 20
    base_loss_penalty = 5
    max_additional_penalty = 15
    
    # Разница в счете (абсолютное значение)
    score_difference = abs(room.score_a - room.score_b)
    
    # Рассчитываем дополнительные очки/штрафы на основе разницы в счете
    # (больше разница - больше очков победителю и больше штраф проигравшему)
    additional_points_factor = min(score_difference / 5, 1.0)  # Максимум 1.0 при разнице 5+
    additional_points = int(max_additional_points * additional_points_factor)
    additional_penalty = int(max_additional_penalty * additional_points_factor)
    
    # Очки для победы, ничьи и поражения
    win_points = base_win_points + additional_points
    draw_points = 0
    loss_points = -1 * (base_loss_penalty + additional_penalty)
    
    # Обновляем статистику игроков
    for player in room.players:
        # Определяем, в какой команде находится игрок
        player_in_team_a = player in room.team_a
        player_in_team_b = player in room.team_b
        
        # Определяем, победил ли игрок
        player_won = (player_in_team_a and team_a_win) or (player_in_team_b and team_b_win)
        player_lost = (player_in_team_a and team_b_win) or (player_in_team_b and team_a_win)
        
        # Обновляем количество игр
        player.games_played += 1
        
        # Обновляем количество побед
        if player_won:
            player.games_won += 1
        
        # Начисляем очки
        if player_won:
            player.score += win_points
            result = 'win'
            points = win_points
        elif is_draw:
            player.score += draw_points
            result = 'draw'
            points = draw_points
        else:
            player.score += loss_points
            result = 'loss'
            points = loss_points
```

### Система штрафов

При несоответствии счетов, введенных капитанами, применяются штрафы:

```python
def apply_mismatch_penalties(room):
    # Получаем капитанов
    captain_a = User.query.get(room.captain_a_id)
    captain_b = User.query.get(room.captain_b_id)
    
    # Функция для определения коэффициента штрафа
    def get_penalty_coefficient(captain):
        # Учитываем количество предыдущих нарушений
        # Чем больше нарушений, тем выше штраф
        if captain.score_mismatch_count == 0:
            return 0.5  # Первое нарушение - половина штрафа
        elif captain.score_mismatch_count == 1:
            return 1.0  # Второе нарушение - полный штраф
        else:
            # Для последующих нарушений штраф увеличивается
            return 1.5 + (captain.score_mismatch_count - 2) * 0.5
    
    # Рассчитываем штрафы для капитанов
    captain_a_coefficient = get_penalty_coefficient(captain_a)
    captain_b_coefficient = get_penalty_coefficient(captain_b)
    
    # Базовый штраф за несоответствие счета
    base_penalty = 20
    
    # Применяем штрафы с учетом коэффициентов
    captain_a_penalty = int(base_penalty * captain_a_coefficient)
    captain_b_penalty = int(base_penalty * captain_b_coefficient)
    
    # Обновляем счет капитанов
    captain_a.score -= captain_a_penalty
    captain_b.score -= captain_b_penalty
    
    # Увеличиваем счетчик несоответствий для капитанов
    captain_a.score_mismatch_count += 1
    captain_b.score_mismatch_count += 1
```

## Тестирование

### Ручное тестирование

Для ручного тестирования API можно использовать инструменты, такие как:
- Postman
- cURL
- Встроенный в современные браузеры инструмент разработчика

### Запуск из Docker

1. Соберите Docker образ:

```bash
docker build -t footbot-backend .
```

2. Запустите контейнер:

```bash
docker run -p 5000:5000 footbot-backend
```

## Известные проблемы и решения

### Проблема с часовыми поясами
Если на фронтенде время отображается неправильно, убедитесь, что в методе `to_dict` всех моделей с датами добавлен суффикс 'Z' к строке ISO формата.

### SQLAlchemy предупреждения
Если вы видите предупреждения о декларативных параметрах SQLAlchemy, рассмотрите возможность обновления кода для использования современного стиля определения моделей через `db.Model`.

## Вклад в проект

1. Создайте форк репозитория
2. Создайте ветку для вашей функциональности (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add some amazing feature'`)
4. Отправьте изменения в ваш форк (`git push origin feature/amazing-feature`)
5. Откройте Pull Request 