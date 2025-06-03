import os
from python_server.db_config import db
from python_server.domain.users.user_model import User
from python_server.domain.users.user_repository import UserRepository
from python_server.domain.users.user_service import UserService


def bootstrap_admin_user():
    """
    Bootstrap the first coordinator user if none exists.
    Uses environment variables for configuration.
    """
    
    # Check if any coordinator users already exist
    existing_coordinator = User.query.filter_by(role='coordinator').first()
    if existing_coordinator:
        print("✓ Coordinator user already exists. Bootstrap not needed.")
        return
    
    # Get admin user details from environment variables
    admin_email = os.getenv('ADMIN_EMAIL')
    admin_first_name = os.getenv('ADMIN_FIRST_NAME', 'Admin')
    admin_last_name = os.getenv('ADMIN_LAST_NAME', 'User')
    admin_phone = os.getenv('ADMIN_PHONE')
    
    if not admin_email:
        print("ADMIN_EMAIL not set in environment variables. Skipping bootstrap.")
        print("   To bootstrap an admin user, set ADMIN_EMAIL in your .env file.")
        return
    
    # Create the admin user data
    admin_data = {
        'email': admin_email,
        'firstName': admin_first_name,
        'lastName': admin_last_name,
        'phone': admin_phone,
        'role': 'coordinator'
    }
    
    try:
        # Create the admin user using the existing service
        user_data, status_code = UserService.create_user(admin_data)
        
        if status_code == 201:
            print("Bootstrap successful!")
            print(f"   Created coordinator user: {admin_email}")
            print(f"   Name: {admin_first_name} {admin_last_name}")
            if admin_phone:
                print(f"   Phone: {admin_phone}")
            print("")
            print("The user has been created with a random password.")
            print("   To set a password, use the 'Forgot password?' link on the login page.")
            print(f"   Enter the email: {admin_email}")
            print("")
            domain = os.getenv('DOMAIN', 'http://localhost:5001')
            print(f"   Login page: {domain}/auth")
            print("")
        else:
            print(f"Failed to create admin user: {user_data.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error during bootstrap: {str(e)}")


def setup_environment_example():
    """
    Print example environment variables for the admin user.
    """
    print("Bootstrap Admin User Configuration")
    print("=" * 40)
    print("Add these variables to your .env file:")
    print("")
    print("# Admin user bootstrap configuration")
    print("ADMIN_EMAIL=admin@yourorganization.com")
    print("ADMIN_FIRST_NAME=Admin")
    print("ADMIN_LAST_NAME=Coordinator") 
    print("ADMIN_PHONE=+1234567890  # Optional")
    print("DOMAIN=https://yourdomain.com  # For password reset emails")
    print("")
    print("Then run: python -c 'from python_server.bootstrap import bootstrap_admin_user; bootstrap_admin_user()'")


if __name__ == "__main__":
    setup_environment_example() 