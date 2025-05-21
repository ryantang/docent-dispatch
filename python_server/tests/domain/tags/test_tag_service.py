from unittest.mock import Mock, patch

from python_server.domain.tags.tag_service import TagRequestService
from python_server.domain.tags.tag_repository import TagRequestRepository

class TestTagRequestService:

    @patch.object(TagRequestRepository, 'get_all_tag_requests')
    def test_coordinator_role(self, mock_get_all):  
        coordinator_user = Mock()
        coordinator_user.role = 'coordinator'

        mock_get_all.return_value = ['mocked_tag_request_1', 'mocked_tag_request_2']
        result = TagRequestService.get_tag_requests(coordinator_user)
        
        assert result == ['mocked_tag_request_1', 'mocked_tag_request_2']
    
    @patch.object(TagRequestRepository, 'get_tag_requests_by_user')
    def test_new_docent_role(self, mock_get_by_user):
        new_docent_user = Mock()
        new_docent_user.role = 'new_docent'

        mock_get_by_user.return_value = ['mocked_tag_request_1']
        result = TagRequestService.get_tag_requests(new_docent_user)
        assert result == ['mocked_tag_request_1']

    @patch.object(TagRequestRepository, 'get_tag_requests_by_seasoned_docent')
    def test_seasoned_docent_role(self, mock_get_by_seasoned):
        seasoned_docent_user = Mock()
        seasoned_docent_user.role = 'seasoned_docent'

        mock_get_by_seasoned.return_value = ['mocked_tag_request_1', 'mocked_tag_request_2']
        result = TagRequestService.get_tag_requests(seasoned_docent_user)
        assert result == ['mocked_tag_request_1', 'mocked_tag_request_2']

    @patch.object(TagRequestRepository, 'get_all_tag_requests')
    def test_date_range(self, mock_get_all):
        pass




#     def test_get_tag_requests(self, mock_get_all):

#         # Set up the mock return value
#         mock_get_all.return_value = ['mocked_tag_request_1', 'mocked_tag_request_2']
     

#         # Mock the repository
#         # tag_request1 = Mock()
#         # tag_request2 = Mock()
#         # tag_request3 = Mock()
        
#         # coordinator_user = Mock()
#         # coordinator_user.role = 'coordinator'
#         # coordinator_user.id = 10
        
#         new_docent_user = Mock()
#         new_docent_user.role = 'new_docent'
#         new_docent_user.id = 1
        
#         # seasoned_docent_user1 = Mock()
#         # seasoned_docent_user1.role = 'seasoned_docent'
#         # seasoned_docent_user1.id = 99
        
#         # seasoned_docent_user2 = Mock()
#         # seasoned_docent_user2.role = 'seasoned_docent'
#         # seasoned_docent_user2.id = 98
        
#         # Use patch to mock the repository
#         with patch('python_server.domain.tags.repository.TagRequestRepository') as MockRepo:
#             # Set up return values for repository methods
#             # MockRepo.get_all_tag_requests.return_value = [tag_request1, tag_request2, tag_request3]
#             # MockRepo.get_tag_requests_by_user.return_value = [tag_request1]
#             # MockRepo.get_tag_requests_by_seasoned_docent.return_value = [tag_request1, tag_request2, tag_request3]
            
#             # Test coordinator role
#             coordinator_tags = TagRequestService.get_tag_requests(coordinator_user)
#             assert len(coordinator_tags) == 3
#             # MockRepo.get_all_tag_requests.assert_called_once()
            

# # Assert the result
#            # assert result == ['mocked_tag_request_1', 'mocked_tag_request_2']
#             mock_get_all.assert_called_once()  # Ensure it was called once



#             # Reset the mock
#             # MockRepo.reset_mock()
            
#             # Test new docent role
#             new_docent_tags = TagRequestService.get_tag_requests(new_docent_user)
#             assert len(new_docent_tags) == 1
#             MockRepo.get_tag_requests_by_user.assert_called_once_with(1)
            
#             # Reset the mock
#             MockRepo.reset_mock()
            
#             # Test seasoned docent role
#             seasoned_docent1_tags = TagRequestService.get_tag_requests(seasoned_docent_user1)
#             assert len(seasoned_docent1_tags) == 3
#             MockRepo.get_tag_requests_by_seasoned_docent.assert_called_once_with(99)



