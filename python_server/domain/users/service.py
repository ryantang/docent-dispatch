from python_server.domain.users.repository import UserRepository

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