from python_server.app import db
from datetime import datetime
from passlib.hash import pbkdf2_sha256
from sqlalchemy.orm import relationship

from python_server.domain.users.model import User

class TagRequest(db.Model):
    __tablename__ = 'tag_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    new_docent_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    seasoned_docent_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    date = db.Column(db.Date, nullable=False)
    time_slot = db.Column(db.String(20), nullable=False)  # AM, PM
    status = db.Column(db.String(20), default='requested')  # requested, filled
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    new_docent = relationship('User', foreign_keys=[new_docent_id], back_populates='new_docent_tag_requests')
    seasoned_docent = relationship('User', foreign_keys=[seasoned_docent_id], back_populates='seasoned_docent_tag_requests')
    
    def to_dict(self):
        result = {
            'id': self.id,
            'newDocentId': self.new_docent_id,
            'seasonedDocentId': self.seasoned_docent_id,
            'date': self.date.isoformat(),
            'timeSlot': self.time_slot,
            'status': self.status,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }
        
        # Include the related users
        if self.new_docent:
            result['newDocent'] = self.new_docent.to_dict()
            
        if self.seasoned_docent:
            result['seasonedDocent'] = self.seasoned_docent.to_dict()
            
        return result


