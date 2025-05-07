from flask import Flask, jsonify, request, session, send_from_directory
from flask_cors import CORS
from flask_session import Session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import secrets

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__, 
    static_folder='../dist/public',
    static_url_path=''
)

# Configure CORS
CORS(app, supports_credentials=True, origins="*")

# Session configuration
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(16))
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = True
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7)
app.config["SESSION_USE_SIGNER"] = True
app.config["SESSION_FILE_DIR"] = "./python_server/flask_session"

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost/sf_zoo_docent")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize extensions
db = SQLAlchemy(app)
Session(app)

# Import routes after initializing app to avoid circular imports
from python_server.routes import register_routes

# Register all routes with the app
register_routes(app)

# Serve the frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Error handler for all exceptions
@app.errorhandler(Exception)
def handle_error(error):
    code = 500
    if hasattr(error, 'code'):
        code = error.code
    
    return jsonify({
        "error": str(error),
        "status": code
    }), code

if __name__ == "__main__":
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    app.run(host="0.0.0.0", port=5001, debug=True)