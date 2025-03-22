# app.py
import logging
import os
import uuid
from datetime import datetime, time, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from email_service import (event_decline, event_footer, event_header,
                           event_no_decline, send_email)
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token
# Add this import at the top of app.py
from invitation_email import send_invitation_email
from models import db, User, Rehearsal, Response, LogEntry, Invitation
from werkzeug.security import check_password_hash, generate_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables before initializing the app
load_dotenv()  # This should be at the beginning of app.py


# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')  # Change in production
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///bandapp.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')  # Change in production
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Enhanced SQLite configuration to avoid database locks
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': {
        'timeout': 30  # SQLite connection timeout in seconds
    },
    'pool_recycle': 3600,  # Recycle connections after an hour
    'pool_pre_ping': True,  # Check connection validity before using it
    'pool_size': 10,  # Limit concurrent connections
}

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
# More permissive CORS configuration to allow all routes from localhost:3000
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

# Create tables and initialize admin user
@app.before_request
def create_tables_if_not_exist():
    # Only run once
    if not hasattr(app, '_got_first_request'):
        with app.app_context():
            try:
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
                    logger.info("Admin user created successfully!")
                app._got_first_request = True
            except Exception as e:
                logger.error(f"Error initializing database: {str(e)}")
                db.session.rollback()

# Improved email scheduling function to avoid database locks
def send_rehearsal_summary():
    """
    Creates and sends an HTML email with a summary of upcoming rehearsals.
    This function uses a separate database session to avoid locks.
    """
    with app.app_context():
        # Create a new session for this job
        session = db.create_scoped_session()
        try:
            # Get upcoming rehearsals (next 5 weeks)
            today = datetime.now().date()
            five_weeks_ahead = today + timedelta(weeks=5)
            upcoming_rehearsals = Rehearsal.query.filter(
                db.func.date(Rehearsal.date) >= today,
                db.func.date(Rehearsal.date) <= five_weeks_ahead
            ).order_by(Rehearsal.date).all()
            
            # If no upcoming rehearsals, don't send email
            if not upcoming_rehearsals:
                session.close()
                return
            
            # Create the HTML email content
            html_content = event_header()
            
            for rehearsal in upcoming_rehearsals:
                # Get all responses for this rehearsal
                responses = Response.query.filter_by(rehearsal_id=rehearsal.id).all()
                declined_responses = []
                
                for response in responses:
                    if not response.attending:  # Equivalent to "Nej"
                        declined_responses.append([
                            response.user.first_name or response.user.username,
                            response.comment or ""
                        ])
                
                # Format the date for display
                formatted_date = rehearsal.date.strftime("%d %b")
                
                # Add row to the HTML table
                if declined_responses:
                    html_content += event_decline(formatted_date, declined_responses)
                else:
                    html_content += event_no_decline(formatted_date)
            
            html_content += event_footer()
            
            # Get all active user emails
            user_emails = [user.email for user in User.query.all() if user.email]
            
            # Send the email
            send_email(
                to_emails=user_emails,
                subject="Rehearsal Schedule for Next Five Weeks",
                html_content=html_content
            )
            
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Error in send_rehearsal_summary: {str(e)}")
        finally:
            session.close()

# Set up scheduler with optimized configuration
scheduler = BackgroundScheduler(
    daemon=True,
    job_defaults={'max_instances': 1},  # Prevent concurrent runs
    executors={'default': {'type': 'threadpool', 'max_workers': 1}}  # Limit threads 
)
scheduler.add_job(send_rehearsal_summary, 'cron', day_of_week='mon', hour=8, minute=0)
scheduler.start()

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
        logger.error(f"Error decoding token: {str(e)}")
        return None
    
    return None

# Test endpoint
@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({"msg": "API is working!"}), 200

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = User.query.filter_by(username=data.get('username')).first()
        
        if user and user.check_password(data.get('password')):
            # Create token with string identity
            identity_str = str(user.id)
            access_token = create_access_token(identity=identity_str)
            
            return jsonify(access_token=access_token, user_id=user.id, is_admin=user.is_admin), 200
        
        return jsonify({"msg": "Bad username or password"}), 401
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "An error occurred during login"}), 500

# User routes
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
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
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to get users"}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    try:
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
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to create user"}), 500

