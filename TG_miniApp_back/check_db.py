from main import app, db, User, GameRoom, GameHistory, team_a_players, team_b_players, game_room_players
from sqlalchemy import text

def check_database():
    with app.app_context():
        print("Проверка состояния базы данных...")
        
        # Проверяем количество пользователей
        user_count = User.query.count()
        print(f"Количество пользователей: {user_count}")
        
        # Проверяем количество игровых комнат
        game_room_count = GameRoom.query.count()
        print(f"Количество игровых комнат: {game_room_count}")
        
        # Проверяем количество записей истории игр
        game_history_count = GameHistory.query.count()
        print(f"Количество записей истории игр: {game_history_count}")
        
        # Проверяем, что таблицы созданы и доступны
        tables = ["users", "game_rooms", "game_history", "game_room_players", "team_a_players", "team_b_players", "complaints"]
        for table in tables:
            try:
                result = db.session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                print(f"Таблица '{table}' существует и доступна.")
            except Exception as e:
                print(f"Ошибка при проверке таблицы '{table}': {str(e)}")
        
        print("Проверка базы данных завершена.")

if __name__ == "__main__":
    check_database() 