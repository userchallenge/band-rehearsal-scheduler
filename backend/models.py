# models.py
import uuid
from datetime import datetime, timedelta

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with Responses
    responses = db.relationship('Response', back_populates='user', cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'


class Rehearsal(db.Model):
    __tablename__ = 'rehearsals'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, nullable=False)
    start_time = db.Column(db.Time, nullable=True)  # Start time
    end_time = db.Column(db.Time, nullable=True)    # End time
    title = db.Column(db.String(100), nullable=True)  # Optional title
    recurring_id = db.Column(db.String(36), nullable=True)  # UUID to group recurring events
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with Responses
    responses = db.relationship('Response', back_populates='rehearsal', cascade='all, delete-orphan')
    
    def __repr__(self):
        time_str = f" {self.start_time.strftime('%H:%M')}" if self.start_time else ""
        return f'<Rehearsal {self.date.strftime("%Y-%m-%d")}{time_str}>'


class Response(db.Model):
    __tablename__ = 'responses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rehearsal_id = db.Column(db.Integer, db.ForeignKey('rehearsals.id'), nullable=False)
    attending = db.Column(db.Boolean, default=True)  # True for "Ja", False for "Nej"
    comment = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='responses')
    rehearsal = db.relationship('Rehearsal', back_populates='responses')
    
    # Unique constraint to ensure one response per user per rehearsal
    __table_args__ = (
        db.UniqueConstraint('user_id', 'rehearsal_id', name='unique_user_rehearsal'),
    )
    
    def __repr__(self):
        status = "Ja" if self.attending else "Nej"
        return f'<Response {self.user.username} - {self.rehearsal.date.strftime("%Y-%m-%d")}: {status}>'


class LogEntry(db.Model):
    __tablename__ = 'log_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)  # 'response', 'rehearsal', etc.
    entity_id = db.Column(db.Integer)
    old_value = db.Column(db.Text)
    new_value = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User')

class Invitation(db.Model):
    __tablename__ = 'invitations'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    token = db.Column(db.String(100), nullable=False, unique=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_accepted = db.Column(db.Boolean, default=False)
    
    # Relationship
    creator = db.relationship('User', foreign_keys=[created_by])
    
    def __init__(self, email, created_by, expires_days=7):
        self.email = email
        self.created_by = created_by
        self.token = str(uuid.uuid4())
        self.expires_at = datetime.utcnow() + timedelta(days=expires_days)
    
    @property
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def __repr__(self):
        return f'<Invitation {self.email}>'
        
    def __repr__(self):
        return f'<LogEntry {self.user.username} - {self.action} - {self.timestamp}>'