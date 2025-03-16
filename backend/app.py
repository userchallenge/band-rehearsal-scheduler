# app.py
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from apscheduler.schedulers.background import BackgroundScheduler
from email_service import send_rehearsal_summary
from models import db, User, Rehearsal, Response, LogEntry

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')  # Change in production
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///bandapp.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')  # Change in production
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
# More permissive CORS configuration to allow all routes from localhost:3000
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

# Set up scheduler for weekly emails
scheduler = BackgroundScheduler()
scheduler.add_job(send_rehearsal_summary, 'cron', day_of_week='mon', hour=8, minute=0)
scheduler.start()

# Create tables and initialize admin user
@app.before_request
def create_tables_if_not_exist():
    # Only run once
    if not hasattr(app, '_got_first_request'):
        with app.app_context():
            db.create_all()
            # Create admin user if it doesn't exist
            if not User.query.filter_by(username='admin').first():
                admin = User(
                    username='admin',
                    email='admin@example.com',
                    is_admin=True
                )
                admin.set_password('change-me-immediately')  # Change in production
                db.session.add(admin)
                db.session.commit()
                print("Admin user created successfully!")

# Helper function to get current user from token
def get_user_from_token():
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    
    try:
        # Simple extraction from token
        import jwt as pyjwt
        secret_key = app.config['JWT_SECRET_KEY']
        decoded = pyjwt.decode(token, secret_key, algorithms=["HS256"], options={"verify_signature": False})
        user_id = decoded.get('sub')
        
        if user_id:
            # Try to convert to int if it's a string number
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                pass
            
            # Get the user from database
            return User.query.get(user_id)
    except Exception as e:
        print(f"Error decoding token: {str(e)}")
        return None
    
    return None

# Test endpoint
@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({"msg": "API is working!"}), 200

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and user.check_password(data.get('password')):
        # Create token with string identity
        identity_str = str(user.id)
        access_token = create_access_token(identity=identity_str)
        
        return jsonify(access_token=access_token, user_id=user.id, is_admin=user.is_admin), 200
    
    return jsonify({"msg": "Bad username or password"}), 401

# User routes
@app.route('/api/users', methods=['GET'])
def get_users():
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    users = User.query.all()
    result = []
    for user in users:
        result.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_admin': user.is_admin
        })
    
    return jsonify(result), 200

@app.route('/api/users', methods=['POST'])
def create_user():
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    data = request.get_json()
    
    if User.query.filter_by(username=data.get('username')).first():
        return jsonify({"msg": "Username already exists"}), 400
    
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"msg": "Email already exists"}), 400
    
    new_user = User(
        username=data.get('username'),
        email=data.get('email'),
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        is_admin=data.get('is_admin', False)
    )
    new_user.set_password(data.get('password'))
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        'id': new_user.id,
        'username': new_user.username,
        'email': new_user.email
    }), 201

