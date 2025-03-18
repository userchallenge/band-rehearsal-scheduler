# update_schema.py
from app import app
from models import db
from sqlalchemy import text

with app.app_context():
    # Create recurring_patterns table first
    try:
        db.session.execute(text('''
        CREATE TABLE IF NOT EXISTS recurring_patterns (
            id INTEGER PRIMARY KEY,
            recurring_type VARCHAR(20) NOT NULL,
            day_of_week VARCHAR(10),
            start_date DATE NOT NULL,
            end_date DATE,
            created_by_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        '''))
        print("Created recurring_patterns table")
    except Exception as e:
        print(f"Error creating recurring_patterns table: {str(e)}")
        db.session.rollback()

    # Add columns to rehearsals table
    try:
        # Check if time column exists before trying to add it
        result = db.session.execute(text("PRAGMA table_info(rehearsals)")).fetchall()
        columns = [row[1] for row in result]
        
        if 'time' not in columns:
            db.session.execute(text('ALTER TABLE rehearsals ADD COLUMN time TIME;'))
            print("Added time column to rehearsals table")
        else:
            print("time column already exists")
            
        if 'location' not in columns:
            db.session.execute(text('ALTER TABLE rehearsals ADD COLUMN location TEXT;'))
            print("Added location column to rehearsals table")
        else:
            print("location column already exists")
            
        if 'recurring_pattern_id' not in columns:
            db.session.execute(text('ALTER TABLE rehearsals ADD COLUMN recurring_pattern_id INTEGER REFERENCES recurring_patterns(id);'))
            print("Added recurring_pattern_id column to rehearsals table")
        else:
            print("recurring_pattern_id column already exists")
            
        # Commit all changes
        db.session.commit()
        print("Database schema updated successfully")
    except Exception as e:
        db.session.rollback()
        print(f"Error updating rehearsals table: {str(e)}")