from main import app, db, User

with app.app_context():
    print('Структура модели User:')
    for column in User.__table__.columns:
        print(f"- {column.name}: {column.type}") 