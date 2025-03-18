# reset_db.py
# WARNING: This script deletes all existing data and recreates the database

import os
from app import app, db
from models import User, Rehearsal, Response
from datetime import datetime, time, timedelta
import sys

def reset_database():
    print("Resetting database...")
    
    # Get the database file path from the app configuration
    db_uri = app.config['SQLALCHEMY_DATABASE_URI']
    if db_uri.startswith('sqlite:///'):
        db_path = db_uri.replace('sqlite:///', '')
        # If path is relative, adjust accordingly
        if not os.path.isabs(db_path):
            db_path = os.path.join(os.path.dirname(__file__), db_path)
        
        print(f"Database file: {db_path}")
        
        # Delete the database file if it exists
        if os.path.exists(db_path):
            print(f"Deleting existing database file...")
            os.remove(db_path)
            print(f"Deleted existing database: {db_path}")
    
    with app.app_context():
        # Drop all tables and create them again with the new schema
        print("Dropping all tables...")
        db.drop_all()
        print("Creating all tables with new schema...")
        db.create_all()
        
        # Create admin user
        print("Creating admin user...")
        admin = User(
            username='admin',
            email='admin@example.com',
            is_admin=True
        )
        admin.set_password('change-me-immediately')  # Change in production
        db.session.add(admin)
        
        # Create a regular user
        user = User(
            username='user',
            email='user@example.com',
            first_name='Regular',
            last_name='User',
            is_admin=False
        )
        user.set_password('password')  # Change in production
        db.session.add(user)
        
        # Commit the users first
        try:
            db.session.commit()
            print("Added initial users")
        except Exception as e:
            db.session.rollback()
            print(f"Error adding users: {str(e)}")
            return
        
        # Create some initial rehearsals
        print("Creating initial rehearsals...")
        today = datetime.now().date()
        
        # Make sure we're creating proper datetime objects with the full fields
        rehearsals_to_add = []
        for i in range(0, 5):  # Next 5 weeks
            rehearsal_date = datetime.combine(today + timedelta(days=i*7), datetime.min.time())
            rehearsal = Rehearsal(
                date=rehearsal_date,
                start_time=time(19, 0),  # 7:00 PM
                end_time=time(20, 0),    # 8:00 PM
                title=f"Rehearsal {i+1}"
            )
            rehearsals_to_add.append(rehearsal)
            db.session.add(rehearsal)
        
        # Commit the rehearsals
        try:
            db.session.commit()
            print("Added initial rehearsals")
        except Exception as e:
            db.session.rollback()
            print(f"Error adding rehearsals: {str(e)}")
            return
        
        # Create responses for each user and rehearsal
        print("Creating responses...")
        users = User.query.all()
        
        for rehearsal in rehearsals_to_add:
            for user in users:
                response = Response(
                    user=user,
                    rehearsal=rehearsal,
                    attending=True
                )
                db.session.add(response)
        
        # Commit the responses
        try:
            db.session.commit()
            print("Added default responses for all users and rehearsals")
        except Exception as e:
            db.session.rollback()
            print(f"Error adding responses: {str(e)}")
            return
        
        print("Database reset completed successfully!")

if __name__ == "__main__":
    reset_database()