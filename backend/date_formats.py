# fix_date_formats.py
from app import app
from models import db, Rehearsal
from datetime import datetime

with app.app_context():
    try:
        # Get all rehearsals
        rehearsals = Rehearsal.query.all()
        
        # Update each rehearsal's date format
        for rehearsal in rehearsals:
            # If date is a datetime string, convert it to a date object
            if isinstance(rehearsal.date, str):
                try:
                    rehearsal.date = datetime.strptime(rehearsal.date, '%Y-%m-%d %H:%M:%S.%f').date()
                except ValueError:
                    try:
                        rehearsal.date = datetime.strptime(rehearsal.date, '%Y-%m-%d').date()
                    except ValueError:
                        print(f"Could not parse date: {rehearsal.date}")
            # If it's already a datetime object, just get the date part
            elif hasattr(rehearsal.date, 'date'):
                rehearsal.date = rehearsal.date.date()
                
        # Commit the changes
        db.session.commit()
        print("Date formats fixed successfully")
    except Exception as e:
        db.session.rollback()
        print(f"Error fixing date formats: {str(e)}")