from flask import Flask, jsonify, request, session, send_from_directory
from flask_cors import CORS
from flask_session import Session
from db_config import db
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import secrets
import boto3
import json

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
app.config["SESSION_FILE_DIR"] = "./flask_session"

# --- Database Configuration ---
DB_SECRET_ARN = os.environ.get("DB_SECRET_ARN")

if DB_SECRET_ARN:
    # AWS environment: Fetch credentials from Secrets Manager
    secret_client = boto3.client('secretsmanager')
    secret = secret_client.get_secret_value(SecretId=DB_SECRET_ARN)
    db_credentials = json.loads(secret['SecretString'])
    
    db_user = db_credentials['username']
    db_password = db_credentials['password']
    db_endpoint = os.environ.get("DB_ENDPOINT")
    db_name = os.environ.get("DB_NAME", "docent_dispatch")
    
    database_url = f"postgresql://{db_user}:{db_password}@{db_endpoint}/{db_name}"
else:
    # Local environment: Use default DATABASE_URL
    database_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost/sf_zoo_docent")

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize extensions
db.init_app(app)
Session(app)

# Import routes after initializing app to avoid circular imports
from routes import register_routes

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

        # Bootstrap admin user if needed
        from bootstrap import bootstrap_admin_user
        bootstrap_admin_user()
    
    app.run(host="0.0.0.0", port=5001, debug=True)