# Rehearsal routes
@app.route('/api/rehearsals', methods=['GET'])
def get_rehearsals():
    # Get the token from the header
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"msg": "Missing or invalid Authorization header"}), 401
    
    try:
        # Get rehearsals data
        rehearsals = Rehearsal.query.order_by(Rehearsal.date).all()
        result = []
        
        for rehearsal in rehearsals:
            result.append({
                'id': rehearsal.id,
                'date': rehearsal.date.strftime('%Y-%m-%d'),
                'responses': len(rehearsal.responses)
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": f"Error: {str(e)}"}), 500

# Update this function in your app.py file

@app.route('/api/rehearsals', methods=['POST'])
def create_rehearsal():
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    data = request.get_json()
    date_str = data.get('date')
    
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({"msg": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    # Check if rehearsal already exists on this date
    existing = Rehearsal.query.filter(
        db.func.date(Rehearsal.date) == date.date()
    ).first()
    
    if existing:
        return jsonify({"msg": f"A rehearsal already exists on {date_str}"}), 400
    
    new_rehearsal = Rehearsal(date=date)
    db.session.add(new_rehearsal)
    
    # Create default "Ja" responses for all users
    users = User.query.all()
    for user in users:
        response = Response(user=user, rehearsal=new_rehearsal, attending=True)
        db.session.add(response)
    
    db.session.commit()
    
    # Log the creation
    log = LogEntry(
        user_id=current_user.id,
        action="create",
        entity_type="rehearsal",
        entity_id=new_rehearsal.id,
        new_value=date_str
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'id': new_rehearsal.id,
        'date': new_rehearsal.date.strftime('%Y-%m-%d')
    }), 201

# Optional: Add a route for bulk creating rehearsals
@app.route('/api/rehearsals/bulk', methods=['POST'])
def create_rehearsals_bulk():
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    data = request.get_json()
    dates = data.get('dates', [])
    
    if not dates:
        return jsonify({"msg": "No dates provided"}), 400
    
    created_rehearsals = []
    skipped_dates = []
    
    for date_str in dates:
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d')
            
            # Check if rehearsal already exists on this date
            existing = Rehearsal.query.filter(
                db.func.date(Rehearsal.date) == date.date()
            ).first()
            
            if existing:
                skipped_dates.append(date_str)
                continue
            
            new_rehearsal = Rehearsal(date=date)
            db.session.add(new_rehearsal)
            
            # Create default "Ja" responses for all users
            users = User.query.all()
            for user in users:
                response = Response(user=user, rehearsal=new_rehearsal, attending=True)
                db.session.add(response)
            
            db.session.flush()  # Get ID without committing
            
            created_rehearsals.append({
                'id': new_rehearsal.id,
                'date': new_rehearsal.date.strftime('%Y-%m-%d')
            })
            
            # Log the creation
            log = LogEntry(
                user_id=current_user.id,
                action="create",
                entity_type="rehearsal",
                entity_id=new_rehearsal.id,
                new_value=date_str
            )
            db.session.add(log)
            
        except ValueError:
            skipped_dates.append(date_str)
    
    db.session.commit()
    
    return jsonify({
        'created': created_rehearsals,
        'skipped': skipped_dates
    }), 201

# Response routes
@app.route('/api/responses', methods=['GET'])
def get_responses():
    current_user = get_user_from_token()
    
    if not current_user:
        return jsonify({"msg": "Authentication required"}), 401
        
    rehearsal_id = request.args.get('rehearsal_id')
    
    query = Response.query
    
    if rehearsal_id:
        query = query.filter_by(rehearsal_id=rehearsal_id)
    
    responses = query.all()
    result = []
    
    for response in responses:
        result.append({
            'id': response.id,
            'user_id': response.user_id,
            'username': response.user.username,
            'rehearsal_id': response.rehearsal_id,
            'rehearsal_date': response.rehearsal.date.strftime('%Y-%m-%d'),
            'attending': response.attending,
            'comment': response.comment,
            'updated_at': response.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return jsonify(result), 200

@app.route('/api/responses/<int:response_id>', methods=['PUT'])
def update_response(response_id):
    current_user = get_user_from_token()
    
    if not current_user:
        return jsonify({"msg": "Authentication required"}), 401
    
    response = Response.query.get_or_404(response_id)
    
    # Only allow users to update their own responses, unless they're an admin
    if response.user_id != current_user.id and not current_user.is_admin:
        return jsonify({"msg": "You can only update your own responses"}), 403
    
    data = request.get_json()
    old_attending = "Ja" if response.attending else "Nej"
    old_comment = response.comment or ""
    
    if 'attending' in data:
        response.attending = data['attending']
    
    if 'comment' in data:
        response.comment = data['comment']
    
    db.session.commit()
    
    # Log the update
    new_attending = "Ja" if response.attending else "Nej"
    new_comment = response.comment or ""
    
    log = LogEntry(
        user_id=current_user.id,
        action="update",
        entity_type="response",
        entity_id=response_id,
        old_value=f"Attending: {old_attending}, Comment: {old_comment}",
        new_value=f"Attending: {new_attending}, Comment: {new_comment}"
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'id': response.id,
        'attending': response.attending,
        'comment': response.comment
    }), 200

# In app.py - modify the manage_rehearsals function
@app.route('/api/rehearsals/manage', methods=['POST'])
def manage_rehearsals():
    """
    Handles the functionality to remove past rehearsals and add new ones
    (similar to the deleteOldDate and copyLastColumn functions in your script)
    """
    current_user = get_user_from_token()
    
    if not current_user:
        return jsonify({"msg": "Authentication required"}), 401
    
    # Allow any authenticated user to trigger this process
    # Remove admin check: if not current_user.is_admin:
    
    # Remove past rehearsals
    today = datetime.now().date()
    past_rehearsals = Rehearsal.query.filter(db.func.date(Rehearsal.date) < today).all()
    for rehearsal in past_rehearsals:
        db.session.delete(rehearsal)
    
    # Find the latest rehearsal date
    latest_rehearsal = Rehearsal.query.order_by(Rehearsal.date.desc()).first()
    
    if latest_rehearsal:
        # Add a new rehearsal one week after the latest
        new_date = latest_rehearsal.date + timedelta(days=7)
        new_rehearsal = Rehearsal(date=new_date)
        db.session.add(new_rehearsal)
        
        # Create default "Ja" responses for all users
        users = User.query.all()
        for user in users:
            response = Response(user=user, rehearsal=new_rehearsal, attending=True)
            db.session.add(response)
    
    db.session.commit()
    
    return jsonify({"msg": "Rehearsals updated successfully"}), 200

@app.route('/api/email/send', methods=['POST'])
def trigger_email():
    """Manually trigger sending the rehearsal summary email"""
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    send_rehearsal_summary()
    
    return jsonify({"msg": "Email sent successfully"}), 200

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    user = User.query.get_or_404(user_id)
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_admin': user.is_admin
    }), 200

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    # Check for username and email conflicts
    if data.get('username') and data.get('username') != user.username:
        if User.query.filter_by(username=data.get('username')).first():
            return jsonify({"msg": "Username already exists"}), 400
    
    if data.get('email') and data.get('email') != user.email:
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({"msg": "Email already exists"}), 400
    
    # Update user fields
    if data.get('username'):
        user.username = data.get('username')
    
    if data.get('email'):
        user.email = data.get('email')
    
    if data.get('first_name') is not None:
        user.first_name = data.get('first_name')
    
    if data.get('last_name') is not None:
        user.last_name = data.get('last_name')
    
    if data.get('is_admin') is not None:
        user.is_admin = data.get('is_admin')
    
    # Only update password if provided
    if data.get('password'):
        user.set_password(data.get('password'))
    
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_admin': user.is_admin
    }), 200

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    # Prevent admin from deleting themselves
    if current_user.id == user_id:
        return jsonify({"msg": "You cannot delete your own account"}), 400
    
    user = User.query.get_or_404(user_id)
    
    # Delete all responses for this user
    Response.query.filter_by(user_id=user_id).delete()
    
    # Delete the user
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({"msg": "User deleted successfully"}), 200


if __name__ == '__main__':
    app.run(debug=True)