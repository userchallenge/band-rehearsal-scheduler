# app.py
import os
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from email_service import send_rehearsal_summary
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_jwt_extended import (JWTManager, create_access_token,
                                get_jwt_identity, jwt_required)
from flask_jwt_extended.exceptions import (InvalidHeaderError,
                                           NoAuthorizationError)
from models import LogEntry, Rehearsal, Response, User, db
from werkzeug.exceptions import UnprocessableEntity
from werkzeug.security import check_password_hash, generate_password_hash

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')  # Change in production
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///bandapp.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')  # Change in production
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
CORS(app)

CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)
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

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and user.check_password(data.get('password')):
        access_token = create_access_token(identity=user.id)
        return jsonify(access_token=access_token, user_id=user.id, is_admin=user.is_admin), 200
    
    return jsonify({"msg": "Bad username or password"}), 401

# User routes
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user.is_admin:
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
@jwt_required()
def create_user():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user.is_admin:
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
@jwt_required()
def get_rehearsals():
    rehearsals = Rehearsal.query.order_by(Rehearsal.date).all()
    result = []
    
    for rehearsal in rehearsals:
        result.append({
            'id': rehearsal.id,
            'date': rehearsal.date.strftime('%Y-%m-%d'),
            'responses': len(rehearsal.responses)
        })
    
    return jsonify(result), 200

@app.route('/api/rehearsals', methods=['POST'])
@jwt_required()
def create_rehearsal():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user.is_admin:
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
        return jsonify({"msg": "A rehearsal already exists on this date"}), 400
    
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
        user_id=current_user_id,
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

# Response routes
@app.route('/api/responses', methods=['GET'])
@jwt_required()
def get_responses():
    current_user_id = get_jwt_identity()
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
@jwt_required()
def update_response(response_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    response = Response.query.get_or_404(response_id)
    
    # Only allow users to update their own responses, unless they're an admin
    if response.user_id != current_user_id and not current_user.is_admin:
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
        user_id=current_user_id,
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

# Utility functions
@app.route('/api/rehearsals/manage', methods=['POST'])
@jwt_required()
def manage_rehearsals():
    """
    Handles the functionality to remove past rehearsals and add new ones
    (similar to the deleteOldDate and copyLastColumn functions in your script)
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
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
@jwt_required()
def trigger_email():
    """Manually trigger sending the rehearsal summary email"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    send_rehearsal_summary()
    
    return jsonify({"msg": "Email sent successfully"}), 200

@app.errorhandler(UnprocessableEntity)
def handle_unprocessable_entity(e):
    return jsonify({"msg": "Invalid token. Please log in again."}), 422

@app.errorhandler(NoAuthorizationError)
def handle_auth_error(e):
    return jsonify({"msg": "Missing Authorization header. Please log in."}), 401

@app.errorhandler(InvalidHeaderError)
def handle_invalid_header(e):
    return jsonify({"msg": "Invalid Authorization header. Format should be 'Bearer <token>'"}), 422

@app.route('/api/debug-token', methods=['GET'])
def debug_token():
    auth_header = request.headers.get('Authorization', '')
    
    return jsonify({
        "message": "Token debug info",
        "has_auth_header": bool(auth_header),
        "auth_header": auth_header
    }), 200

@app.route('/api/check-token', methods=['GET'])
def check_token():
    auth_header = request.headers.get('Authorization', '')
    token = None
    
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]  # Remove 'Bearer ' prefix
    
    # Simple validation without actually checking signature
    is_jwt_format = bool(token and '.' in token and len(token.split('.')) == 3)
    
    return jsonify({
        "has_auth_header": bool(auth_header),
        "auth_header": auth_header,
        "token_extracted": token is not None,
        "appears_to_be_jwt": is_jwt_format
    }), 200



@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({"msg": "API is working!"}), 200

if __name__ == '__main__':
    app.run(debug=True)