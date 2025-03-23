from app import app
from models import db, Rehearsal, Response

with app.app_context():
    # First delete responses due to foreign key constraints
    Response.query.delete()
    
    # Then delete rehearsals
    Rehearsal.query.delete()
    
    # Commit the changes
    db.session.commit()
    
    print("All rehearsals and responses have been deleted.")