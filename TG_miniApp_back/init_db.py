from main import app, db, User, GameRoom, GameHistory, team_a_players, team_b_players, game_room_players
from sqlalchemy import text
import os

def initialize_database():
    with app.app_context():
        print("Начинаю инициализацию базы данных...")
        
        # Проверяем, нужно ли сбросить базу данных
        reset_db = os.environ.get('RESET_DB', 'false').lower() == 'true'
        
        if reset_db:
            print("🔄 RESET_DB=true: Сбрасываем все таблицы базы данных...")
            try:
                # Удаление всех таблиц
                db.drop_all()
                print("✅ Все таблицы успешно удалены")
                
                # Пересоздание таблиц
                db.create_all()
                print("✅ Таблицы созданы заново")
            except Exception as e:
                print(f"❌ Ошибка при сбросе базы данных: {e}")
        
        # Создаем таблицы, если они еще не существуют
        db.create_all()
        
        # Добавляем тестовые данные, только если база данных пуста или была сброшена
        if reset_db or User.query.count() == 0:
            print("Добавление тестовых пользователей в базу данных...")
            users = [
                User(username="Alex228", photo_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", score=2500, games_played=120, games_won=45),
                User(username="Maria", photo_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", score=2300, games_played=100, games_won=40),
                User(username="John", photo_url="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150", score=2100, games_played=90, games_won=35),
                User(username="Sarah", photo_url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150", score=2000, games_played=80, games_won=30),
                User(username="Mike", photo_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150", score=1900, games_played=70, games_won=25),
            ]
            db.session.add_all(users)
            db.session.commit()
            print(f"Добавлено {len(users)} тестовых пользователей.")
        elif reset_db:
            print("База данных была очищена, но пользователи не были добавлены, потому что переменная окружения INIT_TEST_DATA не установлена.")
      
        tables = ["users", "game_rooms", "game_history", "game_room_players", "team_a_players", "team_b_players", "complaints"]
        for table in tables:
            try:
                result = db.session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                print(f"Таблица '{table}' успешно создана и доступна.")
            except Exception as e:
                print(f"Ошибка при проверке таблицы '{table}': {str(e)}")
        
        print("База данных успешно инициализирована!")
        
        # Выводим статистику базы данных
        print("\n===== Статистика базы данных =====")
        print(f"Количество пользователей: {User.query.count()}")
        print(f"Количество игровых комнат: {GameRoom.query.count() if 'game_rooms' in [t.name for t in db.metadata.tables.values()] else 'Таблица не существует'}")
        print(f"Количество записей истории игр: {GameHistory.query.count() if 'game_history' in [t.name for t in db.metadata.tables.values()] else 'Таблица не существует'}")
        print("=================================\n")

if __name__ == "__main__":
    initialize_database() 