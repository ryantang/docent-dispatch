# Claude Code Instructions for Docent Dispatch

## Project Overview

**Docent Dispatch** is a comprehensive scheduling system designed for the San Francisco Zoo to streamline volunteer coordination and tag assignment processes. The application facilitates coordination between new and seasoned docents through a calendar-based scheduling interface with role-based access control.

### Quick Start
```bash
# Terminal 1: Start Python backend
cd python_server && python run_python_server.py

# Terminal 2: Start frontend development server  
npm run dev

# Access: Frontend at http://localhost:5173, API at http://localhost:5001
```

## Architecture & Tech Stack

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module reloading
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state
- **UI Components**: shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS with custom configuration
- **Forms**: React Hook Form with Zod validation

### Backend (Python Flask)
- **Framework**: Python Flask with domain-driven design
- **ORM**: SQLAlchemy with PostgreSQL
- **Authentication**: Session-based with Flask-Session
- **Security**: PBKDF2 password hashing, account lockout protection
- **API**: RESTful endpoints with CORS support
- **File Structure**: Domain-based organization (users/, tags/)

### Database & Deployment
- **Database**: PostgreSQL with connection pooling
- **Deployment**: AWS infrastructure (Elastic Beanstalk, RDS, CloudFormation)
- **Infrastructure**: CloudFormation templates in `/infrastructure/`
- **Environment**: AWS Secrets Manager for production credentials

## Project Structure

```
/client/                    # React frontend application
  /src/
    /components/           # Reusable UI components
      /admin/             # Admin-specific components  
      /dialogs/           # Modal dialogs
      /layout/            # Header, footer, navigation
      /ui/                # shadcn/ui component library
    /hooks/               # Custom React hooks
    /lib/                 # Utilities and configurations
    /pages/               # Route components
/python_server/             # Python Flask backend
  /domain/                # Domain-driven design structure
    /tags/                # Tag request business logic
    /users/               # User management business logic
  /tests/                 # Pytest test suite
  app.py                  # Main Flask application
  bootstrap.py            # Admin user creation
  db_config.py           # Database configuration
/shared/                   # Shared TypeScript schemas
  schema.ts              # Zod schemas and types
/infrastructure/           # AWS CloudFormation templates
/scripts/                 # Development utilities
```

## Core Functionality

### User Roles & Permissions
- **new_docent**: Can create tag-along requests, view own requests
- **seasoned_docent**: Can accept requests, view assigned requests
- **coordinator**: Full administrative access, user management, reporting

### Key Features
1. **Authentication System**: Session-based with role-based access control
2. **Calendar Interface**: Date selection for tag-along request scheduling
3. **Request Management**: Create, view, accept, and manage tag requests
4. **Administrative Panel**: User management, CSV import/export, reporting
5. **Notifications**: Email notifications (SES), optional SMS (Twilio)
6. **Security**: Account lockout, password complexity, failed login tracking

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled, use shared types from `/shared/schema.ts`
- **React**: Functional components with hooks, use TanStack Query for API calls
- **Python**: Follow domain-driven design, use type hints, pytest for testing
- **Styling**: Tailwind CSS utility classes, shadcn/ui components
- **API**: RESTful endpoints, consistent error handling

### Environment Setup
1. **Required Environment Variables** (see `.env.example`):
   ```bash
   SECRET_KEY=your_flask_secret_key
   DATABASE_URL=postgresql://user:pass@host/db
   DOMAIN=https://yourdomain.com  # For password reset emails
   ```

2. **Optional Configuration**:
   ```bash
   TWILIO_ACCOUNT_SID=   # SMS notifications
   TWILIO_AUTH_TOKEN=
   TWILIO_PHONE_NUMBER=
   ```

3. **AWS Production Variables** (auto-configured):
   ```bash
   DB_SECRET_ARN=        # RDS credentials from Secrets Manager
   DB_ENDPOINT=          # RDS endpoint
   DB_NAME=              # Database name
   ```

### Development Commands
```bash
# Development (dual terminal setup)
npm run dev                    # Frontend dev server (port 5173)
python python_server/run_python_server.py  # Backend API (port 5001)

# Production
npm run build                  # Build frontend to /dist/public/
./start_server.sh             # Start production server

# Testing & Quality
pytest                        # Run Python tests (from python_server/)
npm run check                 # TypeScript type checking
flake8 python_server          # Python linting

# Database & Admin
python bootstrap_admin.py     # Create initial admin user
```

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout  
- `GET /api/user` - Get current user info
- `POST /api/password-reset-request` - Request password reset
- `POST /api/password-reset` - Reset password with token

### Tag Requests
- `GET /api/tag-requests` - Get tag requests (filtered by role/date)
- `GET /api/my-tag-requests` - Get current user's requests
- `POST /api/tag-requests` - Create new tag request
- `PATCH /api/tag-requests/:id` - Update tag request
- `DELETE /api/tag-requests/:id` - Delete tag request

