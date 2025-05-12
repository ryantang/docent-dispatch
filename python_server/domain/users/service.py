from python_server.domain.users.repository import UserRepository
from datetime import datetime, timedelta

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