import pytest
from unittest.mock import Mock, patch

from domain.users.user_repository import UserRepository
from domain.users.user_model import User

class TestUserRepository:
    @patch('domain.users.user_repository.secrets')
    @patch('domain.users.user_repository.User')
    @patch('domain.users.user_repository.db.session')
    def test_create_locked_user(self, mock_session, mock_user_class, mock_secrets):
        mock_user = Mock()
        mock_user_class.return_value = mock_user
        mock_user_class.hash_password.return_value = 'hashed_random_password'
        mock_secrets.token_hex.return_value = 'generated_password'

        result = UserRepository.create_locked_user(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            phone='123456789',
            role='new_docent'
        )
        
        assert result == mock_user
        
        mock_user_class.assert_called_once()
        args, kwargs = mock_user_class.call_args
        assert kwargs['email'] == 'test@example.com'
        assert kwargs['first_name'] == 'Test'
        assert kwargs['last_name'] == 'User'
        assert kwargs['phone'] == '123456789'
        assert kwargs['role'] == 'new_docent'
        
        # Verify a password was set using hash_password
        assert 'password' in kwargs
        
        mock_session.add.assert_called_once_with(mock_user)
        mock_session.commit.assert_called_once() 
        # ensure that we aren't using a hardcoded password
        mock_user_class.hash_password.assert_called_once_with('generated_password')