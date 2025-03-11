from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from datetime import datetime
import os
import random
import json

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost/tg_miniapp')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Глобальная переменная для текущего пользователя (для тестирования)
current_user_id = None

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
    is_active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'photoUrl': self.photo_url,
            'score': self.score,
            'gamesPlayed': self.games_played,
            'gamesWon': self.games_won,
            'telegramId': self.telegram_id,
            'createdAt': self.created_at.isoformat(),
            'isActive': self.is_active
        }

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
    status = db.Column(db.String(20), default='waiting')  # waiting, in_progress, completed
    description = db.Column(db.String(255), default="No description")
    
    creator = db.relationship('User', backref='created_rooms')
    players = db.relationship('User', secondary=game_room_players, backref='joined_rooms')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'creator': self.creator.to_dict() if self.creator else None,
            'players': [player.to_dict() for player in self.players],
            'maxPlayers': self.max_players,
            'location': self.location,
            'timeRange': self.time_range,
            'status': self.status,
            'playerCount': len(self.players),
            'createdAt': self.created_at.isoformat(),
            'description': self.description
        }

@app.route('/')
def index():
    return "Сервер работает!"

@app.route('/api/users', methods=['GET'])
def get_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    users = User.query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'users': [user.to_dict() for user in users.items],
        'total': users.total,
        'pages': users.pages,
        'currentPage': page
    })

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@app.route('/api/users/me', methods=['GET'])
def get_current_user():
    global current_user_id
    if current_user_id is not None:
        user = User.query.get(current_user_id)
        if user and user.is_active:
            return jsonify(user.to_dict())
    user = User.query.filter_by(is_active=True).first()
    if not user:
        return jsonify({'error': 'No active users found'}), 404
    current_user_id = user.id
    return jsonify(user.to_dict())

@app.route('/api/users/set-current/<int:user_id>', methods=['POST'])
def set_current_user(user_id):
    global current_user_id
    user = User.query.get_or_404(user_id)
    if not user.is_active:
        return jsonify({'error': 'User is not active'}), 403
    current_user_id = user.id
    return jsonify({
        'message': 'Текущий пользователь установлен',
        'user': user.to_dict()
    })

@app.route('/api/users/<int:user_id>/deactivate', methods=['POST'])
def deactivate_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = False
    db.session.commit()
    return jsonify({
        'message': 'Пользователь деактивирован',
        'user': user.to_dict()
    })

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    limit = request.args.get('limit', default=10, type=int)
    top_users = User.query.filter_by(is_active=True).order_by(User.score.desc()).limit(limit).all()
    return jsonify({
        'leaderboard': [user.to_dict() for user in top_users],
        'total': len(top_users)
    })

@app.route('/api/game-rooms', methods=['GET'])
def get_game_rooms():
    name_filter = request.args.get('name', '')
    status_filter = request.args.get('status', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    query = GameRoom.query
    if name_filter:
        query = query.filter(GameRoom.name.ilike(f'%{name_filter}%'))
    if status_filter:
        query = query.filter(GameRoom.status == status_filter)
    
    rooms = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'rooms': [room.to_dict() for room in rooms.items],
        'total': rooms.total,
        'pages': rooms.pages,
        'currentPage': page
    })

@app.route('/api/game-rooms/<int:room_id>', methods=['GET'])
def get_game_room(room_id):
    room = GameRoom.query.get_or_404(room_id)
    return jsonify(room.to_dict())

@app.route('/api/game-rooms', methods=['POST'])
def create_game_room():
    data = request.json
    global current_user_id
    
    creator = User.query.get(current_user_id) if current_user_id else User.query.filter_by(is_active=True).first()
    if not creator:
        return jsonify({'error': 'Нет активных пользователей для создания комнаты'}), 404
    
    if not data.get('name'):
        return jsonify({'error': 'Название комнаты обязательно'}), 400
    
    new_room = GameRoom(
        name=data.get('name'),
        creator_id=creator.id,
        max_players=data.get('maxPlayers', 16),
        location=data.get('location'),
        time_range=data.get('timeRange'),
        description=data.get('description', 'Нет описания')
    )
    
    new_room.players.append(creator)
    db.session.add(new_room)
    db.session.commit()
    
    return jsonify({
        'message': 'Комната успешно создана',
        'room': new_room.to_dict()
    }), 201

@app.route('/api/game-rooms/<int:room_id>/join', methods=['POST'])
def join_game_room(room_id):
    room = GameRoom.query.get_or_404(room_id)
    global current_user_id
    
    user = User.query.get(current_user_id) if current_user_id else User.query.filter_by(is_active=True).first()
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    if not user.is_active:
        return jsonify({'error': 'Пользователь неактивен'}), 403
        
    if room.status != 'waiting':
        return jsonify({'error': f'Нельзя присоединиться к комнате в статусе {room.status}'}), 400
    
    if user in room.players:
        return jsonify({'message': 'Вы уже в этой комнате', 'room': room.to_dict()}), 200
    
    if len(room.players) >= room.max_players:
        return jsonify({'error': 'Комната заполнена'}), 400
    
    room.players.append(user)
    db.session.commit()
    return jsonify({
        'message': 'Успешно присоединились к комнате',
        'room': room.to_dict()
    })

