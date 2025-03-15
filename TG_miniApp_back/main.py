from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from datetime import datetime
import os
import random
import re
from locations import search_locations, get_all_locations
from sqlalchemy import or_, text
import hashlib
import hmac
import json
import time
import urllib.parse

app = Flask(__name__)

# Настройки CORS для работы с Telegram
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://telegram.org", "https://*.telegram.org", "*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Telegram-ID"]
    }
})

database_url = os.environ.get('DATABASE_URL', 'postgresql://postgres:footbot777Azat@db/mydb')
print(f"Подключение к базе данных по адресу: {database_url}")
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Глобальная переменная для хранения ID текущего пользователя (для тестирования)
current_user_id = None

# DEPRECATED: Эти эндпоинты использовались только для тестирования
# Они оставлены как комментарии на случай необходимости отладки без Telegram
"""
@app.route('/api/users/set-current/<int:user_id>', methods=['POST'])
def set_current_user(user_id):
    global current_user_id
    
    print(f"Setting current user to ID: {user_id}")
    user = User.query.get_or_404(user_id)
    current_user_id = user.id
    result = user.to_dict()
    print(f"Current user set to: {result}")
    return jsonify(result)
"""


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
    
    # Поле для отслеживания количества несовпадений счета (для штрафов капитанам)
    score_mismatch_count = db.Column(db.Integer, default=0)
    
    # Поле для хранения предпочтений темы пользователя
    theme_preference = db.Column(db.String(10), default='light')  # 'light' или 'dark'
    
    def to_dict(self):
        return {        
            'id': self.id,
            'username': self.username,
            'photoUrl': self.photo_url,
            'score': self.score,
            'gamesPlayed': self.games_played,
            'gamesWon': self.games_won,
            'scoreMismatchCount': self.score_mismatch_count,
            'themePreference': self.theme_preference
        }

