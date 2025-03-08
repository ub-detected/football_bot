from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)


users = []
game_rooms = []

class User:
    def __init__(self, id, username, photo_url, telegram_id, score=0, games_played=0, games_won=0):
        self.id = id
        self.username = username
        self.photo_url = photo_url
        self.score = score
        self.games_played = games_played
        self.games_won = games_won
        self.telegram_id = telegram_id
        self.created_at = datetime.utcnow()

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'photoUrl': self.photo_url,
            'score': self.score,
            'gamesPlayed': self.games_played,
            'gamesWon': self.games_won
        }

class GameRoom:
    def __init__(self, id, name, creator_id, max_players=16, location=None, time_range=None):
        self.id = id
        self.name = name
        self.creator_id = creator_id
        self.max_players = max_players
        self.location = location
        self.time_range = time_range
        self.created_at = datetime.utcnow()
        self.players = []

    def to_dict(self):
        creator = next((user for user in users if user.id == self.creator_id), None)
        return {
            'id': self.id,
            'name': self.name,
            'creator': creator.to_dict() if creator else None,
            'players': [player.to_dict() for player in self.players],
            'maxPlayers': self.max_players,
            'location': self.location,
            'timeRange': self.time_range
        }

@app.route('/')
def index():
    return "Сервер работает!"

@app.route('/users', methods=['GET'])
def get_users():
    return jsonify([user.to_dict() for user in users])


@app.route('/users', methods=['POST'])
def create_user():
    data = request.json
    new_user = User(
        id=len(users) + 1,
        username=data['username'],
        photo_url=data.get('photo_url'),
        telegram_id=data['telegram_id']
    )
    users.append(new_user)
    return jsonify(new_user.to_dict()), 201


if __name__ == '__main__':
    app.run(debug=True)