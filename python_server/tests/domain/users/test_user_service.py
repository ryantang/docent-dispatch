import pytest
from unittest.mock import Mock, patch

from python_server.domain.users.user_service import UserService
from python_server.domain.users.user_repository import UserRepository

class TestUserService:
    
    @patch.object(UserRepository, 'get_user_by_email')
    @patch.object(UserRepository, 'create_locked_user')
    def test_create_user_success(self, mock_create_locked_user, mock_get_user_by_email):
        mock_get_user_by_email.return_value = None
        
        mock_user = Mock()
        mock_user.to_dict.return_value = {
            'id': 1,
            'email': 'test@example.com',
            'firstName': 'Test',
            'lastName': 'User',
            'phone': '123456789',
            'role': 'new_docent'
        }
        mock_create_locked_user.return_value = mock_user
        
        user_data = {
            'email': 'test@example.com',
            'firstName': 'Test',
            'lastName': 'User',
            'phone': '123456789',
            'role': 'new_docent'
        }
        
        result, status_code = UserService.create_user(user_data)
        
        assert status_code == 201
        assert result == {
            'id': 1,
            'email': 'test@example.com',
            'firstName': 'Test',
            'lastName': 'User',
            'phone': '123456789',
            'role': 'new_docent'
        }
        
        mock_get_user_by_email.assert_called_once_with('test@example.com')
        mock_create_locked_user.assert_called_once_with(
            email='test@example.com',
            first_name='Test',
            last_name='User',
            phone='123456789',
            role='new_docent'
        )
    
    @patch.object(UserRepository, 'get_user_by_email')
    @patch.object(UserRepository, 'create_locked_user')
    def test_create_user_existing_email(self, mock_create_locked_user, mock_get_user_by_email):
        mock_existing_user = Mock()
        mock_get_user_by_email.return_value = mock_existing_user
        
        user_data = {
            'email': 'existing@example.com',
            'firstName': 'Test',
            'lastName': 'User',
            'phone': '123456789',
            'role': 'new_docent'
        }
        
        result, status_code = UserService.create_user(user_data)
        
        assert status_code == 400
        assert result == {"error": "Email existing@example.com already registered"}
        
        mock_get_user_by_email.assert_called_once_with('existing@example.com')
        mock_create_locked_user.assert_not_called() 