# Rehearsal routes
@app.route('/api/rehearsals', methods=['GET'])
def get_rehearsals():
    try:
        # Get the token from the header
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"msg": "Missing or invalid Authorization header"}), 401
        
        # Get rehearsals data
        rehearsals = Rehearsal.query.order_by(Rehearsal.date).all()
        result = []
        
        for rehearsal in rehearsals:
            result.append({
                'id': rehearsal.id,
                'date': rehearsal.date.strftime('%Y-%m-%d'),
                'start_time': rehearsal.start_time.strftime('%H:%M') if rehearsal.start_time else None,
                'end_time': rehearsal.end_time.strftime('%H:%M') if rehearsal.end_time else None,
                'title': rehearsal.title,
                'recurring_id': rehearsal.recurring_id,
                'responses': len(rehearsal.responses)
            })
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error getting rehearsals: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": f"Error: {str(e)}"}), 500

@app.route('/api/rehearsals/<int:rehearsal_id>', methods=['GET'])
def get_rehearsal(rehearsal_id):
    try:
        current_user = get_user_from_token()
        
        if not current_user:
            return jsonify({"msg": "Authentication required"}), 401
        
        rehearsal = Rehearsal.query.get_or_404(rehearsal_id)
        
        return jsonify({
            'id': rehearsal.id,
            'date': rehearsal.date.strftime('%Y-%m-%d'),
            'start_time': rehearsal.start_time.strftime('%H:%M') if rehearsal.start_time else None,
            'end_time': rehearsal.end_time.strftime('%H:%M') if rehearsal.end_time else None,
            'title': rehearsal.title,
            'recurring_id': rehearsal.recurring_id,
            'responses': len(rehearsal.responses)
        }), 200
    except Exception as e:
        logger.error(f"Error getting rehearsal: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to get rehearsal"}), 500

@app.route('/api/rehearsals', methods=['POST'])
def create_rehearsal():
    try:
        current_user = get_user_from_token()
        
        if not current_user or not current_user.is_admin:
            return jsonify({"msg": "Admin privileges required"}), 403
        
        data = request.get_json()
        date_str = data.get('date')
        start_time_str = data.get('start_time', '19:00')  # Default to 7:00 PM
        end_time_str = data.get('end_time', '20:00')      # Default to 8:00 PM
        title = data.get('title', '')
        is_recurring = data.get('is_recurring', False)
        recurrence_type = data.get('recurrence_type', 'weekly')
        duration_months = data.get('duration_months', 3)
        day_of_week = data.get('day_of_week')
        
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d')
            start_time = datetime.strptime(start_time_str, '%H:%M').time()
            end_time = datetime.strptime(end_time_str, '%H:%M').time()
        except ValueError:
            return jsonify({"msg": "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for times"}), 400
        
        # Generate a recurring_id for recurring events
        recurring_id = str(uuid.uuid4()) if is_recurring else None
        
        # Create the rehearsals
        created_rehearsals = []
        
        if is_recurring:
            # Get the target day of the week if specified
            if day_of_week:
                # Map day names to numbers (0 = Monday, 6 = Sunday in Python's datetime)
                day_map = {
                    'monday': 0, 'tuesday': 1, 'wednesday': 2, 
                    'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6
                }
                target_day = day_map.get(day_of_week.lower())
                
                # Adjust the date to the next occurrence of the target day
                if target_day is not None:
                    days_ahead = (target_day - date.weekday()) % 7
                    if days_ahead > 0:
                        date += timedelta(days=days_ahead)
            
            # Calculate the end date (3 months from start by default)
            end_date = date.replace(month=date.month + duration_months) if date.month + duration_months <= 12 else \
                       date.replace(year=date.year + 1, month=(date.month + duration_months) % 12 or 12)
            
            # Create recurring rehearsals
            current_date = date
            while current_date <= end_date:
                # Check for existing rehearsal on this date
                existing = Rehearsal.query.filter(
                    db.func.date(Rehearsal.date) == current_date.date()
                ).first()
                
                if not existing:
                    new_rehearsal = Rehearsal(
                        date=current_date,
                        start_time=start_time,
                        end_time=end_time,
                        title=title,
                        recurring_id=recurring_id
                    )
                    db.session.add(new_rehearsal)
                    
                    # Create default "Ja" responses for all users
                    users = User.query.all()
                    for user in users:
                        response = Response(user=user, rehearsal=new_rehearsal, attending=True)
                        db.session.add(response)
                    
                    created_rehearsals.append({
                        'date': current_date.strftime('%Y-%m-%d'),
                        'start_time': start_time.strftime('%H:%M'),
                        'end_time': end_time.strftime('%H:%M')
                    })
                
                # Move to the next occurrence
                if recurrence_type == 'weekly':
                    current_date += timedelta(days=7)
                elif recurrence_type == 'biweekly':
                    current_date += timedelta(days=14)
        else:
            # Check for existing rehearsal on this date
            existing = Rehearsal.query.filter(
                db.func.date(Rehearsal.date) == date.date()
            ).first()
            
            if existing:
                return jsonify({"msg": f"A rehearsal already exists on {date_str}"}), 400
            
            new_rehearsal = Rehearsal(
                date=date,
                start_time=start_time,
                end_time=end_time,
                title=title,
                recurring_id=None
            )
            db.session.add(new_rehearsal)
            
            # Create default "Ja" responses for all users
            users = User.query.all()
            for user in users:
                response = Response(user=user, rehearsal=new_rehearsal, attending=True)
                db.session.add(response)
            
            created_rehearsals.append({
                'date': date.strftime('%Y-%m-%d'),
                'start_time': start_time.strftime('%H:%M'),
                'end_time': end_time.strftime('%H:%M')
            })
        
        db.session.commit()
        
        # Log the creation
        log = LogEntry(
            user_id=current_user.id,
            action="create",
            entity_type="rehearsal",
            entity_id=new_rehearsal.id,
            new_value=f"Date: {date_str}, Time: {start_time_str}-{end_time_str}, Title: {title}"
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'created_rehearsals': created_rehearsals,
            'recurring_id': recurring_id
        }), 201
    except Exception as e:
        logger.error(f"Error creating rehearsal: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to create rehearsal"}), 500

