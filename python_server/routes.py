from flask import jsonify, request, session
from db_config import db
from domain.users.user_model import User
from domain.tags.tag_model import TagRequest
from utils import send_email_confirmation
from datetime import datetime, timedelta, date
import secrets
import logging
from functools import wraps
from sqlalchemy import or_, and_
from domain.users.user_service import UserService

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
    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.json
        user_data, status_code = UserService.login_user(data)
        
        if 'error' in user_data:
            return jsonify(user_data), status_code
        
        # Store user ID in session
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
        return jsonify(result)
    
     # User management routes
    @app.route('/api/users', methods=['GET'])
    @login_required
    @role_required(['coordinator'])
    def get_all_users():
        users = User.query.all()
        return jsonify([user.to_dict() for user in users])

    @app.route('/api/users', methods=['POST'])
    @login_required
    @role_required(['coordinator'])
    def create_user():
        data = request.json
        user_data, status_code = UserService.create_user(data)
        
        if 'error' in user_data:
            return jsonify(user_data), status_code
            
        return jsonify(user_data), status_code

    @app.route('/api/users/<int:user_id>', methods=['PATCH'])
    @login_required
    @role_required(['coordinator'])
    def update_user(user_id):
        data = request.json
        result, status_code = UserService.update_user_details(user_id, data)
        
        return jsonify(result), status_code

    @app.route('/api/users/<int:user_id>', methods=['DELETE'])
    @login_required
    @role_required(['coordinator'])
    def delete_user(user_id):
        user = User.query.get_or_404(user_id)

        # Check if user has any tag requests
        tag_requests = TagRequest.query.filter(
            or_(
                TagRequest.new_docent_id == user_id,
                TagRequest.seasoned_docent_id == user_id
            )
        ).first()

        if tag_requests:
            return jsonify({
                "error": "Cannot delete user with tag requests. Reassign or delete the requests first."
            }), 400

        db.session.delete(user)
        db.session.commit()

        return jsonify({"success": True})

    @app.route('/api/users/csv', methods=['POST'])
    @login_required
    @role_required(['coordinator'])
    def bulk_create_users():
        data = request.json
        results = {
            "success": 0,
            "errors": []
        }
        
        for i, user_data in enumerate(data):
            try:
                # Process each user via the service layer
                user_result, status_code = UserService.create_user(user_data)
                
                if 'error' in user_result:
                    results["errors"].append({
                        "line": i + 1,
                        "email": user_data.get('email', 'unknown'),
                        "error": user_result['error']
                    })
                    continue
                
                results["success"] += 1
                
            except Exception as e:
                results["errors"].append({
                    "line": i + 1,
                    "email": user_data.get('email', 'unknown'),
                    "error": str(e)
                })
        
        return jsonify(results)
    
    # Tag request routes
    @app.route('/api/tag-requests', methods=['GET'])
    @login_required
    def get_tag_requests():
        from domain.tags.tag_service import TagRequestService  # Import locally
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        tag_requests = TagRequestService.get_tag_requests(user, start_date, end_date)
        
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
        
        tag_date = datetime.fromisoformat(data['date'].split('T')[0]).date()

        if tag_date < date.today():
            return jsonify({"error": "Cannot create a tag request for a past date"}), 400
        
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
            if tag.status == 'filled':
                return jsonify({"error": "This tag request is no longer available"}), 400
            if tag.date < date.today():
                return jsonify({"error": "Cannot accept request for past date"}), 400

            tag.seasoned_docent_id = user_id
            tag.status = 'filled'
            logging.info(f"Sending email confirmation for tag {tag.id}")
            print(f"calling send_email_confirmation for tag {tag.id}")
            send_email_confirmation(tag)

        
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
        
        else:
            return jsonify({"error": "not authorized"}), 403
        
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

        if user.role != 'coordinator': # coordinators can delete any tag request
            if tag.new_docent_id != user_id:
                return jsonify({"error": "Cannot delete a tag request that belongs to another docent"}), 403
            if tag.status != 'requested':
                return jsonify({"error": "Cannot delete a tag request that is filled"}), 409

        # Perform the deletion
        try:
            db.session.delete(tag)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to delete request"}), 500

        logging.info(f"User {user_id} deleted tag request {tag_id}")
        return jsonify({"success": True})
    
    # Health check endpoint for load balancer
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy", "service": "docent-dispatch"})