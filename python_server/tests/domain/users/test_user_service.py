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
    
    @patch.object(UserRepository, 'get_user_by_id')
    @patch.object(UserRepository, 'get_user_by_email')
    @patch.object(UserRepository, 'update_user')
    def test_update_user_details_success(self, mock_update_user, mock_get_by_email, mock_get_by_id):
        # Setup
        user_id = 1
        
        mock_user = Mock()
        mock_user.id = user_id
        mock_user.to_dict.return_value = {
            'id': user_id,
            'email': 'updated@example.com',
            'firstName': 'Updated',
            'lastName': 'User',
            'phone': '987654321',
            'role': 'seasoned_docent'
        }
        mock_get_by_id.return_value = mock_user
        mock_get_by_email.return_value = None  # No existing user with the email
        
        update_data = {
            'email': 'updated@example.com',
            'firstName': 'Updated',
            'lastName': 'User',
            'phone': '987654321',
            'role': 'seasoned_docent'
        }
        
        # Execute
        result, status_code = UserService.update_user_details(user_id, update_data)
        
        # Assert
        assert status_code == 200
        assert result == {
            'id': user_id,
            'email': 'updated@example.com',
            'firstName': 'Updated',
            'lastName': 'User',
            'phone': '987654321',
            'role': 'seasoned_docent'
        }
        
        # Verify method calls
        mock_get_by_id.assert_called_once_with(user_id)
        mock_get_by_email.assert_called_once_with('updated@example.com')
        mock_update_user.assert_called_once()
        
        # Verify attributes were set correctly
        assert mock_user.email == 'updated@example.com'
        assert mock_user.first_name == 'Updated'
        assert mock_user.last_name == 'User'
        assert mock_user.phone == '987654321'
        assert mock_user.role == 'seasoned_docent'
    
    @patch.object(UserRepository, 'get_user_by_id')
    def test_update_user_details_not_found(self, mock_get_by_id):
        # Setup
        user_id = 999
        mock_get_by_id.return_value = None  # User not found
        
        update_data = {
            'email': 'updated@example.com',
            'firstName': 'Updated',
            'lastName': 'User'
        }
        
        # Execute
        result, status_code = UserService.update_user_details(user_id, update_data)
        
        # Assert
        assert status_code == 404
        assert result == {"error": "User not found"}
        
        # Verify method calls
        mock_get_by_id.assert_called_once_with(user_id)
    
    @patch.object(UserRepository, 'get_user_by_id')
    @patch.object(UserRepository, 'get_user_by_email')
    def test_update_user_details_email_already_taken(self, mock_get_by_email, mock_get_by_id):
        # Setup
        user_id = 1
        taken_email = 'taken@example.com'
        
        mock_user = Mock()
        mock_user.id = user_id
        mock_get_by_id.return_value = mock_user
        
        # Another user with the email already exists
        other_user = Mock()
        other_user.id = 2  # Different ID
        mock_get_by_email.return_value = other_user
        
        update_data = {
            'email': taken_email
        }
        
        # Execute
        result, status_code = UserService.update_user_details(user_id, update_data)
        
        # Assert
        assert status_code == 400
        assert result == {"error": "Email already registered"}
        
        # Verify method calls
        mock_get_by_id.assert_called_once_with(user_id)
        mock_get_by_email.assert_called_once_with(taken_email) 