@app.route('/api/rehearsals/<int:rehearsal_id>', methods=['PUT'])
def update_rehearsal(rehearsal_id):
    try:
        current_user = get_user_from_token()
        
        if not current_user or not current_user.is_admin:
            return jsonify({"msg": "Admin privileges required"}), 403
        
        rehearsal = Rehearsal.query.get_or_404(rehearsal_id)
        data = request.get_json()
        
        # Check if this is a recurring rehearsal
        is_recurring_update = data.get('update_all_recurring', False) and rehearsal.recurring_id
        
        # Extract data from request
        date_str = data.get('date')
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        title = data.get('title')
        
        # Parse date and times if provided
        date = datetime.strptime(date_str, '%Y-%m-%d') if date_str else None
        start_time = datetime.strptime(start_time_str, '%H:%M').time() if start_time_str else None
        end_time = datetime.strptime(end_time_str, '%H:%M').time() if end_time_str else None
        
        # For recurring updates, get all related rehearsals
        rehearsals_to_update = []
        if is_recurring_update:
            rehearsals_to_update = Rehearsal.query.filter_by(recurring_id=rehearsal.recurring_id).all()
        else:
            rehearsals_to_update = [rehearsal]
        
        # Update all selected rehearsals
        for r in rehearsals_to_update:
            if date:
                # For recurring events, maintain the same day of week but update to new date pattern
                if is_recurring_update and len(rehearsals_to_update) > 1:
                    # Calculate days difference between original and new date
                    days_diff = (date - rehearsal.date).days
                    r.date = r.date + timedelta(days=days_diff)
                else:
                    r.date = date
                    
            if start_time:
                r.start_time = start_time
            
            if end_time:
                r.end_time = end_time
                
            if title is not None:  # Allow empty title
                r.title = title
        
        db.session.commit()
        
        return jsonify({
            'updated_rehearsals': len(rehearsals_to_update),
            'recurring_id': rehearsal.recurring_id
        }), 200
    except Exception as e:
        logger.error(f"Error updating rehearsal: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to update rehearsal"}), 500

@app.route('/api/rehearsals/<int:rehearsal_id>', methods=['DELETE'])
def delete_rehearsal(rehearsal_id):
    try:
        current_user = get_user_from_token()
        
        if not current_user or not current_user.is_admin:
            return jsonify({"msg": "Admin privileges required"}), 403
        
        rehearsal = Rehearsal.query.get_or_404(rehearsal_id)
        
        # Check if this is a recurring rehearsal
        delete_all_recurring = request.args.get('delete_all_recurring', 'false').lower() == 'true'
        
        # For recurring deletions, get all related rehearsals
        rehearsals_to_delete = []
        if delete_all_recurring and rehearsal.recurring_id:
            rehearsals_to_delete = Rehearsal.query.filter_by(recurring_id=rehearsal.recurring_id).all()
        else:
            rehearsals_to_delete = [rehearsal]
        
        # Delete responses for all rehearsals
        for r in rehearsals_to_delete:
            # Responses will be automatically deleted due to cascade
            db.session.delete(r)
        
        db.session.commit()
        
        return jsonify({
            'deleted_rehearsals': len(rehearsals_to_delete),
            'recurring_id': rehearsal.recurring_id if rehearsal.recurring_id else None
        }), 200
    except Exception as e:
        logger.error(f"Error deleting rehearsal: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to delete rehearsal"}), 500