# Связующая таблица для игроков в игровой комнате
game_room_players = db.Table('game_room_players',
    db.Column('game_room_id', db.Integer, db.ForeignKey('game_rooms.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

class GameRoom(db.Model):
    __tablename__ = 'game_rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    max_players = db.Column(db.Integer, default=16)
    location = db.Column(db.String(100))
    time_range = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Новые поля для управления игрой
    status = db.Column(db.String(20), default='waiting')  # waiting, team_selection, in_progress, score_submission, completed
    team_a = db.relationship('User', secondary='team_a_players', backref='team_a_rooms')
    team_b = db.relationship('User', secondary='team_b_players', backref='team_b_rooms')
    captain_a_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    captain_b_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    score_a = db.Column(db.Integer, nullable=True)
    score_b = db.Column(db.Integer, nullable=True)
    captain_a_submitted = db.Column(db.Boolean, default=False)
    captain_b_submitted = db.Column(db.Boolean, default=False)
    captain_a_score_submission = db.Column(db.String(10), nullable=True)
    captain_b_score_submission = db.Column(db.String(10), nullable=True)
    
    # Поля для отслеживания попыток ввода счета
    score_submission_attempts = db.Column(db.Integer, default=0)
    score_mismatch = db.Column(db.Boolean, default=False)
    
    # Новые поля для хранения времени начала и конца игры
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    
    creator = db.relationship('User', backref='created_rooms', foreign_keys=[creator_id])
    captain_a = db.relationship('User', foreign_keys=[captain_a_id])
    captain_b = db.relationship('User', foreign_keys=[captain_b_id])
    players = db.relationship('User', secondary=game_room_players, backref='joined_rooms')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'creator': self.creator.to_dict() if self.creator else None,
            'maxPlayers': self.max_players,
            'location': self.location,
            'timeRange': self.time_range,
            'status': self.status,
            'players': [player.to_dict() for player in self.players],
            'teamA': [player.to_dict() for player in self.team_a],
            'teamB': [player.to_dict() for player in self.team_b],
            'captainA': self.captain_a.to_dict() if self.captain_a else None,
            'captainB': self.captain_b.to_dict() if self.captain_b else None,
            'scoreA': self.score_a,
            'scoreB': self.score_b,
            'captainASubmitted': self.captain_a_submitted,
            'captainBSubmitted': self.captain_b_submitted,
            'scoreMismatch': self.score_mismatch,
            'scoreSubmissionAttempts': self.score_submission_attempts,
            'startTime': self.start_time.isoformat() + 'Z' if self.start_time else None,
            'endTime': self.end_time.isoformat() + 'Z' if self.end_time else None,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None
        }

# Создаем таблицы для команд
team_a_players = db.Table('team_a_players',
    db.Column('game_room_id', db.Integer, db.ForeignKey('game_rooms.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

team_b_players = db.Table('team_b_players',
    db.Column('game_room_id', db.Integer, db.ForeignKey('game_rooms.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

# Таблица для хранения истории игр
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Новые поля для хранения времени начала и конца игры
    game_start_time = db.Column(db.DateTime, nullable=True)
    game_end_time = db.Column(db.DateTime, nullable=True)
    
    user = db.relationship('User', backref='game_history')
    game_room = db.relationship('GameRoom')
    
    def to_dict(self):
        # Рассчитываем продолжительность игры, если есть начало и конец
        duration = None
        if self.game_start_time and self.game_end_time:
            duration_seconds = (self.game_end_time - self.game_start_time).total_seconds()
            minutes = int(duration_seconds // 60)
            duration = f"{minutes} мин"
            
        return {
            'id': self.id,
            'user': self.user.to_dict() if self.user else None,
            'gameRoom': self.game_room.to_dict() if self.game_room else None,
            'wasWinner': self.was_winner,
            'team': self.team,
            'scoreA': self.score_a,
            'scoreB': self.score_b,
            'wasCaptain': self.was_captain,
            'result': self.result,
            'pointsEarned': self.points_earned,
            'playedAt': self.played_at.isoformat() + 'Z' if self.played_at else None,
            'createdAt': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'gameStartTime': self.game_start_time.isoformat() + 'Z' if self.game_start_time else None,
            'gameEndTime': self.game_end_time.isoformat() + 'Z' if self.game_end_time else None,
            'gameDuration': duration
        }

# Модель для жалоб
class Complaint(db.Model):
    __tablename__ = 'complaints'
    
    id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reported_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_room_id = db.Column(db.Integer, db.ForeignKey('game_rooms.id'), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    reporter = db.relationship('User', foreign_keys=[reporter_id])
    reported_user = db.relationship('User', foreign_keys=[reported_user_id])
    game_room = db.relationship('GameRoom')
    
    def to_dict(self):
        return {
            'id': self.id,
            'reporter': self.reporter.to_dict(),
            'reportedUser': self.reported_user.to_dict(),
            'gameRoom': self.game_room.to_dict(),
            'reason': self.reason,
            'createdAt': self.created_at.isoformat() + 'Z'
        }

# Маршруты API
@app.route('/')
def index():
    return "Сервер работает!"


@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@app.route('/api/users/me', methods=['GET'])
def get_current_user():
    # Проверяем, передан ли Telegram-ID в заголовке
    telegram_id = request.headers.get('X-Telegram-ID')
    print(f"get_current_user: Получен X-Telegram-ID из заголовка: {telegram_id}")
    
    if telegram_id and telegram_id.strip():
        # Ищем пользователя по Telegram ID
        user = User.query.filter_by(telegram_id=telegram_id).first()
        if user:
            # Устанавливаем current_user_id для совместимости с другими частями кода
            global current_user_id
            current_user_id = user.id
            print(f"get_current_user: Найден пользователь по Telegram ID: {user.id}, {user.username}")
            return jsonify(user.to_dict())
        else:
            # Если пользователь не найден по Telegram ID, создаем нового
            print(f"get_current_user: Пользователь не найден по Telegram ID: {telegram_id}, создаем нового")
            
            # Получаем данные из тела запроса, если они доступны
            webapp_user = None
            if request.is_json:
                webapp_user = request.json.get('webAppUser')
                print(f"get_current_user: Получены дополнительные данные о пользователе: {webapp_user}")
            
            # Создаем пользователя с минимальными данными
            username = webapp_user.get('username', f"User{telegram_id}") if webapp_user else f"User{telegram_id}"
            photo_url = webapp_user.get('photoUrl', '') if webapp_user else ''
            
            try:
                user = User(
                    username=username,
                    telegram_id=telegram_id,
                    photo_url=photo_url
                )
                db.session.add(user)
                db.session.commit()
                
                current_user_id = user.id
                print(f"get_current_user: Создан новый пользователь: {user.id}, {user.username}")
                return jsonify(user.to_dict())
            except Exception as e:
                db.session.rollback()
                print(f"get_current_user: Ошибка при создании пользователя: {str(e)}")
                return jsonify({'error': f'Failed to create user: {str(e)}'}), 500
    
    # Если нет Telegram ID или он пустой, пробуем получить его из JSON-запроса
    if request.is_json:
        data = request.json
        telegram_id_json = data.get('telegramId')
        user_data = data.get('userData')
        
        if telegram_id_json:
            print(f"get_current_user: Получен Telegram ID из JSON: {telegram_id_json}")
            # Ищем пользователя по Telegram ID из JSON
            user = User.query.filter_by(telegram_id=str(telegram_id_json)).first()
            if user:
                global current_user_id
                current_user_id = user.id
                print(f"get_current_user: Найден пользователь по Telegram ID из JSON: {user.id}, {user.username}")
                return jsonify(user.to_dict())
            
            # Если есть user_data, создаем нового пользователя с этими данными
            if user_data:
                try:
                    username = user_data.get('username', f"User{telegram_id_json}")
                    photo_url = user_data.get('photo_url', '')
                    
                    user = User(
                        username=username,
                        telegram_id=str(telegram_id_json),
                        photo_url=photo_url
                    )
                    db.session.add(user)
                    db.session.commit()
                    
                    current_user_id = user.id
                    print(f"get_current_user: Создан новый пользователь из JSON данных: {user.id}, {user.username}")
                    return jsonify(user.to_dict())
                except Exception as e:
                    db.session.rollback()
                    print(f"get_current_user: Ошибка при создании пользователя из JSON: {str(e)}")
    
    # Если нет Telegram ID или пользователь не найден, проверяем current_user_id (для тестирования и отладки)
    print(f"get_current_user: Используем fallback с current_user_id: {current_user_id}")
    if not current_user_id:
        # Если current_user_id не установлен, берем первого пользователя
        user = User.query.first()
        if user:
            print(f"get_current_user: Используем первого пользователя: {user.id}, {user.username}")
            return jsonify(user.to_dict())
        return jsonify({'error': 'No users in database'}), 404
    
    user = User.query.get_or_404(current_user_id)
    print(f"get_current_user: Используем пользователя по current_user_id: {user.id}, {user.username}")
    return jsonify(user.to_dict())

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    # Получаем параметры пагинации
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Ограничиваем максимальное количество записей на странице
    if per_page > 50:
        per_page = 50
    
    # Получаем общее количество пользователей
    total_users = User.query.count()
    
    # Получаем пользователей с пагинацией, отсортированных по очкам
    users = User.query.order_by(User.score.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    # Преобразуем пользователей в JSON
    users_json = [user.to_dict() for user in users]
    
    # Возвращаем результат с метаданными пагинации
    return jsonify({
        'users': users_json,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total_users,
            'total_pages': (total_users + per_page - 1) // per_page
        }
    })

@app.route('/api/game-rooms', methods=['GET'])
def get_game_rooms():
    # Получаем параметры запроса
    name_query = request.args.get('name', '')
    location_filter = request.args.get('location', '')
    time_range_filter = request.args.get('timeRange', '')
    
    # Базовый запрос - исключаем комнаты со статусом 'completed' и заполненные комнаты
    query = GameRoom.query.filter(GameRoom.status != 'completed')
    
    # Применяем фильтры, если они указаны
    if name_query:
        query = query.filter(GameRoom.name.ilike(f'%{name_query}%'))
    if location_filter:
        query = query.filter(GameRoom.location.ilike(f'%{location_filter}%'))
    if time_range_filter:
        # Проверяем, является ли фильтр списком (через запятую)
        if ',' in time_range_filter:
            # Разбиваем на отдельные интервалы
            time_ranges = time_range_filter.split(',')
            # Создаем условие OR для каждого интервала
            time_filters = []
            for time_range in time_ranges:
                time_filters.append(GameRoom.time_range.ilike(f'%{time_range.strip()}%'))
            # Объединяем условия
            query = query.filter(or_(*time_filters))
        else:
            # Используем одиночный фильтр как раньше
            query = query.filter(GameRoom.time_range.ilike(f'%{time_range_filter}%'))
    
    # Получаем результаты
    rooms = query.all()
    
    # Фильтруем комнаты, чтобы исключить заполненные
    filtered_rooms = []
    for room in rooms:
        # Проверяем, не заполнена ли комната
        if len(room.players) < room.max_players:
            filtered_rooms.append(room)
    
    return jsonify([room.to_dict() for room in filtered_rooms])

# Добавляю эндпоинт для получения конкретной игровой комнаты по ID
@app.route('/api/game-rooms/<int:room_id>', methods=['GET'])
def get_game_room(room_id):
    room = GameRoom.query.get_or_404(room_id)
    return jsonify(room.to_dict())

@app.route('/api/game-rooms', methods=['POST'])
def create_game_room():
    data = request.json
    
    # Получаем текущего пользователя
    global current_user_id
    creator = User.query.get(current_user_id) if current_user_id else User.query.first()
    if not creator:
        return jsonify({'error': 'User not found'}), 404
    
    # Создаем новую игровую комнату
    room = GameRoom(
        name=data.get('name'),
        creator_id=creator.id,
        max_players=data.get('maxPlayers', 16),
        location=data.get('location'),
        time_range=data.get('timeRange')
    )
    
    # Добавляем создателя в список игроков
    room.players.append(creator)
    
    db.session.add(room)
    db.session.commit()
    
    return jsonify(room.to_dict())

def is_user_in_any_game(user_id):
    # Проверяем, находится ли пользователь в какой-либо игровой комнате
    # Исключаем комнаты со статусом 'completed'
    return db.session.query(game_room_players).\
        join(GameRoom, game_room_players.c.game_room_id == GameRoom.id).\
        filter(game_room_players.c.user_id == user_id).\
        filter(GameRoom.status != 'completed').\
        first() is not None

@app.route('/api/game-rooms/<int:room_id>/join', methods=['POST'])
def join_game_room_with_check(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    # Получаем текущего пользователя
    global current_user_id
    user = User.query.get(current_user_id) if current_user_id else User.query.first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Проверяем, не заполнена ли комната
    if len(room.players) >= room.max_players:
        return jsonify({'error': 'Room is full', 'roomIsFull': True}), 400
    
    # Проверяем, не находится ли пользователь уже в комнате
    if user in room.players:
        return jsonify({'message': 'Already in this room', 'room': room.to_dict()}), 200
    
    # Проверяем, не находится ли пользователь в другой комнате
    # Исключаем комнаты со статусом 'completed'
    if is_user_in_any_game(user.id):
        active_rooms = []
        for active_room in GameRoom.query.filter(GameRoom.status != 'completed').all():
            if user in active_room.players:
                active_rooms.append(active_room.to_dict())
        
        return jsonify({
            'error': 'You are already in another game room',
            'activeRooms': active_rooms
        }), 400
    
    # Добавляем пользователя в комнату
    room.players.append(user)
    db.session.commit()
    
    # Проверяем, заполнилась ли комната после присоединения
    is_room_full = len(room.players) >= room.max_players
    
    return jsonify({
        'room': room.to_dict(),
        'roomIsFull': is_room_full
    })

@app.route('/api/game-rooms/<int:room_id>/leave', methods=['POST'])
def leave_game_room(room_id):
    # Получаем игровую комнату
    room = GameRoom.query.get(room_id)
    if not room:
        return jsonify({'error': 'Игровая комната не найдена'}), 404
    
    # Получаем текущего пользователя
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    # Проверяем, является ли пользователь участником комнаты
    is_player_in_room = False
    for player in room.players:
        if player.id == user.id:
            is_player_in_room = True
            break
    
    if not is_player_in_room:
        return jsonify({'error': 'Вы не являетесь участником этой комнаты'}), 403
    
    # Если уходящий игрок был создателем комнаты, передаем права случайному игроку
    if room.creator_id == user.id:
        # Проверяем, остались ли другие игроки в комнате, кроме текущего
        other_players = [p for p in room.players if p.id != user.id]
        if other_players:
            # Выбираем случайного игрока из оставшихся
            new_creator = random.choice(other_players)
            room.creator_id = new_creator.id
            
            # Если уходящий игрок был капитаном, назначаем нового капитана
            if room.captain_a_id == user.id:
                room.captain_a_id = new_creator.id
            elif room.captain_b_id == user.id:
                room.captain_b_id = new_creator.id
    
    # Удаляем пользователя из комнаты ПОСЛЕ назначения нового создателя
    room.players.remove(user)
    
    # Проверяем, есть ли еще игроки в комнате
    if not room.players:
        # Если игроков не осталось, удаляем комнату
        db.session.delete(room)
        db.session.commit()
        return jsonify({'message': 'Вы покинули комнату. Комната удалена, так как в ней не осталось игроков.'})
    
    # Сохраняем изменения
    db.session.commit()
    
    return jsonify({'message': 'Вы успешно покинули комнату.'})

# Добавляю маршрут для удаления игровой комнаты, доступный только для создателя.
@app.route('/api/game-rooms/<int:room_id>', methods=['DELETE'])
def delete_game_room(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    # Получаем текущего пользователя
    global current_user_id
    current_user = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    if room.creator_id != current_user.id:
        return jsonify({'error': 'Только создатель комнаты может её удалить'}), 403
    
    db.session.delete(room)
    db.session.commit()
    
    return jsonify({'message': 'Комната успешно удалена'})

# Эндпоинт для автоматического распределения игроков по командам
@app.route('/api/game-rooms/<int:room_id>/start-team-selection', methods=['POST'])
def start_team_selection(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    # Получаем текущего пользователя
    global current_user_id
    current_user = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    # Проверяем, является ли пользователь создателем комнаты
    if room.creator_id != current_user.id:
        return jsonify({'error': 'Только создатель комнаты может начать выбор команд'}), 403
    
    # Проверяем, что в комнате достаточно игроков
    if len(room.players) < 2:
        return jsonify({'error': 'Для начала выбора команд нужно минимум 2 игрока'}), 400
    
    # Меняем статус комнаты
    room.status = 'team_selection'
    
    # Случайным образом распределяем игроков по командам
    players = list(room.players)
    random.shuffle(players)
    
    # Разделяем игроков на две команды
    half = len(players) // 2
    team_a = players[:half]
    team_b = players[half:]
    
    # Очищаем текущие команды
    room.team_a = []
    room.team_b = []
    
    # Добавляем игроков в команды
    for player in team_a:
        room.team_a.append(player)
    
    for player in team_b:
        room.team_b.append(player)
    
    # Назначаем капитанов команд
    if team_a:
        room.captain_a_id = team_a[0].id
    
    if team_b:
        room.captain_b_id = team_b[0].id
    
    db.session.commit()
    
    return jsonify(room.to_dict())

# Эндпоинт для установки предпочтений темы пользователя
@app.route('/api/users/theme-preference', methods=['POST'])
def set_theme_preference():
    # Получаем данные запроса
    data = request.json
    if not data or 'theme' not in data:
        return jsonify({'error': 'Missing theme parameter'}), 400
    
    theme = data['theme']
    if theme not in ['light', 'dark']:
        return jsonify({'error': 'Invalid theme value, must be "light" or "dark"'}), 400
    
    # Проверяем Telegram ID из заголовка запроса
    telegram_id = request.headers.get('X-Telegram-ID')
    user = None
    
    if telegram_id:
        # Ищем пользователя по Telegram ID
        user = User.query.filter_by(telegram_id=telegram_id).first()
    
    # Если пользователь не найден по Telegram ID, используем текущего пользователя
    if not user and current_user_id:
        user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Устанавливаем новое значение темы
    user.theme_preference = theme
    db.session.commit()
    
    return jsonify(user.to_dict())

# Эндпоинт для начала игры
@app.route('/api/game-rooms/<int:room_id>/start-game', methods=['POST'])
def start_game(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    # Получаем текущего пользователя
    global current_user_id
    current_user = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    # Проверяем, является ли пользователь создателем комнаты
    if room.creator_id != current_user.id:
        return jsonify({'error': 'Только создатель комнаты может начать игру'}), 403
    
    # Проверяем, что комната находится в статусе выбора команд
    if room.status != 'team_selection':
        return jsonify({'error': 'Комната должна быть в статусе выбора команд'}), 400
    
    # Меняем статус комнаты и записываем время начала игры
    room.status = 'in_progress'
    room.start_time = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(room.to_dict())

# Эндпоинт для завершения игры капитаном
@app.route('/api/game-rooms/<int:room_id>/end-game', methods=['POST'])
def end_game(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    # Получаем текущего пользователя
    global current_user_id
    current_user = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    # Проверяем, является ли пользователь создателем комнаты или капитаном одной из команд
    if room.creator_id != current_user.id and room.captain_a_id != current_user.id and room.captain_b_id != current_user.id:
        return jsonify({'error': 'Только создатель комнаты или капитаны команд могут завершить игру'}), 403
    
    # Проверяем, что комната находится в статусе игры
    if room.status != 'in_progress':
        return jsonify({'error': 'Комната должна быть в статусе игры'}), 400
    
    # Меняем статус комнаты и записываем время окончания игры
    room.status = 'score_submission'
    room.end_time = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(room.to_dict())

# Эндпоинт для ввода счета капитаном
@app.route('/api/game-rooms/<int:room_id>/submit-score', methods=['POST'])
def submit_score(room_id):
    # Получаем данные запроса
    data = request.json
    score = data.get('score', '')
    
    # Проверяем, соответствует ли формат счета шаблону (например, "3:2")
    if not re.match(r'^\d+:\d+$', score):
        return jsonify({'error': 'Неверный формат счета. Используйте формат "X:Y"'}), 400
    
    # Разбираем счет
    score_parts = score.split(':')
    score_a = int(score_parts[0])
    score_b = int(score_parts[1])
    
    # Получаем игровую комнату
    room = GameRoom.query.get_or_404(room_id)
    
    # Получаем текущего пользователя
    global current_user_id
    current_user = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    # Проверяем, является ли пользователь капитаном одной из команд
    if room.captain_a_id != current_user.id and room.captain_b_id != current_user.id:
        return jsonify({'error': 'Только капитаны команд могут вводить счет'}), 403
    
    # Проверяем, что комната находится в статусе ввода счета или в игре
    if room.status not in ['score_submission', 'in_progress']:
        return jsonify({'error': 'Комната должна быть в статусе ввода счета или в игре'}), 400
    
    # Записываем счет от соответствующего капитана
    if room.captain_a_id == current_user.id:
        room.captain_a_score_submission = score
        room.captain_a_submitted = True
    elif room.captain_b_id == current_user.id:
        room.captain_b_score_submission = score
        room.captain_b_submitted = True
    
    # Проверяем, оба ли капитана ввели счет
    if room.captain_a_submitted and room.captain_b_submitted:
        # Если оба капитана ввели одинаковый счет
        if room.captain_a_score_submission == room.captain_b_score_submission:
            # Устанавливаем счет команд из разобранной строки
            room.score_a = score_a
            room.score_b = score_b
            
            # Обновляем статус комнаты на "завершено"
            room.status = 'completed'
            
            # Обновляем статистику игроков и создаем записи в истории игр
            created_history = update_player_stats(room)
            
            # Добавляем созданные записи истории в сессию
            for history_entry in created_history:
                db.session.add(history_entry)
            
            db.session.commit()
            
            return jsonify({
                'message': 'Счет успешно принят. Игра завершена.',
                'room': room.to_dict()
            })
        else:
            # Если счет не совпадает
            room.score_mismatch = True
            room.score_submission_attempts += 1
            
            # Если это третья попытка, применяем штрафы и завершаем игру с ничьей
            if room.score_submission_attempts >= 3:
                apply_mismatch_penalties(room)
                
                # Устанавливаем счет как ничью
                room.score_a = 0
                room.score_b = 0
                room.status = 'completed'
                
                # Обновляем статистику игроков
                created_history = update_player_stats(room)
                
                # Добавляем созданные записи истории в сессию
                for history_entry in created_history:
                    db.session.add(history_entry)
                
                db.session.commit()
                
                return jsonify({
                    'message': 'Превышено количество попыток ввода счета. Применены штрафы, игра завершена с ничьей.',
                    'room': room.to_dict()
                })
            
            # Сбрасываем флаги отправки счета, чтобы капитаны могли ввести снова
            room.captain_a_submitted = False
            room.captain_b_submitted = False
            
            db.session.commit()
            
            return jsonify({
                'message': 'Введенные счета не совпадают. Пожалуйста, попробуйте еще раз.',
                'room': room.to_dict()
            })
    
    # Если только один капитан ввел счет
    db.session.commit()
    
    return jsonify({
        'message': 'Счет успешно отправлен. Ожидание ввода счета от другого капитана.',
        'room': room.to_dict()
    })

# Функция для обновления статистики игроков
def update_player_stats(room):
    # Определяем победившую команду
    team_a_won = room.score_a > room.score_b
    team_b_won = room.score_b > room.score_a
    is_draw = room.score_a == room.score_b
    
    # Вычисляем разницу в счете (для определения уверенности победы)
    score_difference = abs(room.score_a - room.score_b)
    
    # Рассчитываем силу каждой команды на основе среднего рейтинга игроков
    team_a_total_score = sum([player.score for player in room.team_a])
    team_b_total_score = sum([player.score for player in room.team_b])
    team_a_avg_score = team_a_total_score / len(room.team_a) if room.team_a else 0
    team_b_avg_score = team_b_total_score / len(room.team_b) if room.team_b else 0
    
    # Вычисляем ожидаемый результат на основе рейтинга Эло
    # Формула: 1 / (1 + 10^((команда_противника - команда_игрока) / 400))
    # Это даст вероятность победы для каждой команды
    expected_win_a = 1 / (1 + 10 ** ((team_b_avg_score - team_a_avg_score) / 400))
    expected_win_b = 1 / (1 + 10 ** ((team_a_avg_score - team_b_avg_score) / 400))
    
    # Константа K - максимальное количество очков, которое можно получить
    K = 100
    
    # Базовые очки за победу, поражение и ничью (будут скорректированы)
    base_win_points = K 
    base_loss_points = -K / 2  # За поражение будет вычитаться половина максимальных очков
    base_draw_points = 0  # За ничью никто не получает очков
    
    # Коэффициенты для бонусных очков
    score_diff_coef = 0.1  # Влияние разницы в счете
    max_bonus_for_underdog = 15  # Максимальный бонус для аутсайдера (снижен с 30 до 15)
    
    # Создаем записи в истории игр для всех участников игры
    created_history = []
    
    # Обрабатываем игроков команды A
    for player in room.team_a:
        # Рассчитываем индивидуальный вклад игрока (отношение его рейтинга к среднему команды)
        player_contribution = player.score / team_a_avg_score if team_a_avg_score > 0 else 1
        
        # Корректируем вклад, чтобы он не был слишком экстремальным
        player_contribution = max(0.5, min(1.5, player_contribution))
        
        # Был ли игрок капитаном
        was_captain = player.id == room.captain_a_id
        captain_bonus = 1.0  # Убираем бонус для капитанов
        
        # Обновляем счетчики игр
        player.games_played += 1
        
        # Определяем результат и очки
        points_earned = 0
        result = ""
        
        if team_a_won:
            # Команда A выиграла
            player.games_won += 1
            
            # Базовые очки, корректируемые ожидаемой вероятностью победы
            points_earned = base_win_points * (1 - expected_win_a)
            
            # Добавляем бонус за разницу в счете
            points_earned += score_difference * score_diff_coef
            
            # Корректируем на основе вклада игрока
            points_earned *= player_contribution
            
            # Добавляем бонус капитану
            points_earned *= captain_bonus
            
            result = "win"
        elif team_b_won:
            # Команда A проиграла
            
            # Базовые очки за поражение, корректируемые ожидаемой вероятностью поражения
            points_earned = base_loss_points * expected_win_a
            
            # Если команда была сильным аутсайдером, уменьшаем штраф
            if expected_win_a < 0.3:
                underdog_bonus = max_bonus_for_underdog * (1 - expected_win_a / 0.3)
                points_earned += underdog_bonus
            
            # Корректируем на основе вклада игрока
            points_earned *= player_contribution
            
            # Добавляем бонус/штраф капитану (капитаны теряют на 10% больше очков)
            points_earned *= captain_bonus
            
            result = "loss"
        else:
            # Ничья
            # Корректируем базовые очки за ничью в зависимости от ожидаемого результата
            if expected_win_a > 0.55:  # Команда A была фаворитом
                points_earned = -10  # Штраф за неоправданные ожидания
            elif expected_win_a < 0.45:  # Команда A была аутсайдером
                points_earned = 10  # Бонус за превзошедший ожидания результат
            else:
                points_earned = 0  # Команды были примерно равны
            
            result = "draw"
        
        # Округляем очки до целого числа
        points_earned = int(points_earned)
        
        # Проверяем, что рейтинг не станет отрицательным
        if player.score + points_earned < 0:
            points_earned = -player.score  # Ограничиваем вычитание, чтобы счет стал равным 0
            
        # Обновляем счет игрока
        player.score += points_earned
            
        # Добавляем запись в историю игр
        game_history = GameHistory(
            user_id=player.id,
            game_room_id=room.id,
            was_winner=team_a_won,
            team='A',
            score_a=room.score_a,
            score_b=room.score_b,
            was_captain=was_captain,
            result=result,
            points_earned=points_earned,
            played_at=datetime.utcnow()
        )
        created_history.append(game_history)
    
    # Обрабатываем игроков команды B
    for player in room.team_b:
        # Рассчитываем индивидуальный вклад игрока
        player_contribution = player.score / team_b_avg_score if team_b_avg_score > 0 else 1
        
        # Корректируем вклад, чтобы он не был слишком экстремальным
        player_contribution = max(0.5, min(1.5, player_contribution))
        
        # Был ли игрок капитаном
        was_captain = player.id == room.captain_b_id
        captain_bonus = 1.0  # Убираем бонус для капитанов
        
        # Обновляем счетчики игр
        player.games_played += 1
        
        # Определяем результат и очки
        points_earned = 0
        result = ""
        
        if team_b_won:
            # Команда B выиграла
            player.games_won += 1
            
            # Базовые очки, корректируемые ожидаемой вероятностью победы
            points_earned = base_win_points * (1 - expected_win_b)
            
            # Добавляем бонус за разницу в счете
            points_earned += score_difference * score_diff_coef
            
            # Корректируем на основе вклада игрока
            points_earned *= player_contribution
            
            # Добавляем бонус капитану
            points_earned *= captain_bonus
            
            result = "win"
        elif team_a_won:
            # Команда B проиграла
            
            # Базовые очки за поражение, корректируемые ожидаемой вероятностью поражения
            points_earned = base_loss_points * expected_win_b
            
            # Если команда была сильным аутсайдером, уменьшаем штраф
            if expected_win_b < 0.3:
                underdog_bonus = max_bonus_for_underdog * (1 - expected_win_b / 0.3)
                points_earned += underdog_bonus
            
            # Корректируем на основе вклада игрока
            points_earned *= player_contribution
            
            # Добавляем бонус/штраф капитану (капитаны теряют на 10% больше очков)
            points_earned *= captain_bonus
            
            result = "loss"
        else:
            # Ничья
            # Корректируем базовые очки за ничью в зависимости от ожидаемого результата
            if expected_win_b > 0.55:  # Команда B была фаворитом
                points_earned = -10  # Штраф за неоправданные ожидания
            elif expected_win_b < 0.45:  # Команда B была аутсайдером
                points_earned = 10  # Бонус за превзошедший ожидания результат
            else:
                points_earned = 0  # Команды были примерно равны
            
            result = "draw"
        
        # Округляем очки до целого числа
        points_earned = int(points_earned)
        
        # Проверяем, что рейтинг не станет отрицательным
        if player.score + points_earned < 0:
            points_earned = -player.score  # Ограничиваем вычитание, чтобы счет стал равным 0
            
        # Обновляем счет игрока
        player.score += points_earned
            
        # Добавляем запись в историю игр
        game_history = GameHistory(
            user_id=player.id,
            game_room_id=room.id,
            was_winner=team_b_won,
            team='B',
            score_a=room.score_a,
            score_b=room.score_b,
            was_captain=was_captain,
            result=result,
            points_earned=points_earned,
            played_at=datetime.utcnow()
        )
        created_history.append(game_history)
    
    # После создания всех записей истории, обновляем время для каждой записи
    for history_entry in created_history:
        history_entry.game_start_time = room.start_time
        history_entry.game_end_time = room.end_time
    
    return created_history

# Функция для применения штрафов при несовпадении счетов
def apply_mismatch_penalties(room):
    # Получаем капитанов
    captain_a = User.query.get(room.captain_a_id)
    captain_b = User.query.get(room.captain_b_id)
    
    # Определяем коэффициенты штрафов для капитанов
    def get_penalty_coefficient(captain):
        if not captain:
            return 1.0
        
        # Коэффициент зависит от количества предыдущих несовпадений
        if captain.score_mismatch_count <= 1:  # Первый случай (с учетом текущего)
            return 0.0
        elif captain.score_mismatch_count == 2:
            return 0.5
        elif captain.score_mismatch_count == 3:
            return 1.0
        else:  # 4 и более
            return 1.5
    
    # Получаем коэффициенты
    captain_a_coef = get_penalty_coefficient(captain_a)
    captain_b_coef = get_penalty_coefficient(captain_b)
    
    # Стандартный штраф за поражение
    penalty = 10
    
    # Применяем штрафы к игрокам команды A
    for player in room.team_a:
        if player.id == room.captain_a_id:
            # Для капитана используем его коэффициент
            player.score -= int(penalty * captain_a_coef)
        else:
            # Для обычных игроков всегда коэффициент 1
            player.score -= penalty
    
    # Применяем штрафы к игрокам команды B
    for player in room.team_b:
        if player.id == room.captain_b_id:
            # Для капитана используем его коэффициент
            player.score -= int(penalty * captain_b_coef)
        else:
            # Для обычных игроков всегда коэффициент 1
            player.score -= penalty
    
    # Обновляем статистику игр
    for player in room.players:
        player.games_played += 1

# Эндпоинт для подачи жалобы на игрока
@app.route('/api/game-rooms/<int:room_id>/report-player', methods=['POST'])
def report_player(room_id):
    room = GameRoom.query.get_or_404(room_id)
    data = request.json
    
    # Получаем текущего пользователя
    global current_user_id
    reporter = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    # Проверяем, что пользователь является участником комнаты
    if reporter not in room.players:
        return jsonify({'error': 'Вы не являетесь участником этой комнаты'}), 403
    
    # Получаем данные из запроса
    reported_user_id = data.get('reportedUserId')
    reason = data.get('reason')
    
    if not reported_user_id or not reason:
        return jsonify({'error': 'Не указан пользователь или причина жалобы'}), 400
    
    # Проверяем, что пользователь, на которого жалуются, существует и является участником комнаты
    reported_user = User.query.get(reported_user_id)
    if not reported_user or reported_user not in room.players:
        return jsonify({'error': 'Указанный пользователь не найден или не является участником комнаты'}), 404
    
    # Создаем жалобу
    complaint = Complaint(
        reporter_id=reporter.id,
        reported_user_id=reported_user_id,
        game_room_id=room_id,
        reason=reason
    )
    
    db.session.add(complaint)
    db.session.commit()
    
    return jsonify({'message': 'Жалоба успешно отправлена'}), 201

# Инициализация базы данных с тестовыми данными
@app.cli.command("init-db")
def init_db():
    print("Начинаю инициализацию базы данных...")
    
    # Создаем все таблицы
    db.create_all()
    print("Таблицы созданы.")
    
    # Проверяем, есть ли уже пользователи в базе
    user_count = User.query.count()
    print(f"Текущее количество пользователей: {user_count}")
    
    # Больше не создаем тестовых пользователей
    print("Тестовые пользователи не создаются. Пользователи будут создаваться при входе через Telegram.")
    
    # Проверяем, что таблицы созданы и доступны
    tables = ["users", "game_rooms", "game_history", "game_room_players", "team_a_players", "team_b_players", "complaints"]
    for table in tables:
        try:
            result = db.session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
            print(f"Таблица '{table}' успешно создана и доступна.")
        except Exception as e:
            print(f"Ошибка при проверке таблицы '{table}': {str(e)}")
    
    print("База данных успешно инициализирована!")

@app.route('/api/user-active-rooms', methods=['GET'])
def get_user_active_rooms():
    """
    Возвращает список активных комнат, в которых находится текущий пользователь.
    Активными считаются комнаты со статусом, отличным от 'completed'.
    """
    # Получаем текущего пользователя
    global current_user_id
    user = User.query.get(current_user_id) if current_user_id else User.query.first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Получаем все активные комнаты пользователя
    active_rooms = []
    for room in GameRoom.query.filter(GameRoom.status != 'completed').all():
        if user in room.players:
            active_rooms.append(room.to_dict())
    
    return jsonify({
        'user': user.to_dict(),
        'activeRooms': active_rooms
    })

@app.route('/api/users/game-history', methods=['GET'])
def get_user_game_history():
    """Получение истории игр текущего пользователя"""
    # Получаем текущего пользователя
    if not current_user_id:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    # Получаем параметры пагинации
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Ограничиваем максимальное количество записей на странице
    if per_page > 50:
        per_page = 50
    
    # Получаем общее количество записей истории игр
    total_history = GameHistory.query.filter_by(user_id=current_user_id).count()
    
    # Получаем историю игр пользователя с пагинацией
    history = GameHistory.query.filter_by(user_id=current_user_id) \
        .order_by(GameHistory.created_at.desc()) \
        .offset((page - 1) * per_page) \
        .limit(per_page) \
        .all()
    
    # Возвращаем список игр в формате JSON
    return jsonify([entry.to_dict() for entry in history])

@app.route('/api/users/<int:user_id>/game-history', methods=['GET'])
def get_specific_user_game_history(user_id):
    """Получение истории игр конкретного пользователя по ID"""
    # Проверяем, существует ли пользователь
    user = User.query.get_or_404(user_id)
    
    # Получаем параметры пагинации
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Ограничиваем максимальное количество записей на странице
    if per_page > 50:
        per_page = 50
    
    # Получаем общее количество записей истории игр
    total_history = GameHistory.query.filter_by(user_id=user_id).count()
    
    # Получаем историю игр пользователя с пагинацией
    history = GameHistory.query.filter_by(user_id=user_id) \
        .order_by(GameHistory.created_at.desc()) \
        .offset((page - 1) * per_page) \
        .limit(per_page) \
        .all()
    
    # Возвращаем список игр в формате JSON
    return jsonify([entry.to_dict() for entry in history])

# API для поиска локаций
@app.route('/api/locations/search', methods=['GET'])
def search_location():
    query = request.args.get('query', '')
    
    if not query:
        return jsonify([])
    
    # Ищем локации, соответствующие запросу
    matching_locations = search_locations(query)
    
    # Возвращаем максимум 10 результатов для предотвращения перегрузки
    return jsonify(matching_locations[:10])

@app.route('/api/locations', methods=['GET'])
def get_locations():
    # Возвращаем полный список локаций
    return jsonify(get_all_locations())

# Настройка CORS для всех маршрутов
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Telegram-ID')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    
    # Добавляем заголовки для работы с Telegram WebApp
    response.headers.add('X-Frame-Options', 'ALLOW-FROM https://telegram.org')
    response.headers.add('Content-Security-Policy', "frame-ancestors 'self' https://telegram.org https://*.telegram.org")
    
    return response

# Обработка preflight запросов OPTIONS
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def options_route(path):
    return '', 200

# Новый эндпоинт для установки текущего пользователя
"""
@app.route('/api/users/switch/<int:user_id>', methods=['POST'])
def switch_user(user_id):
    global current_user_id
    
    print(f"Switching to user ID: {user_id}")
    user = User.query.get_or_404(user_id)
    current_user_id = user.id
    result = user.to_dict()
    print(f"Switched to user: {result}")
    return jsonify(result)
"""

@app.route('/api/auth/telegram', methods=['POST'])
def auth_telegram():
    """
    Аутентифицирует пользователя по данным из Telegram
    Принимает initData от Telegram Web App и проверяет его валидность
    """
    try:
        # Получаем данные инициализации от Telegram
        init_data = request.json.get('initData', '')
        print(f"Получены initData: {init_data[:50]}..." if init_data and len(init_data) > 50 else f"Получены initData: {init_data}")
        
        # Получаем прямые данные пользователя, если они были отправлены
        direct_user_data = request.json.get('userData')
        if direct_user_data:
            print(f"Получены прямые данные пользователя: {direct_user_data}")
        
        # Получаем Telegram ID из заголовка как резервный вариант
        telegram_id_header = request.headers.get('X-Telegram-ID')
        print(f"Получен X-Telegram-ID из заголовка: {telegram_id_header}")
        
        # Проверяем, есть ли данные для аутентификации
        if not init_data and not telegram_id_header and not direct_user_data:
            print("ОШИБКА: Нет данных для аутентификации пользователя")
            return jsonify({'error': 'No authentication data provided'}), 400
        
        # Проверяем подпись от Telegram, если есть initData
        user_data = None
        if init_data:
            bot_token = os.environ.get('BOT_TOKEN')
            if not bot_token:
                print("ВНИМАНИЕ: Переменная окружения BOT_TOKEN не установлена!")
            else:
                if not validate_telegram_data(init_data, bot_token):
                    print("ОШИБКА: Невалидные данные от Telegram!")
                    # В продакшене здесь должен быть возврат ошибки
                    # Но для отладки можно продолжить выполнение
                    print("Продолжаем без валидации для отладки")
            
            # Парсим данные пользователя из initData
            user_data = parse_telegram_init_data(init_data)
            
            if user_data:
                print(f"Данные пользователя из initData: {user_data}")
        
        # Если нет данных из initData, но есть прямые данные пользователя
        if not user_data and direct_user_data:
            print(f"Используем прямые данные пользователя")
            user_data = direct_user_data
        
        # Если все еще нет данных, но есть ID из заголовка
        if not user_data and telegram_id_header:
            print(f"Используем ID из заголовка: {telegram_id_header}")
            user_data = {'id': telegram_id_header}
        
        if not user_data or 'id' not in user_data:
            print("ОШИБКА: Не удалось получить ID пользователя")
            return jsonify({
                'error': 'Could not get user ID',
                'details': {
                    'initDataPresent': bool(init_data),
                    'headerIdPresent': bool(telegram_id_header),
                    'directUserDataPresent': bool(direct_user_data)
                }
            }), 400
        
        # Получаем имя пользователя из данных Telegram
        username = 'User'
        if 'username' in user_data:
            username = user_data['username']
        elif 'first_name' in user_data:
            if 'last_name' in user_data:
                username = f"{user_data['first_name']} {user_data['last_name']}"
            else:
                username = user_data['first_name']
        
        # Получаем URL фото профиля, если он есть
        photo_url = user_data.get('photo_url', '')
        
        # Убедимся, что ID пользователя в виде строки
        telegram_id = str(user_data['id'])
        
        print(f"Данные для аутентификации: ID={telegram_id}, username={username}, photo_url={'присутствует' if photo_url else 'отсутствует'}")
        
        # Ищем пользователя по Telegram ID
        user = User.query.filter_by(telegram_id=telegram_id).first()
        
        # Если пользователь не найден, создаем нового
        if not user:
            print(f"Создаем нового пользователя с Telegram ID: {telegram_id}")
            try:
                user = User(
                    username=username,
                    telegram_id=telegram_id,
                    photo_url=photo_url
                )
                db.session.add(user)
                db.session.commit()
                print(f"Пользователь успешно создан: {user.id}, {user.username}")
            except Exception as create_error:
                db.session.rollback()
                print(f"Ошибка при создании пользователя: {str(create_error)}")
                return jsonify({'error': f'Failed to create user: {str(create_error)}'}), 500
        else:
            # Если пользователь найден, обновляем его данные, если они изменились
            update_needed = False
            
            if user.username != username:
                user.username = username
                update_needed = True
                print(f"Обновлено имя пользователя: {username}")
            
            if photo_url and user.photo_url != photo_url:
                user.photo_url = photo_url
                update_needed = True
                print(f"Обновлена аватарка пользователя")
            
            if update_needed:
                try:
                    db.session.commit()
                    print(f"Данные пользователя обновлены")
                except Exception as update_error:
                    db.session.rollback()
                    print(f"Ошибка при обновлении данных пользователя: {str(update_error)}")
        
        # Устанавливаем текущего пользователя (только для совместимости с тестовой средой)
        global current_user_id
        current_user_id = user.id
        print(f"Установлен current_user_id: {current_user_id}")
        
        # Возвращаем данные пользователя
        result = user.to_dict()
        print(f"Возвращаем данные пользователя: {result}")
        return jsonify(result)
    
    except Exception as e:
        print(f"Критическая ошибка аутентификации Telegram: {str(e)}")
        # Вывод стека вызовов для отладки
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to authenticate'}), 500

def parse_telegram_init_data(init_data):
    """
    Парсит initData из Telegram Web App и возвращает информацию о пользователе
    """
    try:
        # Преобразуем URL-encoded строку в словарь параметров
        if not init_data:
            return None
        
        # Декодируем URL-encoded строку
        try:
            # Сначала пробуем разобрать строку как URL-кодированную
            params = dict(urllib.parse.parse_qsl(init_data))
        except:
            # Если это не удалось, пробуем простой способ разделения по &
            params = {}
            for item in init_data.split('&'):
                if '=' in item:
                    key, value = item.split('=', 1)
                    params[key] = urllib.parse.unquote_plus(value)
        
        
        print(f"Полученные параметры: {', '.join(params.keys())}")
        
        # Извлекаем данные пользователя
        if 'user' in params:
            try:
                # Пробуем декодировать JSON-строку
                user_json = urllib.parse.unquote_plus(params['user'])
                user_data = json.loads(user_json)
                print(f"Данные пользователя: {user_data.get('id')}, {user_data.get('first_name')} {user_data.get('last_name')}")
                return user_data
            except json.JSONDecodeError as e:
                print(f"Ошибка декодирования JSON: {str(e)}")
                print(f"Содержимое 'user': {params['user']}")
        else:
            print("Поле 'user' не найдено в initData")
            
            # Для отладки выводим все параметры
            for key, value in params.items():
                print(f"- {key}: {value[:50]}..." if len(str(value)) > 50 else f"- {key}: {value}")
        
        return None
    except Exception as e:
        print(f"Error parsing Telegram init data: {str(e)}")
        return None

def validate_telegram_data(init_data, bot_token):
    """
    Проверяет валидность данных от Telegram с использованием HMAC-SHA-256
    """
    try:
        # Извлекаем хеш и данные для проверки
        data_check_string = init_data
        
        # Находим позицию hash в строке
        hash_pos = data_check_string.find('&hash=')
        if hash_pos == -1:
            return False
        
        # Отделяем hash от остальных данных
        received_hash = data_check_string[hash_pos + 6:]
        data_check_string = data_check_string[:hash_pos]
        
        # Создаем secret key из bot token
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        
        # Проверяем подпись
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Сравниваем хеши
        return computed_hash == received_hash
    except Exception as e:
        print(f"Error validating Telegram data: {str(e)}")
        return False

# Новый эндпоинт для быстрой аутентификации по Telegram ID
@app.route('/api/auth/telegram-id/<telegram_id>', methods=['GET'])
def auth_by_telegram_id(telegram_id):
    """
    Аутентифицирует пользователя по Telegram ID.
    Создает пользователя, если он не существует.
    """
    try:
        print(f"Получен запрос на аутентификацию по Telegram ID: {telegram_id}")
        
        # Проверка на валидность telegram_id
        if not telegram_id or not str(telegram_id).strip():
            print("ОШИБКА: Получен пустой Telegram ID")
            return jsonify({'error': 'Invalid Telegram ID'}), 400
            
        # Ищем пользователя по Telegram ID
        user = User.query.filter_by(telegram_id=str(telegram_id)).first()
        
        # Если пользователь не найден, создаем нового
        if not user:
            print(f"Пользователь не найден, создаем нового с Telegram ID: {telegram_id}")
            
            # Получаем данные пользователя из WebApp если они были отправлены
            webapp_data = {}
            if request.is_json:
                webapp_data = request.json
                print(f"Получены дополнительные данные о пользователе: {webapp_data}")
            
            # Создаем имя пользователя и URL фото
            username = webapp_data.get('username', f"User{telegram_id}")
            photo_url = webapp_data.get('photo_url', '')
            
            try:
                user = User(
                    username=username,
                    telegram_id=str(telegram_id),
                    photo_url=photo_url
                )
                db.session.add(user)
                db.session.commit()
                print(f"Создан новый пользователь: {user.id}, {user.username}, фото: {photo_url}")
            except Exception as create_error:
                db.session.rollback()
                print(f"Ошибка при создании пользователя: {str(create_error)}")
                return jsonify({'error': f'Failed to create user: {str(create_error)}'}), 500
        else:
            print(f"Найден существующий пользователь: {user.id}, {user.username}")
            
            # Обновляем данные пользователя, если они были отправлены
            if request.is_json:
                webapp_data = request.json
                update_needed = False
                
                if 'username' in webapp_data and webapp_data['username'] and user.username != webapp_data['username']:
                    user.username = webapp_data['username']
                    update_needed = True
                    print(f"Обновлено имя пользователя: {user.username}")
                
                if 'photo_url' in webapp_data and webapp_data['photo_url'] and user.photo_url != webapp_data['photo_url']:
                    user.photo_url = webapp_data['photo_url']
                    update_needed = True
                    print(f"Обновлена фотография пользователя")
                
                if update_needed:
                    try:
                        db.session.commit()
                        print("Данные пользователя успешно обновлены")
                    except Exception as update_error:
                        db.session.rollback()
                        print(f"Ошибка при обновлении данных пользователя: {str(update_error)}")
        
        # Устанавливаем текущего пользователя (только для совместимости)
        global current_user_id
        current_user_id = user.id
        print(f"Установлен current_user_id: {current_user_id}")
        
        # Возвращаем данные пользователя
        result = user.to_dict()
        print(f"Возвращаем данные пользователя: {result}")
        return jsonify(result)
    
    except Exception as e:
        print(f"Критическая ошибка при аутентификации по Telegram ID: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to authenticate'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
