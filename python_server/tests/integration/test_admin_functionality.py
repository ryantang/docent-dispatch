import pytest
from datetime import date, timedelta
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

    def test_coordinator_can_bulk_create_users_from_csv(self, authenticated_coordinator, test_db):
        """Test: Coordinator can bulk create users from CSV data"""
        csv_data = [
            {
                'email': 'bulk1@example.com',
                'firstName': 'Bulk',
                'lastName': 'User1',
                'phone': '(415) 555-1001',
                'role': 'new_docent'
            },
            {
                'email': 'bulk2@example.com',
                'firstName': 'Bulk',
                'lastName': 'User2',
                'phone': '(415) 555-1002',
                'role': 'seasoned_docent'
            },
            {
                'email': 'bulk3@example.com',
                'firstName': 'Bulk',
                'lastName': 'User3',
                'phone': '(415) 555-1003',
                'role': 'new_docent'
            }
        ]

        response = authenticated_coordinator.post('/api/users/csv', json=csv_data)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == 3
        assert data['errors'] == []

        # Verify all users were created in database
        for user_data in csv_data:
            user = User.query.filter_by(email=user_data['email']).first()
            assert user is not None
            assert user.first_name == user_data['firstName']
            assert user.last_name == user_data['lastName']
            assert user.phone == user_data['phone']
            assert user.role == user_data['role']

    def test_bulk_create_users_handles_duplicate_emails(self, authenticated_coordinator, test_db):
        """Test: Bulk create handles duplicate emails within the same CSV batch"""
        csv_data = [
            {
                'email': 'duplicate@example.com',  # Line 1 - will succeed
                'firstName': 'First',
                'lastName': 'User',
                'phone': '(415) 555-2001',
                'role': 'new_docent'
            },
            {
                'email': 'unique@example.com',     # Line 2 - will succeed
                'firstName': 'Unique',
                'lastName': 'User',
                'phone': '(415) 555-2002',
                'role': 'seasoned_docent'
            },
            {
                'email': 'duplicate@example.com',  # Line 3 - will fail (duplicate)
                'firstName': 'Second',
                'lastName': 'User',
                'phone': '(415) 555-2003',
                'role': 'new_docent'
            }
        ]

        response = authenticated_coordinator.post('/api/users/csv', json=csv_data)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == 2  # First duplicate + unique succeed
        assert len(data['errors']) == 1  # Only second duplicate fails

        # Verify error details
        error = data['errors'][0]
        assert error['email'] == 'duplicate@example.com'
        assert error['line'] == 3  # Third entry (second duplicate)
        assert 'already registered' in error['error']

        # Verify both successful users were created
        unique_user = User.query.filter_by(email='unique@example.com').first()
        assert unique_user is not None

        # Verify only one duplicate user exists (the first one)
        duplicate_users = User.query.filter_by(email='duplicate@example.com').all()
        assert len(duplicate_users) == 1
        assert duplicate_users[0].first_name == 'First'  # First occurrence was created

    def test_bulk_create_users_handles_existing_users(self, authenticated_coordinator, test_db):
        """Test: Bulk create handles users that already exist in database"""
        # Create an existing user first
        existing_user = User(
            email='existing@example.com',
            first_name='Existing',
            last_name='User',
            role='new_docent',
            phone='(415) 555-3000',
            password=User.hash_password('password123')
        )
        test_db.session.add(existing_user)
        test_db.session.commit()

        csv_data = [
            {
                'email': 'existing@example.com',  # Already exists
                'firstName': 'Should',
                'lastName': 'Fail',
                'phone': '(415) 555-3001',
                'role': 'seasoned_docent'
            },
            {
                'email': 'new@example.com',  # New user
                'firstName': 'Should',
                'lastName': 'Succeed',
                'phone': '(415) 555-3002',
                'role': 'new_docent'
            }
        ]

        response = authenticated_coordinator.post('/api/users/csv', json=csv_data)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == 1
        assert len(data['errors']) == 1
        assert data['errors'][0]['email'] == 'existing@example.com'
        assert data['errors'][0]['line'] == 1
        assert 'already registered' in data['errors'][0]['error']

        # Verify new user was created, existing user unchanged
        new_user = User.query.filter_by(email='new@example.com').first()
        assert new_user is not None
        assert new_user.first_name == 'Should'

        # Verify existing user was not modified
        existing_user_check = User.query.filter_by(email='existing@example.com').first()
        assert existing_user_check.first_name == 'Existing'  # Unchanged

    def test_bulk_create_users_validates_required_fields(self, authenticated_coordinator, test_db):
        """Test: Bulk create validates required fields and handles missing data"""
        csv_data = [
            {
                'email': 'valid@example.com',
                'firstName': 'Valid',
                'lastName': 'User',
                'phone': '(415) 555-4001',
                'role': 'new_docent'
            },
            {
                # Missing required fields
                'firstName': 'Missing',
                'lastName': 'Email',
                'phone': '(415) 555-4002',
                'role': 'new_docent'
            },
            {
                'email': 'missing-name@example.com',
                # Missing firstName and lastName
                'phone': '(415) 555-4003',
                'role': 'seasoned_docent'
            },
            {
                'email': 'invalid-role@example.com',
                'firstName': 'Invalid',
                'lastName': 'Role',
                'phone': '(415) 555-4004',
                'role': 'invalid_role'  # Invalid role
            }
        ]

        response = authenticated_coordinator.post('/api/users/csv', json=csv_data)

        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == 1  # Only first user should succeed
        assert len(data['errors']) == 3

        # Verify error line numbers are correct
        error_lines = [error['line'] for error in data['errors']]
        assert 2 in error_lines  # Missing email
        assert 3 in error_lines  # Missing name fields
        assert 4 in error_lines  # Invalid role

        # Verify only valid user was created
        valid_user = User.query.filter_by(email='valid@example.com').first()
        assert valid_user is not None

    def test_bulk_create_users_returns_detailed_results(self, authenticated_coordinator, test_db):
        """Test: Bulk create returns detailed success and error information"""
        csv_data = [
            {
                'email': 'success1@example.com',
                'firstName': 'Success',
                'lastName': 'One',
                'phone': '(415) 555-5001',
                'role': 'new_docent'
            },
            {
                'email': 'success2@example.com',
                'firstName': 'Success',
                'lastName': 'Two',
                'phone': '(415) 555-5002',
                'role': 'seasoned_docent'
            },
            {
                # This will fail - missing email
                'firstName': 'Fail',
                'lastName': 'One',
                'phone': '(415) 555-5003',
                'role': 'new_docent'
            }
        ]

        response = authenticated_coordinator.post('/api/users/csv', json=csv_data)

        assert response.status_code == 200
        data = response.get_json()

        # Verify response structure
        assert 'success' in data
        assert 'errors' in data
        assert data['success'] == 2
        assert len(data['errors']) == 1

        # Verify error details structure
        error = data['errors'][0]
        assert 'line' in error
        assert 'email' in error
        assert 'error' in error
        assert error['line'] == 3
        assert error['email'] == 'unknown'  # No email provided

        # Verify successful users were created
        success1 = User.query.filter_by(email='success1@example.com').first()
        success2 = User.query.filter_by(email='success2@example.com').first()
        assert success1 is not None
        assert success2 is not None

    def test_new_docent_cannot_access_user_management_endpoints(self, authenticated_new_docent):
        """Test: New docent cannot access any user management endpoints"""
        # Test GET /api/users (view all users)
        response = authenticated_new_docent.get('/api/users')
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']

        # Test POST /api/users (create user)
        response = authenticated_new_docent.post('/api/users', json={
            'email': 'unauthorized@example.com',
            'firstName': 'Should',
            'lastName': 'Fail',
            'role': 'new_docent'
        })
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']

        # Test PATCH /api/users/1 (update user)
        response = authenticated_new_docent.patch('/api/users/1', json={
            'firstName': 'Updated'
        })
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']

        # Test DELETE /api/users/1 (delete user)
        response = authenticated_new_docent.delete('/api/users/1')
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']

        # Test POST /api/users/csv (bulk create)
        response = authenticated_new_docent.post('/api/users/csv', json=[
            {'email': 'bulk@example.com', 'firstName': 'Bulk', 'lastName': 'User', 'role': 'new_docent'}
        ])
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']

    def test_seasoned_docent_cannot_access_user_management_endpoints(self, authenticated_seasoned_docent):
        """Test: Seasoned docent cannot access any user management endpoints"""
        # Test GET /api/users (view all users)
        response = authenticated_seasoned_docent.get('/api/users')
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']
        
        # Test POST /api/users (create user)
        response = authenticated_seasoned_docent.post('/api/users', json={
            'email': 'unauthorized@example.com',
            'firstName': 'Should',
            'lastName': 'Fail',
            'role': 'new_docent'
        })
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']

        # Test PATCH /api/users/1 (update user)
        response = authenticated_seasoned_docent.patch('/api/users/1', json={
            'firstName': 'Updated'
        })
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']

        # Test DELETE /api/users/1 (delete user)
        response = authenticated_seasoned_docent.delete('/api/users/1')
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']

        # Test POST /api/users/csv (bulk create)
        response = authenticated_seasoned_docent.post('/api/users/csv', json=[
            {'email': 'bulk@example.com', 'firstName': 'Bulk', 'lastName': 'User', 'role': 'new_docent'}
        ])
        assert response.status_code == 403
        data = response.get_json()
        assert 'Forbidden' in data['error']