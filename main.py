
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from datetime import datetime
import os
import random
import re
from locations import search_locations, get_all_locations

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://postgres:************@localhost:5000/tg_miniapp')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# ВАЖНО: Удалить перед релизом!
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
    score_mismatch_count = db.Column(db.Integer, default=0)
    
    def to_dict(self):
        return {        
            'id': self.id,
            'username': self.username,
            'photoUrl': self.photo_url,
            'score': self.score,
            'gamesPlayed': self.games_played,
            'gamesWon': self.games_won,
            'scoreMismatchCount': self.score_mismatch_count
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
    status = db.Column(db.String(20), default='waiting')
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
    score_submission_attempts = db.Column(db.Integer, default=0)
    score_mismatch = db.Column(db.Boolean, default=False)
    
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
            'players': [player.to_dict() for player in self.players],
            'status': self.status,
            'teamA': [player.to_dict() for player in self.team_a],
            'teamB': [player.to_dict() for player in self.team_b],
            'captainA': self.captain_a.to_dict() if self.captain_a else None,
            'captainB': self.captain_b.to_dict() if self.captain_b else None,
            'scoreA': self.score_a,
            'scoreB': self.score_b,
            'captainASubmitted': self.captain_a_submitted,
            'captainBSubmitted': self.captain_b_submitted,
            'scoreMismatch': self.score_mismatch,
            'scoreSubmissionAttempts': self.score_submission_attempts
        }

