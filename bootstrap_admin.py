#!/usr/bin/env python3
"""
Bootstrap script for creating the initial coordinator user.

This script creates the first coordinator user if none exists.
The user details are read from environment variables.

Usage:
    python bootstrap_admin.py
    
Environment Variables:
    ADMIN_EMAIL - Email address for the admin user (required)
    ADMIN_FIRST_NAME - First name (default: Admin)
    ADMIN_LAST_NAME - Last name (default: User)
    ADMIN_PHONE - Phone number (optional)
    DOMAIN - Domain for password reset links (for email)
"""

import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from python_server.app import app
from python_server.bootstrap import bootstrap_admin_user, setup_environment_example

def main():
    # Load environment variables
    load_dotenv()
    
    # Check if we should show the example
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h', 'help']:
        setup_environment_example()
        return
    
    # Run bootstrap within app context
    with app.app_context():
        print("SF Zoo Docent System - Admin User Bootstrap")
        print("=" * 50)
        print()
        
        bootstrap_admin_user()

if __name__ == "__main__":
    main() 