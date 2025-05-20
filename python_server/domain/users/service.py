from python_server.domain.users.repository import UserRepository
from python_server.domain.users.model import User
from datetime import datetime, timedelta
import secrets

class UserService:
    @staticmethod
    def register_user(data):
        existing_user = UserRepository.get_user_by_email(data['email'])
        if existing_user:
            return {"error": "Email already registered"}, 400
        
        new_user = UserRepository.create_user(
            email=data['email'],
            password=data['password'],
            first_name=data['firstName'],
            last_name=data['lastName'],
            phone=data.get('phone'),
            role=data['role']
        )
        
        return new_user.to_dict(), 201

    @staticmethod
    def login_user(data):
        user = UserRepository.get_user_by_email(data['email'])
        
        # Check if account is locked
        if user and user.account_locked_until and user.account_locked_until > datetime.utcnow():
            lock_remaining = (user.account_locked_until - datetime.utcnow()).total_seconds() / 60
            return {"error": f"Account is locked. Try again in {int(lock_remaining)} minutes."}, 403
        
        # Verify credentials
        if not user or not user.verify_password(data['password']):
            if user:
                user.failed_login_attempts += 1
                
                # Lock account after 5 failed attempts
                if user.failed_login_attempts >= 5:
                    user.account_locked_until = datetime.utcnow() + timedelta(minutes=15)
                
                UserRepository.update_user(user)
                
            return {"error": "Invalid email or password"}, 401
        
        # Reset failed login attempts on successful login
        user.failed_login_attempts = 0
        user.account_locked_until = None
        UserRepository.update_user(user)
        
        return user.to_dict(), 200

    @staticmethod
    def request_password_reset(email):
        user = UserRepository.get_user_by_email(email)
        
        if user:
            # Invalidate existing tokens
            UserRepository.invalidate_existing_tokens(user.id)
            
            print(f"Invalidating existing tokens for user {user.id}")

            # Create a new token
            token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(hours=1)
            UserRepository.create_password_reset_token(user.id, token, expires_at)
            
            # For demo purposes, log the token to the console
            #TODO: Remove this and send the email with the reset link
            reset_link = f"/reset-password?token={token}"
            print(f"Password reset link for {user.email}: {reset_link}")

    @staticmethod
    def reset_password(token, new_password):
        token_record = UserRepository.get_token_record(token)
        
        if not token_record or token_record.expires_at < datetime.utcnow():
            return {"error": "Invalid or expired token"}, 400
        
        # Update the user's password
        user = UserRepository.get_user_by_email(token_record.user_id)
        user.password = User.hash_password(new_password)
        
        # Mark token as used
        token_record.used = True
        
        UserRepository.update_user(user)
        
        return {"success": True}