team_a_players = db.Table('team_a_players',
    db.Column('game_room_id', db.Integer, db.ForeignKey('game_rooms.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

team_b_players = db.Table('team_b_players',
    db.Column('game_room_id', db.Integer, db.ForeignKey('game_rooms.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

class GameHistory(db.Model):
    __tablename__ = 'game_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_room_id = db.Column(db.Integer, db.ForeignKey('game_rooms.id'), nullable=False)
    was_winner = db.Column(db.Boolean, default=False)
    team = db.Column(db.String(1))
    score_a = db.Column(db.Integer)
    score_b = db.Column(db.Integer)
    was_captain = db.Column(db.Boolean, default=False)
    result = db.Column(db.String(10))
    points_earned = db.Column(db.Integer, default=0)
    played_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='game_history')
    game_room = db.relationship('GameRoom')
    
    def to_dict(self):
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
            'playedAt': self.played_at.isoformat() if self.played_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

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
            'createdAt': self.created_at.isoformat()
        }

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
    global current_user_id
    
    if current_user_id is not None:
        user = User.query.get(current_user_id)
        if user:
            return jsonify(user.to_dict())
    
    user = User.query.first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if current_user_id is None:
        current_user_id = user.id
        
    return jsonify(user.to_dict())

# ВАЖНО: Это удалить этот эндпоинт перед релизом!
@app.route('/api/users/set-current/<int:user_id>', methods=['POST'])
def set_current_user(user_id):
    global current_user_id
    
    user = User.query.get_or_404(user_id)
    current_user_id = user.id
    return jsonify(user.to_dict())

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    if per_page > 50:
        per_page = 50
    
    total_users = User.query.count()
    
    users = User.query.order_by(User.score.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    users_json = [user.to_dict() for user in users]
    
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
    name_query = request.args.get('name', '')
    location_filter = request.args.get('location', '')
    time_range_filter = request.args.get('timeRange', '')
    
    query = GameRoom.query.filter(GameRoom.status != 'completed')
    
    if name_query:
        query = query.filter(GameRoom.name.ilike(f'%{name_query}%'))
    if location_filter:
        query = query.filter(GameRoom.location.ilike(f'%{location_filter}%'))
    if time_range_filter:
        query = query.filter(GameRoom.time_range.ilike(f'%{time_range_filter}%'))
    
    rooms = query.all()
    
    filtered_rooms = []
    for room in rooms:
        if len(room.players) < room.max_players:
            filtered_rooms.append(room)
    
    return jsonify([room.to_dict() for room in filtered_rooms])

@app.route('/api/game-rooms/<int:room_id>', methods=['GET'])
def get_game_room(room_id):
    room = GameRoom.query.get_or_404(room_id)
    return jsonify(room.to_dict())

@app.route('/api/game-rooms', methods=['POST'])
def create_game_room():
    data = request.json
    
    global current_user_id
    creator = User.query.get(current_user_id) if current_user_id else User.query.first()
    if not creator:
        return jsonify({'error': 'User not found'}), 404
    
    room = GameRoom(
        name=data.get('name'),
        creator_id=creator.id,
        max_players=data.get('maxPlayers', 16),
        location=data.get('location'),
        time_range=data.get('timeRange')
    )
    
    room.players.append(creator)
    
    db.session.add(room)
    db.session.commit()
    
    return jsonify(room.to_dict())

def is_user_in_any_game(user_id):
    return db.session.query(game_room_players).\
        join(GameRoom, game_room_players.c.game_room_id == GameRoom.id).\
        filter(game_room_players.c.user_id == user_id).\
        filter(GameRoom.status != 'completed').\
        first() is not None

@app.route('/api/game-rooms/<int:room_id>/join', methods=['POST'])
def join_game_room_with_check(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    global current_user_id
    user = User.query.get(current_user_id) if current_user_id else User.query.first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if len(room.players) >= room.max_players:
        return jsonify({'error': 'Room is full', 'roomIsFull': True}), 400
    
    if user in room.players:
        return jsonify({'message': 'Already in this room', 'room': room.to_dict()}), 200
    
    if is_user_in_any_game(user.id):
        active_rooms = []
        for active_room in GameRoom.query.filter(GameRoom.status != 'completed').all():
            if user in active_room.players:
                active_rooms.append(active_room.to_dict())
        
        return jsonify({
            'error': 'You are already in another game room',
            'activeRooms': active_rooms
        }), 400
    
    room.players.append(user)
    db.session.commit()
    
    is_room_full = len(room.players) >= room.max_players
    
    return jsonify({
        'room': room.to_dict(),
        'roomIsFull': is_room_full
    })

@app.route('/api/game-rooms/<int:room_id>/leave', methods=['POST'])
def leave_game_room(room_id):
    room = GameRoom.query.get(room_id)
    if not room:
        return jsonify({'error': 'Игровая комната не найдена'}), 404
    
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    is_player_in_room = False
    for player in room.players:
        if player.id == user.id:
            is_player_in_room = True
            break
    
    if not is_player_in_room:
        return jsonify({'error': 'Вы не являетесь участником этой комнаты'}), 403
    
    room.players.remove(user)
    
    if not room.players:
        db.session.delete(room)
        db.session.commit()
        return jsonify({'message': 'Вы покинули комнату. Комната удалена, так как в ней не осталось игроков.'})
    
    if room.creator_id == user.id:
        new_creator = random.choice(room.players)
        room.creator_id = new_creator.id
        
        if room.captain_a_id == user.id:
            room.captain_a_id = new_creator.id
        elif room.captain_b_id == user.id:
            room.captain_b_id = new_creator.id
    
    db.session.commit()
    
    return jsonify({'message': 'Вы успешно покинули комнату.'})

@app.route('/api/game-rooms/<int:room_id>', methods=['DELETE'])
def delete_game_room(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    global current_user_id
    current_user = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    if room.creator_id != current_user.id:
        return jsonify({'error': 'Только создатель комнаты может её удалить'}), 403
    
    db.session.delete(room)
    db.session.commit()
    
    return jsonify({'message': 'Комната успешно удалена'})

@app.route('/api/game-rooms/<int:room_id>/start-team-selection', methods=['POST'])
def start_team_selection(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    global current_user_id
    current_user = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    if room.creator_id != current_user.id:
        return jsonify({'error': 'Только создатель комнаты может начать выбор команд'}), 403
    
    if len(room.players) < 2:
        return jsonify({'error': 'Для начала выбора команд нужно минимум 2 игрока'}), 400
    
    room.status = 'team_selection'
    
    players = list(room.players)
    random.shuffle(players)
    
    half = len(players) // 2
    team_a = players[:half]
    team_b = players[half:]
    
    room.team_a = []
    room.team_b = []
    
    for player in team_a:
        room.team_a.append(player)
    
    for player in team_b:
        room.team_b.append(player)
    
    if team_a:
        room.captain_a_id = team_a[0].id
    
    if team_b:
        room.captain_b_id = team_b[0].id
    
    db.session.commit()
    
    return jsonify(room.to_dict())

@app.route('/api/game-rooms/<int:room_id>/start-game', methods=['POST'])
def start_game(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    global current_user_id
    current_user = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    if room.creator_id != current_user.id:
        return jsonify({'error': 'Только создатель комнаты может начать игру'}), 403
    
    if room.status != 'team_selection':
        return jsonify({'error': 'Комната должна быть в статусе выбора команд'}), 400
    
    room.status = 'in_progress'
    db.session.commit()
    
    return jsonify(room.to_dict())

@app.route('/api/game-rooms/<int:room_id>/end-game', methods=['POST'])
def end_game(room_id):
    room = GameRoom.query.get_or_404(room_id)
    
    global current_user_id
    current_user = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    if room.creator_id != current_user.id and room.captain_a_id != current_user.id and room.captain_b_id != current_user.id:
        return jsonify({'error': 'Только создатель комнаты или капитаны команд могут завершить игру'}), 403
    
    if room.status != 'in_progress':
        return jsonify({'error': 'Комната должна быть в статусе игры'}), 400
    
    room.status = 'score_submission'
    db.session.commit()
    
    return jsonify(room.to_dict())

@app.route('/api/game-rooms/<int:room_id>/submit-score', methods=['POST'])
def submit_score(room_id):
    data = request.json
    score = data.get('score')
    
    if not score or not re.match(r'^\d+-\d+$', score):
        return jsonify({'error': 'Некорректный формат счета, должно быть в формате A-B, например "3-2"'}), 400
    
    scores = score.split('-')
    try:
        score_a = int(scores[0])
        score_b = int(scores[1])
    except (ValueError, IndexError):
        return jsonify({'error': 'Неверный формат счета. Используйте формат "A-B", например "3-2"'}), 400
    
    room = GameRoom.query.get(room_id)
    if not room:
        return jsonify({'error': 'Игровая комната не найдена'}), 404
    
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    is_captain_a = room.captain_a_id == user.id
    is_captain_b = room.captain_b_id == user.id
    
    if not (is_captain_a or is_captain_b):
        return jsonify({'error': 'Только капитаны команд могут вводить счет'}), 403
    
    if is_captain_a:
        room.captain_a_score_submission = score
        room.captain_a_submitted = True
    elif is_captain_b:
        room.captain_b_score_submission = score
        room.captain_b_submitted = True
    
    if room.captain_a_submitted and room.captain_b_submitted:
        if room.captain_a_score_submission == room.captain_b_score_submission:
            room.score_a = score_a
            room.score_b = score_b
            
            room.status = 'completed'
            
            update_player_stats(room)
            
            db.session.commit()
            
            return jsonify({
                'message': 'Счет успешно принят. Игра завершена.',
                'room': room.to_dict(),
                'captainASubmitted': room.captain_a_submitted,
                'captainBSubmitted': room.captain_b_submitted
            })
        else:
            room.score_mismatch = True
            room.score_submission_attempts += 1
            
            if room.score_submission_attempts >= 3:
                apply_mismatch_penalties(room)
                
                room.score_a = 0
                room.score_b = 0
                room.status = 'completed'
                
                update_player_stats(room)
                
                db.session.commit()
                
                return jsonify({
                    'message': 'Превышено количество попыток ввода счета. Применены штрафы, игра завершена с ничьей.',
                    'room': room.to_dict(),
                    'captainASubmitted': False,
                    'captainBSubmitted': False
                })
            
            room.captain_a_submitted = False
            room.captain_b_submitted = False
            
            db.session.commit()
            
            return jsonify({
                'message': 'Введенные счета не совпадают. Пожалуйста, попробуйте еще раз.',
                'room': room.to_dict(),
                'captainASubmitted': room.captain_a_submitted,
                'captainBSubmitted': room.captain_b_submitted
            })
    
    db.session.commit()
    
    return jsonify({
        'message': 'Счет успешно отправлен. Ожидание ввода счета от другого капитана.',
        'room': room.to_dict(),
        'captainASubmitted': room.captain_a_submitted,
        'captainBSubmitted': room.captain_b_submitted
    })

def update_player_stats(room):
    team_a_won = room.score_a > room.score_b
    team_b_won = room.score_b > room.score_a
    is_draw = room.score_a == room.score_b
    
    for player in room.team_a:
        was_captain = player.id == room.captain_a_id
        
        player.games_played += 1
        
        points_earned = 0
        result = ""
        
        if team_a_won:
            player.games_won += 1
            points_earned = 100
            result = "win"
        elif team_b_won:
            points_earned = 25
            result = "loss"
        else:
            points_earned = 50
            result = "draw"
            
        player.score += points_earned
            
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
        db.session.add(game_history)
    
    for player in room.team_b:
        was_captain = player.id == room.captain_b_id
        
        player.games_played += 1
        
        points_earned = 0
        result = ""
        
        if team_b_won:
            player.games_won += 1
            points_earned = 100
            result = "win"
        elif team_a_won:
            points_earned = 25
            result = "loss"
        else:
            points_earned = 50
            result = "draw"
            
        player.score += points_earned
            
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
        db.session.add(game_history)

def apply_mismatch_penalties(room):
    captain_a = User.query.get(room.captain_a_id)
    captain_b = User.query.get(room.captain_b_id)
    
    def get_penalty_coefficient(captain):
        if not captain:
            return 1.0
        
        if captain.score_mismatch_count <= 1:
            return 0.0
        elif captain.score_mismatch_count == 2:
            return 0.5
        elif captain.score_mismatch_count == 3:
            return 1.0
        else:
            return 1.5
    
    captain_a_coef = get_penalty_coefficient(captain_a)
    captain_b_coef = get_penalty_coefficient(captain_b)
    
    penalty = 10
    
    for player in room.team_a:
        if player.id == room.captain_a_id:
            player.score -= int(penalty * captain_a_coef)
        else:
            player.score -= penalty
    
    for player in room.team_b:
        if player.id == room.captain_b_id:
            player.score -= int(penalty * captain_b_coef)
        else:
            player.score -= penalty
    
    for player in room.players:
        player.games_played += 1

@app.route('/api/game-rooms/<int:room_id>/report-player', methods=['POST'])
def report_player(room_id):
    room = GameRoom.query.get_or_404(room_id)
    data = request.json
    
    global current_user_id
    reporter = User.query.get(current_user_id) if current_user_id else User.query.first()
    
    if reporter not in room.players:
        return jsonify({'error': 'Вы не являетесь участником этой комнаты'}), 403
    
    reported_user_id = data.get('reportedUserId')
    reason = data.get('reason')
    
    if not reported_user_id or not reason:
        return jsonify({'error': 'Не указан пользователь или причина жалобы'}), 400
    
    reported_user = User.query.get(reported_user_id)
    if not reported_user or reported_user not in room.players:
        return jsonify({'error': 'Указанный пользователь не найден или не является участником комнаты'}), 404
    
    complaint = Complaint(
        reporter_id=reporter.id,
        reported_user_id=reported_user_id,
        game_room_id=room_id,
        reason=reason
    )
    
    db.session.add(complaint)
    db.session.commit()
    
    return jsonify({'message': 'Жалоба успешно отправлена'}), 201

@app.cli.command("init-db")
def init_db():
    db.create_all()
    
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
        
        if GameRoom.query.count() == 0:
            alex = User.query.filter_by(username="Alex").first()
            maria = User.query.filter_by(username="Maria").first()
            
            rooms = [
                GameRoom(name="Champions League", creator_id=alex.id, max_players=16, location="Madrid", time_range="2-5 min"),
                GameRoom(name="Premier League", creator_id=maria.id, max_players=16, location="London", time_range="5-10 min"),
            ]
            db.session.add_all(rooms)
            db.session.commit()
            
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

@app.route('/api/user-active-rooms', methods=['GET'])
def get_user_active_rooms():
    global current_user_id
    user = User.query.get(current_user_id) if current_user_id else User.query.first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
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
    if not current_user_id:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    history = GameHistory.query.filter_by(user_id=current_user_id).order_by(GameHistory.created_at.desc()).all()
    
    return jsonify([entry.to_dict() for entry in history])

@app.route('/api/locations/search', methods=['GET'])
def search_location():
    query = request.args.get('query', '')
    
    if not query:
        return jsonify([])
    
    matching_locations = search_locations(query)
    
    return jsonify(matching_locations[:10])

@app.route('/api/locations', methods=['GET'])
def get_locations():
    return jsonify(get_all_locations())

if __name__ == '__main__':
    app.run(debug=True, port=5001)