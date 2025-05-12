from python_server.app import db
from python_server.domain.users.model import User

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