@app.route('/api/rehearsals/manage', methods=['POST'])
def manage_rehearsals():
    """
    Handles the functionality to remove past rehearsals and add new ones
    """
    try:
        current_user = get_user_from_token()
        
        if not current_user:
            return jsonify({"msg": "Authentication required"}), 401
        
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
            new_rehearsal = Rehearsal(
                date=new_date,
                start_time=latest_rehearsal.start_time,  # Use the same time as the latest rehearsal
                end_time=latest_rehearsal.end_time,
                title=latest_rehearsal.title,
                recurring_id=None  # Not part of a recurring series
            )
            db.session.add(new_rehearsal)
            
            # Create default "Ja" responses for all users
            users = User.query.all()
            for user in users:
                response = Response(user=user, rehearsal=new_rehearsal, attending=True)
                db.session.add(response)
        
        db.session.commit()
        
        return jsonify({"msg": "Rehearsals updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error managing rehearsals: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to update rehearsals"}), 500

# Response routes
@app.route('/api/responses', methods=['GET'])
def get_responses():
    try:
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
    except Exception as e:
        logger.error(f"Error getting responses: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to get responses"}), 500

@app.route('/api/responses/<int:response_id>', methods=['PUT'])
def update_response(response_id):
    try:
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
    except Exception as e:
        logger.error(f"Error updating response: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to update response"}), 500

@app.route('/api/email/send', methods=['POST'])
def trigger_email():
    """Manually trigger sending the rehearsal summary email"""
    try:
        current_user = get_user_from_token()
        
        if not current_user or not current_user.is_admin:
            return jsonify({"msg": "Admin privileges required"}), 403
        
        send_rehearsal_summary()
        
        return jsonify({"msg": "Email sent successfully"}), 200
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return jsonify({"msg": "Failed to send email"}), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
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
    except Exception as e:
        logger.error(f"Error getting user: {str(e)}")
        return jsonify({"msg": "Failed to get user"}), 500

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
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
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to update user"}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
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
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to delete user"}), 500

# Optional: Add a route for bulk creating rehearsals
@app.route('/api/rehearsals/bulk', methods=['POST'])
def create_rehearsals_bulk():
    try:
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
                
                # Create default times if not specified
                start_time = datetime.strptime('19:00', '%H:%M').time()
                end_time = datetime.strptime('20:00', '%H:%M').time()
                
                new_rehearsal = Rehearsal(
                    date=date,
                    start_time=start_time,
                    end_time=end_time,
                    title="Rehearsal"
                )
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
    except Exception as e:
        logger.error(f"Error creating bulk rehearsals: {str(e)}")
        db.session.rollback()
        return jsonify({"msg": "Failed to create rehearsals"}), 500

# Invitation routes
# @app.route('/api/invitations', methods=['POST'])
# def create_invitation():
#     current_user = get_user_from_token()
    
#     if not current_user or not current_user.is_admin:
#         return jsonify({"msg": "Admin privileges required"}), 403
    
#     data = request.get_json()
#     email = data.get('email')
    
#     if not email:
#         return jsonify({"msg": "Email is required"}), 400
    
#     # Check if user with this email already exists
#     existing_user = User.query.filter_by(email=email).first()
#     if existing_user:
#         return jsonify({"msg": "User with this email already exists"}), 400
    
#     # Check if invitation for this email already exists
#     existing_invitation = Invitation.query.filter_by(email=email, is_accepted=False).filter(
#         Invitation.expires_at > datetime.utcnow()
#     ).first()
    
#     if existing_invitation:
#         return jsonify({"msg": "An active invitation for this email already exists"}), 400
    
#     # Create new invitation
#     invitation = Invitation(email=email, created_by=current_user.id)
#     db.session.add(invitation)
#     db.session.commit()
    
#     # Logic to send invitation email would go here
#     # For now, we'll just return the token that would be in the email
    
#     return jsonify({
#         'id': invitation.id,
#         'email': invitation.email,
#         'token': invitation.token,
#         'expires_at': invitation.expires_at.isoformat()
#     }), 201

