from app import app
from models import User, db

with app.app_context():
    users = User.query.all()
    print(f"Total users: {len(users)}")
    for user in users:
        print(f"User: {user.username}, Admin: {user.is_admin}")