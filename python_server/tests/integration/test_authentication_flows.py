import pytest
from datetime import datetime, timedelta
from unittest.mock import patch
from domain.users.user_model import User, PasswordResetToken
from db_config import db

class TestAuthenticationFlows:

    def test_user_login_success(self, test_client, test_db, new_docent_user):
        """Test: Successful login with valid credentials and session persists across requests"""
        response = test_client.post('/api/login', json={
            'email': 'newdocent@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['email'] == 'newdocent@example.com'
        assert data['role'] == 'new_docent'
        assert 'password' not in data  # Password should not be returned
        
        # Verify session persists - make authenticated request
        user_response = test_client.get('/api/user')
        assert user_response.status_code == 200
        user_data = user_response.get_json()
        assert user_data['email'] == 'newdocent@example.com'

    def test_user_login_invalid_email(self, test_client, test_db):
        """Test: Login with non-existent email"""
        response = test_client.post('/api/login', json={
            'email': 'nonexistent@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'Invalid email or password' in data['error']

    def test_user_login_invalid_password(self, test_client, test_db, new_docent_user):
        """Test: Login with incorrect password"""
        response = test_client.post('/api/login', json={
            'email': 'newdocent@example.com',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'Invalid email or password' in data['error']
        
        # Verify failed attempt was recorded
        user = User.query.filter_by(email='newdocent@example.com').first()
        assert user.failed_login_attempts == 1

    def test_account_lockout_after_5_failed_attempts(self, test_client, test_db, new_docent_user):
        """Test: Account gets locked after 5 failed login attempts"""
        # Make 4 failed attempts
        for i in range(4):
            response = test_client.post('/api/login', json={
                'email': 'newdocent@example.com',
                'password': 'wrongpassword'
            })
            assert response.status_code == 401
        
        # 5th failed attempt should lock the account
        response = test_client.post('/api/login', json={
            'email': 'newdocent@example.com',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401
        
        # Verify account is locked
        user = User.query.filter_by(email='newdocent@example.com').first()
        assert user.failed_login_attempts == 5
        assert user.account_locked_until is not None
        assert user.account_locked_until > datetime.utcnow()

        # Login to a locked account with a correct password should fail
        response = test_client.post('/api/login', json={
            'email': 'newdocent@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 403
        data = response.get_json()
        assert 'Account is locked' in data['error']
        assert 'Try again in' in data['error']


    def test_account_unlock_after_timeout(self, test_client, test_db, new_docent_user):
        """Test: Account can login after lockout period expires"""
        # Lock the account with a past expiration time
        user = User.query.filter_by(email='newdocent@example.com').first()
        user.failed_login_attempts = 5
        user.account_locked_until = datetime.utcnow() - timedelta(minutes=1)  # Expired 1 minute ago
        db.session.commit()
        
        # Should be able to login now
        response = test_client.post('/api/login', json={
            'email': 'newdocent@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 200
        
        # Verify lockout was cleared
        user = User.query.filter_by(email='newdocent@example.com').first()
        assert user.failed_login_attempts == 0
        assert user.account_locked_until is None

    def test_successful_login_resets_failed_attempts(self, test_client, test_db, new_docent_user):
        """Test: Successful login resets failed login attempts"""
        # Set some failed attempts
        user = User.query.filter_by(email='newdocent@example.com').first()
        user.failed_login_attempts = 3
        db.session.commit()
        
        # Successful login
        response = test_client.post('/api/login', json={
            'email': 'newdocent@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 200
        
        # Verify failed attempts were reset
        user = User.query.filter_by(email='newdocent@example.com').first()
        assert user.failed_login_attempts == 0

    @patch('domain.users.user_service.send_password_reset_email')
    def test_password_reset_request_existing_user(self, mock_email, test_client, test_db, new_docent_user):
        """Test: Password reset request for existing user"""
        response = test_client.post('/api/request-password-reset', json={
            'email': 'newdocent@example.com'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify token was created
        token = PasswordResetToken.query.filter_by(user_id=new_docent_user.id).first()
        assert token is not None
        assert not token.used
        assert token.expires_at > datetime.utcnow()
        
        # Verify email was sent
        mock_email.assert_called_once()

    @patch('domain.users.user_service.send_password_reset_email')
    def test_password_reset_request_nonexistent_user(self, mock_email, test_client, test_db):
        """Test: Password reset request for non-existent user (should still return success)"""
        response = test_client.post('/api/request-password-reset', json={
            'email': 'nonexistent@example.com'
        })
        
        # Should still return success to prevent email enumeration
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # But no email should be sent
        mock_email.assert_not_called()

    def test_password_reset_with_valid_token(self, test_client, test_db, new_docent_user):
        """Test: Password reset with valid token"""
        # Create a password reset token
        token = PasswordResetToken(
            user_id=new_docent_user.id,
            token='valid_reset_token',
            expires_at=datetime.utcnow() + timedelta(hours=1),
            used=False
        )
        db.session.add(token)
        db.session.commit()
        
        # Reset password
        response = test_client.post('/api/reset-password', json={
            'token': 'valid_reset_token',
            'password': 'newpassword123'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify token is marked as used
        token_record = PasswordResetToken.query.filter_by(token='valid_reset_token').first()
        assert token_record.used is True
        
        # Verify password was changed
        user = User.query.get(new_docent_user.id)
        assert user.verify_password('newpassword123')

    def test_password_reset_with_expired_token(self, test_client, test_db, new_docent_user):
        """Test: Password reset with expired token"""
        # Create an expired password reset token
        token = PasswordResetToken(
            user_id=new_docent_user.id,
            token='expired_reset_token',
            expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired 1 hour ago
            used=False
        )
        db.session.add(token)
        db.session.commit()
        
        # Debug: verify token was created with correct expiration
        saved_token = PasswordResetToken.query.filter_by(token='expired_reset_token').first()
        
        # Try to reset password
        response = test_client.post('/api/reset-password', json={
            'token': 'expired_reset_token',
            'password': 'newpassword123'
        })
        
        print(f"Response status: {response.status_code}")
        print(f"Response data: {response.get_json()}")
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'Invalid or expired token' in data['error']

    def test_password_reset_with_invalid_token(self, test_client, test_db):
        """Test: Password reset with invalid token"""
        response = test_client.post('/api/reset-password', json={
            'token': 'invalid_token',
            'password': 'newpassword123'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'Invalid or expired token' in data['error']

    def test_unauthenticated_request_fails(self, test_client, test_db):
        """Test: Unauthenticated request to protected endpoint fails"""
        response = test_client.get('/api/user')
        assert response.status_code == 401
        data = response.get_json()
        assert 'Unauthorized' in data['error']

    def test_logout_clears_session(self, test_client, test_db, new_docent_user):
        """Test: Logout clears session and subsequent requests fail"""
        # Login
        login_response = test_client.post('/api/login', json={
            'email': 'newdocent@example.com',
            'password': 'password123'
        })
        assert login_response.status_code == 200
        
        # Verify authenticated
        user_response = test_client.get('/api/user')
        assert user_response.status_code == 200
        
        # Logout
        logout_response = test_client.post('/api/logout')
        assert logout_response.status_code == 200
        data = logout_response.get_json()
        assert data['success'] is True
        
        # Verify session is cleared
        user_response_after_logout = test_client.get('/api/user')
        assert user_response_after_logout.status_code == 401

    def test_multiple_failed_logins_across_different_sessions(self, test_client, test_db, new_docent_user):
        """Test: Failed login attempts persist across different client sessions"""
        # Make 2 failed attempts with first client
        for i in range(2):
            response = test_client.post('/api/login', json={
                'email': 'newdocent@example.com',
                'password': 'wrongpassword'
            })
            assert response.status_code == 401
        
        # Create new client (simulating different session)
        new_client = test_client.application.test_client()
        
        # Make 3 more failed attempts with second client
        for i in range(3):
            response = new_client.post('/api/login', json={
                'email': 'newdocent@example.com',
                'password': 'wrongpassword'
            })
            if i < 2:
                assert response.status_code == 401
        
        # 5th attempt should lock account
        user = User.query.filter_by(email='newdocent@example.com').first()
        assert user.failed_login_attempts == 5
        assert user.account_locked_until is not None