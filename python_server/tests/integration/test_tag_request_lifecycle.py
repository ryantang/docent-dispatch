import pytest
from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from domain.tags.tag_model import TagRequest
from domain.users.user_model import User
from db_config import db
from utils import send_email_confirmation

class TestTagRequestLifecycle:
    
    def test_new_docent_creates_tag_request(self, authenticated_new_docent, test_db, new_docent_user):
        """Test: New docent can create a tag request"""
        future_date = (date.today() + timedelta(days=7)).isoformat()
        
        response = authenticated_new_docent.post('/api/tag-requests', json={
            'date': future_date,
            'timeSlot': 'AM'
        })
        
        assert response.status_code == 201
        data = response.get_json()

        print(f'data response is {data}')

        assert data['status'] == 'requested'
        assert data['date'] == future_date
        assert data['timeSlot'] == 'AM'
        assert data['newDocentId'] == new_docent_user.id
        assert data['seasonedDocentId'] is None
        
        # Verify in database
        request = TagRequest.query.first()
        assert request.status == 'requested'
        assert request.new_docent_id == new_docent_user.id

    def test_prevent_duplicate_request_same_slot(self, authenticated_new_docent, test_db, new_docent_user):
        """Test: Cannot create duplicate request for same date/time slot"""
        future_date = (date.today() + timedelta(days=7)).isoformat()
        
        # Create first request
        first_response = authenticated_new_docent.post('/api/tag-requests', json={
            'date': future_date,
            'timeSlot': 'AM'
        })
        
        assert first_response.status_code == 201

        # Attempt duplicate request
        second_response = authenticated_new_docent.post('/api/tag-requests', json={
            'date': future_date,
            'timeSlot': 'AM'
        })
        
        assert second_response.status_code == 400
        data = second_response.get_json()
        assert 'A tag request already exists for this date and time slot' in data['error']

    def test_can_create_different_time_slot_same_date(self, authenticated_new_docent, test_db):
        """Test: Can create requests for different time slots on same date"""
        future_date = (date.today() + timedelta(days=7)).isoformat()
        
        # Create AM request
        response1 = authenticated_new_docent.post('/api/tag-requests', json={
            'date': future_date,
            'timeSlot': 'AM'
        })
        assert response1.status_code == 201
        
        # Create PM request for same date
        response2 = authenticated_new_docent.post('/api/tag-requests', json={
            'date': future_date,
            'timeSlot': 'PM'
        })
        assert response2.status_code == 201

    def test_seasoned_docent_views_available_requests(self, authenticated_seasoned_docent, test_db, new_docent_user, second_new_docent_user):
        """Test: Seasoned docent can view all open requests from multiple new docents"""
        future_date_1 = date.today() + timedelta(days=7)
        future_date_2 = date.today() + timedelta(days=14)
        
        # Create tag requests from both docents
        tag_request_1 = TagRequest(
            date=future_date_1,
            time_slot='AM',
            status='requested',
            new_docent_id=new_docent_user.id
        )
        tag_request_2 = TagRequest(
            date=future_date_2,
            time_slot='PM',
            status='requested',
            new_docent_id=second_new_docent_user.id
        )
        test_db.session.add(tag_request_1)
        test_db.session.add(tag_request_2)
        test_db.session.commit()
        
        response = authenticated_seasoned_docent.get('/api/tag-requests')
        
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2
        
        # Sort by date to ensure consistent ordering
        data_sorted = sorted(data, key=lambda x: x['date'])
        
        # Verify first request
        assert data_sorted[0]['status'] == 'requested'
        assert data_sorted[0]['timeSlot'] == 'AM'
        assert data_sorted[0]['date'] == future_date_1.isoformat()
        assert data_sorted[0]['newDocentId'] == new_docent_user.id
        
        # Verify second request
        assert data_sorted[1]['status'] == 'requested'
        assert data_sorted[1]['timeSlot'] == 'PM'
        assert data_sorted[1]['date'] == future_date_2.isoformat()
        assert data_sorted[1]['newDocentId'] == second_new_docent_user.id

    @patch('routes.send_email_confirmation')
    def test_seasoned_docent_accepts_request_triggers_email(self, mock_email, authenticated_seasoned_docent, test_db, new_docent_user, seasoned_docent_user):
        """Test: Accepting request changes status and triggers email"""
        future_date = date.today() + timedelta(days=7)
        
        # Create tag request
        tag_request = TagRequest(
            date=future_date,
            time_slot='PM',
            status='requested',
            new_docent_id=new_docent_user.id
        )
        test_db.session.add(tag_request)
        test_db.session.commit()
        
        response = authenticated_seasoned_docent.patch(f'/api/tag-requests/{tag_request.id}', json={
            'status': 'filled'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'filled'
        assert data['seasonedDocentId'] == seasoned_docent_user.id
        
        # Verify email was triggered
        mock_email.assert_called_once()
        call_args = mock_email.call_args[0]
        assert tag_request in call_args

    def test_new_docent_cancels_own_unfilled_request(self, authenticated_new_docent, test_db, new_docent_user):
        """Test: New docent can cancel their own unfilled request"""
        future_date = date.today() + timedelta(days=7)
        
        # Create tag request
        tag_request = TagRequest(
            date=future_date,
            time_slot='AM',
            status='requested',
            new_docent_id=new_docent_user.id
        )
        test_db.session.add(tag_request)
        test_db.session.commit()
        
        response = authenticated_new_docent.delete(f'/api/tag-requests/{tag_request.id}')
        
        assert response.status_code == 200
        
        # Verify request is deleted
        assert TagRequest.query.get(tag_request.id) is None

    def test_filled_request_cannot_be_cancelled(self, authenticated_new_docent, test_db, new_docent_user, seasoned_docent_user):
        """Test: Cannot cancel a filled request"""
        future_date = date.today() + timedelta(days=7)
        
        # Create filled tag request
        tag_request = TagRequest(
            date=future_date,
            time_slot='AM',
            status='filled',
            new_docent_id=new_docent_user.id,
            seasoned_docent_id=seasoned_docent_user.id
        )
        test_db.session.add(tag_request)
        test_db.session.commit()
        
        response = authenticated_new_docent.delete(f'/api/tag-requests/{tag_request.id}')
        
        assert response.status_code == 409
        data = response.get_json()
        assert 'Cannot delete a tag request' in data['error']

    def test_new_docent_cannot_accept_request(self, authenticated_new_docent, test_db, new_docent_user):
        """Test: New docent cannot accept requests (authorization)"""
        future_date = date.today() + timedelta(days=7)
        
        # Create tag request
        tag_request = TagRequest(
            date=future_date,
            time_slot='AM',
            status='requested',
            new_docent_id=new_docent_user.id
        )
        test_db.session.add(tag_request)
        test_db.session.commit()
        
        response = authenticated_new_docent.patch(f'/api/tag-requests/{tag_request.id}', json={
            'status': 'filled'
        })
        
        assert response.status_code == 403
        data = response.get_json()
        assert 'not authorized' in data['error']

    def test_cannot_cancel_other_users_request(self, authenticated_new_docent, test_db, second_new_docent_user):
        """Test: New docent cannot cancel another new docent's request"""
        future_date = date.today() + timedelta(days=7)
        
        # Create tag request by the second new docent
        tag_request = TagRequest(
            date=future_date,
            time_slot='AM',
            status='requested',
            new_docent_id=second_new_docent_user.id
        )
        test_db.session.add(tag_request)
        test_db.session.commit()
        
        # The authenticated_new_docent (first user) tries to cancel second user's request
        response = authenticated_new_docent.delete(f'/api/tag-requests/{tag_request.id}')
        
        assert response.status_code == 403
        data = response.get_json()
        assert 'tag request belongs to another docent' in data['error']

    def test_seasoned_docent_cannot_accept_past_date_request(self, authenticated_seasoned_docent, test_db, new_docent_user):
        """Test: Seasoned docent cannot accept request for past date"""
        past_date = date.today() - timedelta(days=1)
        
        # Create tag request for past date (this might exist in edge cases)
        tag_request = TagRequest(
            date=past_date,
            time_slot='AM',
            status='requested',
            new_docent_id=new_docent_user.id
        )
        test_db.session.add(tag_request)
        test_db.session.commit()
        
        response = authenticated_seasoned_docent.patch(f'/api/tag-requests/{tag_request.id}', json={
            'status': 'filled'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'past date' in data['error']

    def test_cannot_create_request_for_past_date(self, authenticated_new_docent, test_db):
        """Test: Cannot create request for past date"""
        past_date = (date.today() - timedelta(days=1)).isoformat()
        
        response = authenticated_new_docent.post('/api/tag-requests', json={
            'date': past_date,
            'timeSlot': 'AM'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'past date' in data['error']