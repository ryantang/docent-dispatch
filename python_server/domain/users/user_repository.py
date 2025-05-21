from python_server.db_config import db
from python_server.domain.users.user_model import User, PasswordResetToken
import secrets

class UserRepository:
    @staticmethod
    def get_user_by_email(email):
        #TODO: Log a warning if there are multiple users with the same email
        return User.query.filter_by(email=email).first()

    @staticmethod
    def create_user(email, password, first_name, last_name, phone, role):
        new_user = User(
            email=email,
            password=User.hash_password(password),
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=role
        )
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def update_user(user):
        db.session.commit()

    @staticmethod
    def invalidate_existing_tokens(user_id):
        PasswordResetToken.query.filter_by(user_id=user_id, used=False).update({'used': True})

    @staticmethod
    def create_password_reset_token(user_id, token, expires_at):
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        db.session.add(reset_token)
        db.session.commit()
        return reset_token

    @staticmethod
    def get_token_record(token):
        return PasswordResetToken.query.filter_by(token=token, used=False).first()

    @staticmethod
    def create_locked_user(email, first_name, last_name, phone, role):
        # Create a user with a random password, forcing a reset
        new_user = User(
            email=email,
            password=User.hash_password(secrets.token_hex(32)),  # Random unguessable password
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=role
        )
        db.session.add(new_user)
        db.session.commit()
        return new_user