from app import app, db
from models import Invitation  # Make sure to import your Invitation model

with app.app_context():
    db.create_all()
    print("Database schema updated successfully!")