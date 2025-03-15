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
        
        # Тестовые пользователи больше не добавляются
        print("Инициализация без тестовых пользователей (по запросу клиента)")
      
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