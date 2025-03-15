from main import app, db, User, GameRoom, GameHistory, team_a_players, team_b_players, game_room_players
from sqlalchemy import text

def initialize_database():
    with app.app_context():
        print("Начинаю инициализацию базы данных...")
        
        db.create_all()
        print("Таблицы созданы.")
      
        user_count = User.query.count()
        print(f"Текущее количество пользователей: {user_count}")
        
        # Больше не создаем тестовых пользователей
        # Пользователи будут создаваться автоматически при входе через Telegram
        print("Тестовые пользователи не создаются. Пользователи будут создаваться при входе через Telegram.")
        
        # Проверяем, что все необходимые таблицы созданы
        tables = ["users", "game_rooms", "game_history", "game_room_players", "team_a_players", "team_b_players", "complaints"]
        for table in tables:
            try:
                result = db.session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                print(f"Таблица '{table}' успешно создана и доступна.")
            except Exception as e:
                print(f"Ошибка при проверке таблицы '{table}': {str(e)}")
        
        print("База данных успешно инициализирована!")

if __name__ == "__main__":
    initialize_database() 