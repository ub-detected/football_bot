from main import app, db, User, GameRoom, GameHistory, team_a_players, team_b_players, game_room_players
from sqlalchemy import text
import os
import sys

def initialize_database():
    with app.app_context():
        print("\n==== НАЧАЛО ИНИЦИАЛИЗАЦИИ БАЗЫ ДАННЫХ ====")
        
        reset_db = os.environ.get('RESET_DB', 'false').lower() == 'true'
        
        print(f"RESET_DB установлен в: {reset_db} (значение переменной: {os.environ.get('RESET_DB', 'не установлено')})")
        
        if reset_db:
            print("🔄 RESET_DB=true: Выполняем полный сброс всех таблиц базы данных...")
            try:
                db.session.close()
                
                db.drop_all()
                print("✅ Все таблицы успешно удалены")
                
                db.create_all()
                print("✅ Таблицы созданы заново")
                
                users_count = User.query.count()
                if users_count > 0:
                    print(f"⚠️ ПРЕДУПРЕЖДЕНИЕ: После сброса базы в ней все еще есть {users_count} пользователей!")
                else:
                    print("✅ База данных успешно очищена, пользователей нет")
            except Exception as e:
                print(f"❌ КРИТИЧЕСКАЯ ОШИБКА при сбросе базы данных: {e}")
                import traceback
                print(traceback.format_exc())
                sys.exit(1)
        else:
            print("ℹ️ RESET_DB не установлен в true, пропускаем сброс базы данных")
            users_count = User.query.count()
            print(f"ℹ️ Текущее количество пользователей в базе: {users_count}")
        
        db.create_all()
        
        print("ℹ️ Инициализация без создания тестовых пользователей (по запросу клиента)")
      
        # Обновление очков для конкретных пользователей
        try:
            # Пользователь verevka8
            verevka8 = User.query.filter_by(username='verevka8').first()
            if verevka8:
                verevka8.score = -52
                print(f"✅ Пользователю {verevka8.username} установлено значение очков: -52")
            else:
                print(f"⚠️ Пользователь verevka8 не найден в базе данных")
            
            # Пользователь kartoska_bs
            kartoska_bs = User.query.filter_by(username='kartoska_bs').first()
            if kartoska_bs:
                kartoska_bs.score = 228000
                print(f"✅ Пользователю {kartoska_bs.username} установлено значение очков: 228000")
            else:
                print(f"⚠️ Пользователь kartoska_bs не найден в базе данных")
            
            # Сохраняем изменения
            if verevka8 or kartoska_bs:
                db.session.commit()
                print("✅ Изменения успешно сохранены в базе данных")
        except Exception as e:
            db.session.rollback()
            print(f"❌ ОШИБКА при обновлении очков пользователей: {e}")
            import traceback
            print(traceback.format_exc())
      
        tables = ["users", "game_rooms", "game_history", "game_room_players", "team_a_players", "team_b_players", "complaints"]
        for table in tables:
            try:
                result = db.session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                print(f"✅ Таблица '{table}' успешно создана и доступна.")
            except Exception as e:
                print(f"⚠️ Ошибка при проверке таблицы '{table}': {str(e)}")
        
        print("\n===== СТАТИСТИКА БАЗЫ ДАННЫХ =====")
        print(f"Количество пользователей: {User.query.count()}")
        print(f"Количество игровых комнат: {GameRoom.query.count() if 'game_rooms' in [t.name for t in db.metadata.tables.values()] else 'Таблица не существует'}")
        print(f"Количество записей истории игр: {GameHistory.query.count() if 'game_history' in [t.name for t in db.metadata.tables.values()] else 'Таблица не существует'}")
        print("=================================\n")
        print("==== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ЗАВЕРШЕНА ====\n")

if __name__ == "__main__":
    initialize_database() 