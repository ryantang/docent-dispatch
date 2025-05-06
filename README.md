# SF Zoo Docent Tag-Along Scheduling System

A comprehensive scheduling system designed for the San Francisco Zoo to streamline volunteer coordination and tag assignment processes.

## Features

- User authentication with role-based access control
- Calendar interface for scheduling tag-along requests
- Coordination between new and seasoned docents
- Administrative dashboard for program coordinators
- Email notifications for scheduling updates
- SMS notifications via Twilio (optional)

## Tech Stack

- **Frontend**: React.js with TypeScript, TanStack Query, and shadcn/ui components
- **Backend**: Python Flask with SQLAlchemy and Node.js/Express
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
   
   # Push the schema to the database
   npm run db:push
   ```

### Running the Application

```bash
# Start both servers (Node.js and Python)
npm run dev
```

The application will be available at http://localhost:5000

## Development Guidelines

- Follow the established project structure
- Use the provided TypeScript types from shared/schema.ts
- Add environment variables to .env (and update .env.example with new keys)
- Never commit sensitive information to version control

## File Structure

- `/client`: React frontend application
- `/server`: Node.js backend server
- `/python_server`: Python Flask backend server
- `/shared`: Shared types and schemas