### User Management (Coordinator Only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/csv` - Bulk create users from CSV

## Database Schema

### Users Table
```sql
id (serial, primary key)
email (text, unique, not null)
first_name (text, not null)
last_name (text, not null)  
password (text, not null)
phone (text, optional)
role (text, default: 'new_docent')
failed_login_attempts (integer, default: 0)
locked_until (timestamp, nullable)
last_login (timestamp, nullable)
```

### Tag Requests Table
```sql
id (serial, primary key)
date (date, not null)
time_slot (text, not null)  # 'AM' or 'PM'
status (text, default: 'requested')  # requested, filled, cancelled
new_docent_id (integer, not null, FK to users)
seasoned_docent_id (integer, nullable, FK to users)
created_at (timestamp, default: now())
updated_at (timestamp, default: now())
```

## Common Tasks & Patterns

### Adding New API Endpoints
1. **Define schema** in `/shared/schema.ts` using Zod
2. **Create route** in appropriate domain module (`/python_server/domain/*/`)
3. **Add service logic** in domain service class
4. **Register route** in domain routes file
5. **Import in main** `routes.py` file

### Adding New UI Components
1. **Check shadcn/ui** first for existing components
2. **Create in `/client/src/components/ui/`** if reusable
3. **Use Tailwind classes** and component variants
4. **Export from index** for easy imports

### Database Changes
1. **Update schema** in `/shared/schema.ts`
2. **Update SQLAlchemy models** in domain model files
3. **Create migration logic** or update bootstrap scripts
4. **Test with fresh database** creation

## Security Considerations

### Authentication & Authorization
- Session-based authentication with secure session configuration
- Role-based access control enforced on both frontend and backend
- Account lockout after 5 failed login attempts (15-minute lockout)
- Password complexity requirements enforced client and server-side

### Data Protection
- Passwords hashed using PBKDF2 with SHA-256
- Session data stored server-side with signed cookies
- CORS properly configured for production domains
- SQL injection prevention through ORM parameter binding

### Environment Security
- Sensitive credentials stored in AWS Secrets Manager (production)
- Environment variables for local development only
- No credentials committed to version control
- Separate configuration for development/production

## Deployment

### AWS Infrastructure
The application uses a multi-tier AWS architecture:

1. **Core Infrastructure** (`core-infra-template.yml`):
   - S3 bucket for deployment artifacts
   - Shared networking and security resources

2. **Database Layer** (`database-template.yml`):
   - RDS PostgreSQL instance with encryption
   - Secrets Manager for database credentials
   - VPC security groups and subnets

3. **Backend Services** (`backend-template.yml`):
   - Elastic Beanstalk environment for Python Flask app
   - Application Load Balancer with SSL termination
   - Auto-scaling and health monitoring

4. **Frontend Delivery** (`frontend-template.yml`):
   - S3 bucket for static assets with CloudFront CDN
   - Custom domain with SSL certificates
   - Optimized content delivery

### Deployment Process
```bash
# Build and deploy (automated via CI/CD)
npm run build                  # Build frontend assets
zip -r app.zip python_server/  # Package backend
# Upload to S3 and deploy via Elastic Beanstalk
```

## Troubleshooting

### Common Issues
1. **Database Connection**: Check `DATABASE_URL` and PostgreSQL service
2. **CORS Errors**: Verify frontend/backend URL configuration
3. **Session Issues**: Clear browser cookies, check `SECRET_KEY`
4. **Bootstrap Admin**: Run `python bootstrap_admin.py` if no admin user exists
5. **Module Imports**: Ensure Python path includes project root

### Development Tips
- Use browser dev tools Network tab for API debugging
- Check Flask console output for backend errors
- Verify environment variables are loaded correctly
- Test with different user roles for permission validation
- Use PostgreSQL logs for database query debugging

## Getting Help

### Documentation References
- **React Query**: https://tanstack.com/query/latest
- **shadcn/ui**: https://ui.shadcn.com/
- **Flask**: https://flask.palletsprojects.com/
- **SQLAlchemy**: https://docs.sqlalchemy.org/
- **Tailwind CSS**: https://tailwindcss.com/docs

### Key Files for Understanding
- `/README.md` - Quick start and basic setup
- `/BOOTSTRAP_ADMIN.md` - Admin user creation guide
- `/shared/schema.ts` - Data models and validation
- `/python_server/app.py` - Main Flask application
- `/client/src/App.tsx` - React app structure
- `/python_server/domain/` - Business logic organization

## Recent Changes & Current State

The application is currently on the `feature/deploy-to-aws` branch with recent commits focusing on:
- CI/CD pipeline improvements for Python testing
- AWS deployment infrastructure setup
- Custom domain and SSL certificate configuration
- Directory structure optimization for deployment

The codebase is production-ready with comprehensive testing, security measures, and scalable AWS infrastructure.