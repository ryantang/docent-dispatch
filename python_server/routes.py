from flask import jsonify, request, session
from python_server.models import User, TagRequest, db
from python_server.utils import send_email_confirmation
from datetime import datetime, timedelta
import secrets
import logging
from functools import wraps
from sqlalchemy import or_, and_
from python_server.domain.users.service import UserService

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

# Role-based access control decorator
def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({"error": "Unauthorized"}), 401
            
            user_id = session.get('user_id')
            user = User.query.get(user_id)
            
            if not user or user.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def register_routes(app):
    # Auth routes
    @app.route('/api/register', methods=['POST'])
    def register():
        data = request.json
        user_data, status_code = UserService.register_user(data)
        
        if 'error' in user_data:
            return jsonify(user_data), status_code
        
        # Automatically log in the user
        session['user_id'] = user_data['id']
        
        return jsonify(user_data), status_code
    
    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.json
        user_data, status_code = UserService.login_user(data)
        
        if 'error' in user_data:
            return jsonify(user_data), status_code
        
        # Set user in session
        session['user_id'] = user_data['id']
        
        return jsonify(user_data), status_code
    
    @app.route('/api/logout', methods=['POST'])
    def logout():
        session.clear()
        return jsonify({"success": True})
    
    @app.route('/api/user', methods=['GET'])
    @login_required
    def get_current_user():
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        return jsonify(user.to_dict())
    
    # Password reset routes
    @app.route('/api/request-password-reset', methods=['POST'])
    def request_password_reset():
        data = request.json
        UserService.request_password_reset(data['email'])
        return jsonify({"success": True}) #always return success to prevent email enumeration
    
    @app.route('/api/reset-password', methods=['POST'])
    def reset_password():
        data = request.json
        token = data['token']
        password = data['password']

        result = UserService.reset_password(token, password)
        if 'error' in result:
            return jsonify(result), 400
        return jsonify({"success": True})
    
    
    # Tag request routes
    @app.route('/api/tag-requests', methods=['GET'])
    @login_required
    def get_tag_requests():
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        query = TagRequest.query
        
        # Filter by date range if provided
        if start_date and end_date:
            start = datetime.fromisoformat(start_date.split('T')[0])
            end = datetime.fromisoformat(end_date.split('T')[0])
            query = query.filter(TagRequest.date.between(start, end))
        
        # Coordinators can see all tag requests
        if user.role == 'coordinator':
            tag_requests = query.all()
        # Seasoned docents see their own tags and open requests
        elif user.role == 'seasoned_docent':
            tag_requests = query.filter(
                or_(
                    TagRequest.status == 'requested',
                    TagRequest.seasoned_docent_id == user_id
                )
            ).all()
        # New docents only see their own requests
        else:
            tag_requests = query.filter_by(new_docent_id=user_id).all()
        
        return jsonify([tag.to_dict() for tag in tag_requests])
    
    @app.route('/api/my-tag-requests', methods=['GET'])
    @login_required
    def get_my_tag_requests():
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        
        if user.role == 'new_docent':
            tag_requests = TagRequest.query.filter_by(new_docent_id=user_id).all()
        elif user.role == 'seasoned_docent':
            tag_requests = TagRequest.query.filter_by(seasoned_docent_id=user_id).all()
        
        return jsonify([tag.to_dict() for tag in tag_requests])
    
    @app.route('/api/tag-requests', methods=['POST'])
    @login_required
    @role_required(['new_docent'])
    def create_tag_request():
        user_id = session.get('user_id')
        data = request.json
        
        tag_date = datetime.fromisoformat(data['date'].split('T')[0])
        
        existing_tag = TagRequest.query.filter_by(
            date=tag_date,
            time_slot=data['timeSlot'],
            new_docent_id=user_id,
        ).first()
        
        if existing_tag:
            return jsonify({
                "error": "A tag request already exists for this date and time slot"
            }), 400
        
        new_tag = TagRequest(
            new_docent_id=user_id,
            date=tag_date,
            time_slot=data['timeSlot'],
            notes=data.get('notes')
        )
        
        db.session.add(new_tag)
        db.session.commit()
        
        return jsonify(new_tag.to_dict()), 201
    
    @app.route('/api/tag-requests/<int:tag_id>', methods=['PATCH'])
    @login_required
    def update_tag_request(tag_id):
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        tag = TagRequest.query.get_or_404(tag_id)
        data = request.json
        
        # Seasoned docents can claim a tag
        if user.role == 'seasoned_docent' and 'status' in data and data['status'] == 'filled':
            if tag.status == 'requested':
                tag.seasoned_docent_id = user_id
                tag.status = 'filled'
                logging.info(f"Sending email confirmation for tag {tag.id}")
                print(f"calling send_email_confirmation for tag {tag.id}")
                send_email_confirmation(tag)
            else:
                return jsonify({"error": "This tag request is no longer available"}), 400
        
        # Coordinators can update any tag
        elif user.role == 'coordinator':
            if 'newDocentId' in data:
                tag.new_docent_id = data['newDocentId']
            
            if 'seasonedDocentId' in data:
                tag.seasoned_docent_id = data['seasonedDocentId']
            
            if 'date' in data:
                tag.date = datetime.fromisoformat(data['date'].split('T')[0])
            
            if 'timeSlot' in data:
                tag.time_slot = data['timeSlot']
            
            if 'status' in data:
                tag.status = data['status']
            
            if 'notes' in data:
                tag.notes = data['notes']
        
        # New docents can only update their own requests if they're still open
        elif user.role == 'new_docent' and tag.new_docent_id == user_id and tag.status == 'requested':
            if 'notes' in data:
                tag.notes = data['notes']
            
            if 'date' in data:
                tag.date = datetime.fromisoformat(data['date'].split('T')[0])
            
            if 'timeSlot' in data:
                tag.time_slot = data['timeSlot']
        else:
            return jsonify({"error": "You don't have permission to update this tag request"}), 403
        
        db.session.commit()
        
        # If a tag was filled, in a real app we would send email notifications
        if tag.status == 'filled' and tag.new_docent and tag.seasoned_docent:
            print(f"Tag request filled: New docent {tag.new_docent.first_name} {tag.new_docent.last_name} will tag along with {tag.seasoned_docent.first_name} {tag.seasoned_docent.last_name} on {tag.date} ({tag.time_slot})")
        
        return jsonify(tag.to_dict())
    
    @app.route('/api/tag-requests/<int:tag_id>', methods=['DELETE'])
    @login_required
    def delete_tag_request(tag_id):
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        tag = TagRequest.query.get_or_404(tag_id)
        
        # Check permissions
        if (user.role == 'coordinator' or 
            (user.role == 'new_docent' and tag.new_docent_id == user_id and tag.status == 'requested')):
            
            db.session.delete(tag)
            db.session.commit()
            
            return jsonify({"success": True})
        
        return jsonify({"error": "You don't have permission to delete this tag request"}), 403