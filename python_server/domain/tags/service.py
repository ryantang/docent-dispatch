# python_server/domain/tags/service.py
from datetime import datetime
from python_server.domain.tags.repository import TagRequestRepository

class TagRequestService:
    @staticmethod
    def get_tag_requests(user, start_date=None, end_date=None):
        # Filter by date range if provided
        if start_date and end_date:
            start = datetime.fromisoformat(start_date.split('T')[0])
            end = datetime.fromisoformat(end_date.split('T')[0])
            tag_requests = TagRequestRepository.filter_tag_requests_by_date(start, end)
        else:
            tag_requests = []

        # Coordinators can see all tag requests
        if user.role == 'coordinator':
            tag_requests = TagRequestRepository.get_all_tag_requests()
        # Seasoned docents see their own tags and open requests
        elif user.role == 'seasoned_docent':
            tag_requests = TagRequestRepository.get_tag_requests_by_seasoned_docent(user.id)
        # New docents only see their own requests
        else:
            tag_requests = TagRequestRepository.get_tag_requests_by_user(user.id)

        return tag_requests