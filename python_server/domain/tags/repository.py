from python_server.app import db
from python_server.domain.tags.model import TagRequest
from sqlalchemy import or_

class TagRequestRepository:
    @staticmethod
    def get_all_tag_requests():
        return TagRequest.query.all()

    @staticmethod
    def get_tag_requests_by_user(user_id):
        return TagRequest.query.filter_by(new_docent_id=user_id).all()

    @staticmethod
    def get_tag_requests_by_seasoned_docent(user_id):
        return TagRequest.query.filter(
            or_(
                TagRequest.status == 'requested',
                TagRequest.seasoned_docent_id == user_id
            )
        ).all()

    @staticmethod
    def filter_tag_requests_by_date(start, end):
        return TagRequest.query.filter(TagRequest.date.between(start, end)).all()