# SF Zoo Docent Tag-Along Scheduling System

A comprehensive scheduling system designed for the San Francisco Zoo to streamline volunteer coordination and tag assignment processes.

## Quick Start (Local Testing)

1. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb sf_zoo_docent
   ```

2. **Set up environment variables**
   ```bash
   # Create .env file with these values
   DATABASE_URL=postgresql://postgres:postgres@localhost/sf_zoo_docent
   SECRET_KEY=your-secret-key-here
   FLASK_APP=run_python_server.py
   FLASK_ENV=development
   ```

3. **Install dependencies**
   ```bash
   # Install frontend dependencies (for React development)
   npm install
   
   # Install Python dependencies (for Flask backend)
   pip install -r requirements.txt
   ```

4. **Start the servers**
   ```bash
   # Terminal 1: Start Python backend (handles API requests and database)
   python run_python_server.py
   
   # Terminal 2: Start frontend development server (provides hot reloading)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173 (Vite dev server with hot reloading)
   - Backend API: http://localhost:5001 (Python Flask server)

Note: `npm run dev` starts the Vite development server for the React frontend. It provides:
- Hot module reloading for frontend development
- Automatic API request proxying to the Python backend
- Development tools and error reporting

## Features

- User authentication with role-based access control
- Calendar interface for scheduling tag-along requests
- Coordination between new and seasoned docents
- Administrative dashboard for program coordinators
- Email notifications for scheduling updates
- SMS notifications via Twilio (optional)

## Tech Stack

- **Frontend**: React.js with TypeScript, TanStack Query, and shadcn/ui components
- **Backend**: Python Flask with SQLAlchemy
- **Database**: PostgreSQL
- **Authentication**: Session-based authentication with password hashing
- **Styling**: Tailwind CSS

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- Python (v3.9+)
- PostgreSQL database

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sf-zoo-docent-app.git
   cd sf-zoo-docent-app
   ```

2. **Environment Variables**
   ```bash
   # Copy the example environment file and edit it with your values
   cp .env.example .env
   # Edit the .env file with appropriate values
   ```

3. **Install Dependencies**
   ```bash
   # Install Node.js dependencies
   npm install
   
   # Install Python dependencies
   pip install -r requirements.txt
   ```

4. **Database Setup**
   ```bash
   # If running locally, create a PostgreSQL database
   createdb sf_zoo_docent
   ```

### Running the Application

#### Development Mode

1. **Start the Python Backend**
   ```bash
   python run_python_server.py
   ```

2. **Start the Frontend Development Server**
   ```bash
   npm run dev
   ```

The frontend will be available at http://localhost:5173 and will proxy API requests to the backend at http://localhost:5001

#### Production Mode

1. **Build the Frontend**
   ```bash
   npm run build
   ```

2. **Start the Server**
   ```bash
   python run_python_server.py
   ```

The application will be available at http://localhost:5001

## Development Guidelines

- Follow the established project structure
- Use the provided TypeScript types from shared/schema.ts
- Add environment variables to .env (and update .env.example with new keys)
- Never commit sensitive information to version control

## File Structure

- `/client`: React frontend application
- `/python_server`: Python Flask backend server
- `/shared`: Shared types and schemas

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user info

### Tag Requests
- `GET /api/tag-requests` - Get tag requests for a date range
- `GET /api/my-tag-requests` - Get current user's tag requests
- `POST /api/tag-requests` - Create a new tag request
- `PATCH /api/tag-requests/:id` - Update a tag request
- `DELETE /api/tag-requests/:id` - Delete a tag request

### User Management (Coordinator Only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `PATCH /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user
- `POST /api/users/csv` - Bulk create users from CSV