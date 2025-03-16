from app import app, db
from models import User

with app.app_context():
    db.create_all()
    
    # Create admin user
    admin = User(
        username='admin',
        email='admin@example.com',
        is_admin=True
    )
    admin.set_password('change-me-immediately')
    db.session.add(admin)
    db.session.commit()
    print("Database initialized and admin user created!")