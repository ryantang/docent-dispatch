# SF Zoo Docent Matching Architecture

## Overview

The SF Zoo Docent Matching application is a web-based platform designed to facilitate the coordination between new and seasoned docents at the San Francisco Zoo. The application allows new docents to request tag-along sessions with experienced docents, helps manage schedules, and provides administrative capabilities for program coordinators.

The system follows a dual-server architecture with separate but integrated frontend and backend components:

1. A React-based frontend with a modern UI component system
2. A dual backend approach featuring:
   - Node.js/Express API server
   - Python/Flask API server

This architecture enables straightforward UI rendering, API functionality, and database interactions while separating concerns across the application.

## System Architecture

The application adopts a hybrid architecture that combines:

- **Client-Side Rendering**: React-based frontend with modern component libraries
- **Dual Backend Services**: 
  - Node.js/Express API server (primary)
  - Python/Flask API server (secondary)
- **Database**: PostgreSQL for persistent data storage
- **Authentication**: Session-based authentication with security features

### Technical Stack

- **Frontend**: 
  - React (with TypeScript)
  - TanStack Query for API state management
  - Tailwind CSS for styling
  - shadcn/ui component library (based on Radix UI primitives)

- **Primary Backend**: 
  - Node.js with Express
  - TypeScript
  - Session-based authentication

- **Secondary Backend**:
  - Python with Flask
  - Flask-SQLAlchemy
  - Passlib for password hashing

- **Database**: 
  - PostgreSQL
  - Drizzle ORM (Node.js)
  - SQLAlchemy ORM (Python)

- **Deployment**:
  - Configured for Replit deployment

## Key Components

### Frontend Components

1. **Authentication System**
   - Login/Registration forms
   - Session management
   - Role-based access control

2. **Calendar Interface**
   - Date selection
   - Tag-along request creation/management
   - Visual indicators for filled/open slots

3. **Administrative Panel**
   - User management
   - Reporting features
   - CSV data import/export

4. **Notification System**
   - Visual notifications via toast messages
   - Email notifications for tag-along scheduling
   - Optional SMS notifications via Twilio

### Backend Components

1. **Node.js/Express API Server**
   - API routes for tag-along requests
   - Authentication endpoints
   - Proxy to Python backend

2. **Python/Flask API Server**
   - Secondary API endpoints
   - Alternative implementation of core functionality
   - Direct database access via SQLAlchemy

3. **Authentication Service**
   - Session management
   - Password hashing and verification
   - Account lockout protection

4. **Data Storage**
   - Schema definitions using Drizzle ORM
   - Data validation with Zod
   - Connection pooling

5. **External Integrations**
   - Twilio for SMS notifications (optional)

## Data Models

The application has two primary data models:

1. **User**
   - Personal information (name, email, phone)
   - Authentication data (password, login attempts)
   - Role assignment (new_docent, seasoned_docent, coordinator)

2. **TagRequest**
   - Scheduling information (date, time slot)
   - Relationships to involved users (new docent, seasoned docent)
   - Status tracking (requested, filled, cancelled)

These models are defined both in the Node.js backend using Drizzle ORM and in the Python backend using SQLAlchemy.

## Data Flow

1. **User Authentication Flow**
   - User submits login credentials
   - Server validates credentials and manages sessions
   - Failed login attempts are tracked with account lockout functionality

2. **Tag-Along Request Flow**
   - New docent selects date/time on calendar
   - System creates tag request in "requested" state
   - Seasoned docents can view and accept open requests
   - Email/SMS notifications sent when requests are filled

3. **Admin Management Flow**
   - Coordinators can view all users and tag requests
   - Generate reports on system usage
   - Import/export data via CSV

## Authentication and Authorization

The application implements session-based authentication with role-based access control:

1. **Authentication Mechanism**
   - Password hashing using scrypt (Node.js) or PBKDF2 (Python)
   - Session management with express-session
   - Account lockout protection after failed attempts

2. **Authorization Strategy**
   - Role-based permissions (new_docent, seasoned_docent, coordinator)
   - Protected route middleware
   - API endpoint validation

## External Dependencies

1. **UI Components**
   - Radix UI primitives for accessible components
   - shadcn/ui for styled components
   - TanStack Query for data fetching and caching

2. **Data Management**
   - Drizzle ORM for database interactions
   - Zod for schema validation
   - SQLAlchemy (Python)

3. **Communication**
   - Twilio for SMS notifications (optional)

## Deployment Strategy

The application is configured for deployment on Replit with the following strategy:

1. **Build Process**
   - Vite for frontend bundling
   - ESBuild for server-side code

2. **Runtime Configuration**
   - Environment variables for sensitive configuration
   - Development/production mode detection

3. **Containerization**
   - Configured for Replit's deployment environment
   - Uses Replit's modules and autoscaling capabilities

4. **Database Integration**
   - PostgreSQL connection via environment variables
   - Connection pooling for efficiency

## Development Workflow

1. **Local Development**
   - Concurrent server startup (Node.js + Python)
   - Hot module reloading for frontend
   - Environment configuration via dotenv

2. **Project Structure**
   - `/client`: React frontend application
   - `/server`: Node.js backend server
   - `/python_server`: Python backend server
   - `/shared`: Shared types and schemas

3. **Code Organization**
   - Component-based architecture for frontend
   - Route-based organization for backend APIs
   - Shared schema definitions