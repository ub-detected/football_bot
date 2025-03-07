from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Конфигурация базы данных
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost/tg_miniapp')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Модели базы данных
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
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'photoUrl': self.photo_url,
            'score': self.score,
            'gamesPlayed': self.games_played,
            'gamesWon': self.games_won
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
    
    creator = db.relationship('User', backref='created_rooms')
    players = db.relationship('User', secondary=game_room_players, backref='joined_rooms')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'creator': self.creator.to_dict(),
            'players': [player.to_dict() for player in self.players],
            'maxPlayers': self.max_players,
            'location': self.location,
            'timeRange': self.time_range
        }

# Маршруты API

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
    # В реальном приложении здесь должна быть аутентификация через Telegram
    # Для демонстрации возвращаем первого пользователя
    user = User.query.first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    top_users = User.query.order_by(User.score.desc()).limit(10).all()
    return jsonify([user.to_dict() for user in top_users])

@app.route('/api/game-rooms', methods=['GET'])
def get_game_rooms():
    rooms = GameRoom.query.all()
    return jsonify([room.to_dict() for room in rooms])

@app.route('/api/game-rooms', methods=['POST'])
def create_game_room():
    data = request.json
    
    # В реальном приложении здесь должна быть аутентификация
    creator = User.query.first()
    if not creator:
        return jsonify({'error': 'Creator not found'}), 404
    
    new_room = GameRoom(
        name=data.get('name'),
        creator_id=creator.id,
        max_players=data.get('maxPlayers', 16),
        location=data.get('location'),
        time_range=data.get('timeRange')
    )
    
    db.session.add(new_room)
    db.session.commit()
    
    # Добавляем создателя как первого игрока
    new_room.players.append(creator)
    db.session.commit()
    
    return jsonify(new_room.to_dict()), 201

@app.route('/api/game-rooms/<int:room_id>/join', methods=['POST'])
def join_game_room(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    # В реальном приложении здесь должна быть аутентификация
    user = User.query.first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user in room.players:
        return jsonify({'message': 'Already joined this room'}), 400
    
    if len(room.players) >= room.max_players:
        return jsonify({'error': 'Room is full'}), 400
    
    room.players.append(user)
    db.session.commit()
    
    return jsonify(room.to_dict())

@app.route('/api/game-rooms/<int:room_id>/leave', methods=['POST'])
def leave_game_room(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    # В реальном приложении здесь должна быть аутентификация
    user = User.query.first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user not in room.players:
        return jsonify({'message': 'Not in this room'}), 400
    
    room.players.remove(user)
    db.session.commit()
    
    return jsonify(room.to_dict())

# Инициализация базы данных с тестовыми данными
@app.cli.command("init-db")
def init_db():
    db.create_all()
    
    # Создаем тестовых пользователей, если их нет
    if User.query.count() == 0:
        users = [
            User(username="Alex", photo_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", score=2500, games_played=120, games_won=45),
            User(username="Maria", photo_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", score=2300, games_played=100, games_won=40),
            User(username="John", photo_url="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150", score=2100, games_played=90, games_won=35),
            User(username="Sarah", photo_url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150", score=2000, games_played=80, games_won=30),
            User(username="Mike", photo_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150", score=1900, games_played=70, games_won=25),
        ]
        db.session.add_all(users)
        db.session.commit()
        
        # Создаем тестовые игровые комнаты
        if GameRoom.query.count() == 0:
            alex = User.query.filter_by(username="Alex").first()
            maria = User.query.filter_by(username="Maria").first()
            
            rooms = [
                GameRoom(name="Champions League", creator_id=alex.id, max_players=16, location="Madrid", time_range="2-5 min"),
                GameRoom(name="Premier League", creator_id=maria.id, max_players=16, location="London", time_range="5-10 min"),
            ]
            db.session.add_all(rooms)
            db.session.commit()
            
            # Добавляем игроков в комнаты
            champions_league = GameRoom.query.filter_by(name="Champions League").first()
            premier_league = GameRoom.query.filter_by(name="Premier League").first()
            
            champions_league.players.append(alex)
            champions_league.players.append(maria)
            champions_league.players.append(User.query.filter_by(username="John").first())
            champions_league.players.append(User.query.filter_by(username="Sarah").first())
            
            premier_league.players.append(maria)
            premier_league.players.append(User.query.filter_by(username="Mike").first())
            premier_league.players.append(User.query.filter_by(username="John").first())
            premier_league.players.append(User.query.filter_by(username="Sarah").first())
            premier_league.players.append(User.query.filter_by(username="Alex").first())
            
            db.session.commit()
    
    print("База данных инициализирована!")

if __name__ == '__main__':
    app.run(debug=True)
