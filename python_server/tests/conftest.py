import pytest
from datetime import datetime, date, timedelta
from unittest.mock import patch
from flask import Flask
from flask_session import Session
from db_config import db
from domain.users.user_model import User
from domain.tags.tag_model import TagRequest
import os
import tempfile

def create_test_app(config=None):
    """Create test Flask app with SQLite in-memory database"""
    app = Flask(__name__)
    
    # Default test configuration
    test_config = {
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
        'SESSION_TYPE': 'filesystem',
        'SESSION_PERMANENT': True,
        'PERMANENT_SESSION_LIFETIME': timedelta(days=7),
        'SESSION_USE_SIGNER': True,
        'SESSION_FILE_DIR': tempfile.mkdtemp(),
        'SQLALCHEMY_TRACK_MODIFICATIONS': False
    }
    
    # Override with any provided config
    if config:
        test_config.update(config)
    
    app.config.update(test_config)
    
    # Initialize extensions
    db.init_app(app)
    Session(app)
    
    # Import and register routes
    from routes import register_routes
    register_routes(app)
    
    return app

@pytest.fixture
def app():
    """Create test Flask app"""
    return create_test_app()

@pytest.fixture
def test_client(app):
    """Test client for making HTTP requests"""
    return app.test_client()

@pytest.fixture
def test_db(app):
    """Clean database for each test"""
    with app.app_context():
        db.create_all()
        yield db
        db.drop_all()

@pytest.fixture
def new_docent_user(test_db):
    """Create a new docent user"""
    user = User(
        email='newdocent@test.com',
        first_name='New',
        last_name='Docent',
        role='new_docent',
        password=User.hash_password('password123')
    )
    db.session.add(user)
    db.session.commit()
    return user

@pytest.fixture
def second_new_docent_user(test_db):
    """Create a second new docent user"""
    user = User(
        email='newdocent2@test.com',
        first_name='New2',
        last_name='Docent2',
        role='new_docent',
        password=User.hash_password('password123')
    )
    db.session.add(user)
    db.session.commit()
    return user

@pytest.fixture
def seasoned_docent_user(test_db):
    """Create a seasoned docent user"""
    user = User(
        email='seasoned@test.com',
        first_name='Seasoned',
        last_name='Docent',
        role='seasoned_docent',
        password=User.hash_password('password123')
    )
    db.session.add(user)
    db.session.commit()
    return user

@pytest.fixture
def authenticated_new_docent(test_client, new_docent_user):
    """Login as new docent and return client"""
    test_client.post('/api/login', json={
        'email': 'newdocent@test.com',
        'password': 'password123'
    })
    return test_client

@pytest.fixture
def authenticated_seasoned_docent(test_client, seasoned_docent_user):
    """Login as seasoned docent and return client"""
    test_client.post('/api/login', json={
        'email': 'seasoned@test.com',
        'password': 'password123'
    })
    return test_client