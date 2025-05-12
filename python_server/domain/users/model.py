from python_server.app import db
from datetime import datetime
from passlib.hash import pbkdf2_sha256
from sqlalchemy.orm import relationship

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    role = db.Column(db.String(20), nullable=False)  # new_docent, seasoned_docent, coordinator
    failed_login_attempts = db.Column(db.Integer, default=0)
    account_locked_until = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    new_docent_tag_requests = relationship('TagRequest', foreign_keys='TagRequest.new_docent_id', back_populates='new_docent')
    seasoned_docent_tag_requests = relationship('TagRequest', foreign_keys='TagRequest.seasoned_docent_id', back_populates='seasoned_docent')
    
    @staticmethod
    def hash_password(password):
        return pbkdf2_sha256.hash(password)
    
    def verify_password(self, password):
        return pbkdf2_sha256.verify(password, self.password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'phone': self.phone,
            'role': self.role
        }

class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship('User')