@app.route('/api/game-rooms/<int:room_id>/leave', methods=['POST'])
def leave_game_room(room_id):
    room = GameRoom.query.get_or_404(room_id)
    global current_user_id
    
    user = User.query.get(current_user_id) if current_user_id else User.query.filter_by(is_active=True).first()
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    if user not in room.players:
        return jsonify({'error': 'Вы не в этой комнате'}), 400
    
    room.players.remove(user)
    
    if len(room.players) == 0:
        db.session.delete(room)
        db.session.commit()
        return jsonify({'message': 'Комната удалена, так как стала пустой'})
    
    if room.creator_id == user.id:
        new_creator = random.choice(room.players)
        room.creator_id = new_creator.id
        db.session.commit()
        return jsonify({
            'message': 'Вы покинули комнату, создатель изменён',
            'newCreator': new_creator.to_dict(),
            'room': room.to_dict()
        })
    
    db.session.commit()
    return jsonify({
        'message': 'Вы успешно покинули комнату',
        'room': room.to_dict()
    })

@app.route('/api/game-rooms/<int:room_id>/start', methods=['POST'])
def start_game(room_id):
    room = GameRoom.query.get_or_404(room_id)
    global current_user_id
    
    user = User.query.get(current_user_id) if current_user_id else User.query.filter_by(is_active=True).first()
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    if room.creator_id != user.id:
        return jsonify({'error': 'Только создатель может начать игру'}), 403
    
    if room.status != 'waiting':
        return jsonify({'error': 'Игра уже начата или завершена'}), 400
    
    if len(room.players) < 2:
        return jsonify({'error': 'Для начала игры нужно минимум 2 игрока'}), 400
        
    room.status = 'in_progress'
    db.session.commit()
    return jsonify({
        'message': 'Игра успешно начата',
        'room': room.to_dict()
    })

@app.route('/api/game-rooms/<int:room_id>/end', methods=['POST'])
def end_game(room_id):
    room = GameRoom.query.get_or_404(room_id)
    global current_user_id
    
    user = User.query.get(current_user_id) if current_user_id else User.query.filter_by(is_active=True).first()
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    if room.creator_id != user.id:
        return jsonify({'error': 'Только создатель может завершить игру'}), 403
    
    if room.status != 'in_progress':
        return jsonify({'error': 'Игра не в процессе'}), 400
        
    room.status = 'completed'
    db.session.commit()
    return jsonify({
        'message': 'Игра успешно завершена',
        'room': room.to_dict()
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    total_rooms = GameRoom.query.count()
    active_rooms = GameRoom.query.filter(GameRoom.status == 'in_progress').count()
    
    return jsonify({
        'totalUsers': total_users,
        'activeUsers': active_users,
        'totalRooms': total_rooms,
        'activeRooms': active_rooms,
        'timestamp': datetime.utcnow().isoformat()
    })

@app.cli.command("init-db")
def init_db():
    db.create_all()
    
    if User.query.count() == 0:
        users = [
            User(username="Alex", telegram_id="12345", photo_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", score=2500, games_played=120, games_won=45),
            User(username="Maria", telegram_id="12346", photo_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", score=2300, games_played=100, games_won=40),
            User(username="John", telegram_id="12347", photo_url="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150", score=2100, games_played=90, games_won=35),
            User(username="Sarah", telegram_id="12348", photo_url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150", score=2000, games_played=80, games_won=30),
            User(username="Mike", telegram_id="12349", photo_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150", score=1900, games_played=70, games_won=25),
        ]
        db.session.add_all(users)
        db.session.commit()
        
        if GameRoom.query.count() == 0:
            alex = User.query.filter_by(username="Alex").first()
            maria = User.query.filter_by(username="Maria").first()
            
            rooms = [
                GameRoom(name="Champions League", creator_id=alex.id, max_players=16, location="Madrid", time_range="2-5 min", description="Турнир чемпионов"),
                GameRoom(name="Premier League", creator_id=maria.id, max_players=16, location="London", time_range="5-10 min", description="Лига лучших"),
            ]
            db.session.add_all(rooms)
            db.session.commit()
            
            champions_league = GameRoom.query.filter_by(name="Champions League").first()
            premier_league = GameRoom.query.filter_by(name="Premier League").first()
            
            for user in User.query.filter(User.username.in_(["Alex", "Maria", "John", "Sarah"])).all():
                champions_league.players.append(user)
            
            for user in User.query.filter(User.username.in_(["Maria", "Mike", "John", "Sarah", "Alex"])).all():
                premier_league.players.append(user)
            
            db.session.commit()
    
    print("База данных инициализирована с тестовыми данными!")

if __name__ == '__main__':
    app.run(debug=True, port=5001)