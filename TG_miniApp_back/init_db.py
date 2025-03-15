from main import app, db, User, GameRoom, GameHistory, team_a_players, team_b_players, game_room_players
from sqlalchemy import text
import os
import sys

def initialize_database():
    with app.app_context():
        print("\n==== НАЧАЛО ИНИЦИАЛИЗАЦИИ БАЗЫ ДАННЫХ ====")
        
        # Проверяем, нужно ли сбросить базу данных
        reset_db = os.environ.get('RESET_DB', 'false').lower() == 'true'
        
        print(f"RESET_DB установлен в: {reset_db} (значение переменной: {os.environ.get('RESET_DB', 'не установлено')})")
        
        if reset_db:
            print("🔄 RESET_DB=true: Выполняем полный сброс всех таблиц базы данных...")
            try:
                # Принудительно отключаем все активные соединения с таблицами
                db.session.close()
                
                # Удаление всех таблиц
                db.drop_all()
                print("✅ Все таблицы успешно удалены")
                
                # Пересоздание таблиц
                db.create_all()
                print("✅ Таблицы созданы заново")
                
                # Проверка, что база действительно пуста
                users_count = User.query.count()
                if users_count > 0:
                    print(f"⚠️ ПРЕДУПРЕЖДЕНИЕ: После сброса базы в ней все еще есть {users_count} пользователей!")
                else:
                    print("✅ База данных успешно очищена, пользователей нет")
            except Exception as e:
                print(f"❌ КРИТИЧЕСКАЯ ОШИБКА при сбросе базы данных: {e}")
                import traceback
                print(traceback.format_exc())
                sys.exit(1)  # Выход с ошибкой, чтобы остановить процесс запуска
        else:
            print("ℹ️ RESET_DB не установлен в true, пропускаем сброс базы данных")
            # Проверяем, есть ли уже пользователи
            users_count = User.query.count()
            print(f"ℹ️ Текущее количество пользователей в базе: {users_count}")
        
        # Создаем таблицы, если они еще не существуют
        db.create_all()
        
        # Тестовые пользователи больше не добавляются
        print("ℹ️ Инициализация без создания тестовых пользователей (по запросу клиента)")
      
        # Проверяем таблицы
        tables = ["users", "game_rooms", "game_history", "game_room_players", "team_a_players", "team_b_players", "complaints"]
        for table in tables:
            try:
                result = db.session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                print(f"✅ Таблица '{table}' успешно создана и доступна.")
            except Exception as e:
                print(f"⚠️ Ошибка при проверке таблицы '{table}': {str(e)}")
        
        # Выводим статистику базы данных
        print("\n===== СТАТИСТИКА БАЗЫ ДАННЫХ =====")
        print(f"Количество пользователей: {User.query.count()}")
        print(f"Количество игровых комнат: {GameRoom.query.count() if 'game_rooms' in [t.name for t in db.metadata.tables.values()] else 'Таблица не существует'}")
        print(f"Количество записей истории игр: {GameHistory.query.count() if 'game_history' in [t.name for t in db.metadata.tables.values()] else 'Таблица не существует'}")
        print("=================================\n")
        print("==== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ЗАВЕРШЕНА ====\n")

if __name__ == "__main__":
    initialize_database() 