@app.route('/api/invitations', methods=['GET'])
def get_invitations():
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    invitations = Invitation.query.filter_by(is_accepted=False).order_by(Invitation.created_at.desc()).all()
    result = []
    
    for invitation in invitations:
        result.append({
            'id': invitation.id,
            'email': invitation.email,
            'created_at': invitation.created_at.isoformat(),
            'expires_at': invitation.expires_at.isoformat(),
            'is_expired': invitation.is_expired
        })
    
    return jsonify(result), 200

@app.route('/api/invitations/<int:invitation_id>', methods=['DELETE'])
def delete_invitation(invitation_id):
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    invitation = Invitation.query.get_or_404(invitation_id)
    
    db.session.delete(invitation)
    db.session.commit()
    
    return jsonify({"msg": "Invitation deleted successfully"}), 200





@app.route('/api/register/<token>', methods=['POST'])
def register_with_invitation(token):
    # Add more detailed logging
    print(f"Processing registration with token: {token}")
    
    # Log the incoming request data
    data = request.get_json()
    print(f"Registration data received: {data}")
    
    invitation = Invitation.query.filter_by(token=token, is_accepted=False).first()
    
    if not invitation:
        print(f"Invitation not found or already accepted for token: {token}")
        return jsonify({"msg": "Invalid or expired invitation token"}), 400
    
    if invitation.is_expired:
        print(f"Invitation expired for token: {token}, expires_at: {invitation.expires_at}")
        return jsonify({"msg": "Invitation has expired"}), 400
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')
    
    if not username or not password:
        return jsonify({"msg": "Username and password are required"}), 400
    
    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"msg": "Username already exists"}), 400
    
    # Create new user
    new_user = User(
        username=username,
        email=invitation.email,
        first_name=first_name,
        last_name=last_name,
        is_admin=False  # invited users are not admins by default
    )
    new_user.set_password(password)
    
    # Mark invitation as accepted
    invitation.is_accepted = True
    
    db.session.add(new_user)
    db.session.commit()
    
    # Create access token
    identity_str = str(new_user.id)
    access_token = create_access_token(identity=identity_str)
    
    return jsonify(access_token=access_token, user_id=new_user.id, is_admin=new_user.is_admin), 201

@app.route('/api/invitations', methods=['POST'])
def create_invitation():
    current_user = get_user_from_token()
    
    if not current_user or not current_user.is_admin:
        return jsonify({"msg": "Admin privileges required"}), 403
    
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({"msg": "Email is required"}), 400
    
    # Check if user with this email already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"msg": "User with this email already exists"}), 400
    
    # Check if invitation for this email already exists
    existing_invitation = Invitation.query.filter_by(email=email, is_accepted=False).filter(
        Invitation.expires_at > datetime.utcnow()
    ).first()
    
    if existing_invitation:
        return jsonify({"msg": "An active invitation for this email already exists"}), 400
    
    # Create new invitation
    invitation = Invitation(email=email, created_by=current_user.id)
    db.session.add(invitation)
    db.session.commit()
    
    # # Send invitation email
    # email_sent = send_invitation_email(email, invitation.token, app_url=request.host_url.rstrip('/'))
    # Send invitation email
    email_sent = send_invitation_email(email, invitation.token, app_url=os.environ.get('APP_URL', 'http://localhost:3000'))
    
    # Log the invitation
    log = LogEntry(
        user_id=current_user.id,
        action="create",
        entity_type="invitation",
        entity_id=invitation.id,
        new_value=f"Email: {email}, Token: {invitation.token}, Email Sent: {email_sent}"
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'id': invitation.id,
        'email': invitation.email,
        'token': invitation.token,
        'expires_at': invitation.expires_at.isoformat(),
        'email_sent': email_sent
    }), 201

@app.errorhandler(404)
def not_found(error):
    return jsonify({"msg": "Resource not found"}), 404

@app.errorhandler(500)
def server_error(error):
    logger.error(f"Server error: {str(error)}")
    return jsonify({"msg": "Internal server error"}), 500

# Handle SQLAlchemy errors
@app.errorhandler(Exception)
def handle_exception(e):
    # Pass through HTTP exceptions
    if hasattr(e, 'code') and 400 <= e.code < 600:
        return e
    
    # Log the error
    logger.error(f"Unhandled exception: {str(e)}")
    
    # Rollback the session
    if db.session.is_active:
        db.session.rollback()
    
    # Return a generic error response
    return jsonify({"msg": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    app.run(debug=True)