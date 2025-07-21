import pytest
from datetime import date, timedelta
from unittest.mock import patch
from domain.users.user_model import User
from domain.tags.tag_model import TagRequest
from db_config import db

class TestAdminFunctionality:


    def test_coordinator_can_create_single_user(self, authenticated_coordinator, test_db):
        """Test: Coordinator can create a single user"""
        response = authenticated_coordinator.post('/api/users', json={
            'email': 'newuser@example.com',
            'firstName': 'Test',
            'lastName': 'User',
            'phone': '(415) 555-1234',
            'role': 'new_docent'
        })
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['email'] == 'newuser@example.com'
        assert data['firstName'] == 'Test'
        assert data['lastName'] == 'User'
        assert data['phone'] == '(415) 555-1234'
        assert data['role'] == 'new_docent'
        assert 'password' not in data  # Password should not be returned
        
        # # Verify email was sent for new user creation
        # mock_email.assert_called_once()
        
        # Verify user was created in database
        user = User.query.filter_by(email='newuser@example.com').first()
        assert user is not None
        assert user.first_name == 'Test'
        assert user.last_name == 'User'

    def test_coordinator_can_update_user_details(self, authenticated_coordinator, test_db, new_docent_user):
        """Test: Coordinator can update user details"""
        response = authenticated_coordinator.patch(f'/api/users/{new_docent_user.id}', json={
            'firstName': 'UpdatedFirst',
            'lastName': 'UpdatedLast',
            'phone': '(510) 555-9999',
            'role': 'seasoned_docent'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['firstName'] == 'UpdatedFirst'
        assert data['lastName'] == 'UpdatedLast'
        assert data['phone'] == '(510) 555-9999'
        assert data['role'] == 'seasoned_docent'
        assert data['email'] == 'newdocent@example.com'  # Email unchanged
        
        # Verify changes persisted in database
        user = User.query.get(new_docent_user.id)
        assert user.first_name == 'UpdatedFirst'
        assert user.last_name == 'UpdatedLast'
        assert user.phone == '(510) 555-9999'
        assert user.role == 'seasoned_docent'

    def test_coordinator_can_delete_user_without_tag_requests(self, authenticated_coordinator, test_db, second_new_docent_user):
        """Test: Coordinator can delete user who has no tag requests"""
        user_id = second_new_docent_user.id
        
        response = authenticated_coordinator.delete(f'/api/users/{user_id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify user was deleted from database
        user = User.query.get(user_id)
        assert user is None

    def test_cannot_delete_user_with_existing_tag_requests(self, authenticated_coordinator, test_db, new_docent_user):
        """Test: Cannot delete user who has existing tag requests"""
        # Create a tag request for the user
        tag_request = TagRequest(
            date=date.today() + timedelta(days=7),
            time_slot='AM',
            status='requested',
            new_docent_id=new_docent_user.id
        )
        test_db.session.add(tag_request)
        test_db.session.commit()
        
        response = authenticated_coordinator.delete(f'/api/users/{new_docent_user.id}')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'Cannot delete user with tag requests' in data['error']
        
        # Verify user was NOT deleted
        user = User.query.get(new_docent_user.id)
        assert user is not None

    def test_coordinator_can_view_all_users(self, authenticated_coordinator, test_db):
        """Test: Coordinator can view all users in the system"""
        # Create known test users within this test
        test_user1 = User(
            email='testuser1@example.com',
            first_name='Test1',
            last_name='User1',
            role='new_docent',
            phone='(650) 555-0001',
            password=User.hash_password('password123')
        )
        test_user2 = User(
            email='testuser2@example.com', 
            first_name='Test2',
            last_name='User2',
            role='seasoned_docent',
            phone='(650) 555-0002',
            password=User.hash_password('password123')
        )
        test_db.session.add(test_user1)
        test_db.session.add(test_user2)
        test_db.session.commit()
        
        response = authenticated_coordinator.get('/api/users')
        
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 3  # At least coordinator + 2 test users
        
        # Verify user data structure and no passwords returned
        for user_data in data:
            assert 'id' in user_data
            assert 'email' in user_data
            assert 'firstName' in user_data
            assert 'lastName' in user_data
            assert 'role' in user_data
            assert 'password' not in user_data
        
        # Verify our test users are in the response
        emails = [user['email'] for user in data]
        assert 'testuser1@example.com' in emails
        assert 'testuser2@example.com' in emails