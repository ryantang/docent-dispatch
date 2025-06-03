# Admin User Bootstrap Guide

This guide explains how to create the initial coordinator user for the SF Zoo Docent System.

## Overview

Since self-registration has been disabled, you need to bootstrap the first coordinator user who can then create other users through the admin panel. The system provides a secure bootstrap mechanism that:

1. Creates a coordinator user with a random password
2. Requires the admin to use password reset to set their password
3. Only runs if no coordinator users exist
4. Uses environment variables for configuration

## Security Approach

**Why not store passwords in .env files?**
- Environment variables are visible to anyone with server access
- Storing passwords in config files is a security risk
- The bootstrap creates users with random passwords that must be reset

## Setup Instructions

### 1. Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Required
ADMIN_EMAIL=admin@yourorganization.com

# Optional (with defaults)
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
ADMIN_PHONE=+1234567890

# Required for password reset emails
DOMAIN=https://yourdomain.com
```

### 2. Bootstrap Methods

You have three options to bootstrap the admin user:

#### Option A: Automatic on Server Start
The bootstrap runs automatically when you start the server:

```bash
python python_server/app.py
```

#### Option B: Manual Bootstrap Script
Run the standalone bootstrap script:

```bash
python bootstrap_admin.py
```

#### Option C: Python Command
Run directly from Python:

```bash
python -c "from python_server.bootstrap import bootstrap_admin_user; bootstrap_admin_user()"
```

### 3. Set Admin Password

After bootstrap:

1. Go to your login page: `https://yourdomain.com/auth`
2. Click "Forgot password?"
3. Enter the admin email address
4. Check email for password reset instructions
5. Set your new password
6. Login as the coordinator

### 4. Create Additional Users

Once logged in as coordinator:

1. Go to the Admin panel
2. Use "User Management" to create new users
3. Users will receive password reset emails to set their passwords

## Bootstrap Output

Successful bootstrap will show:
```
   Bootstrap successful!
   Created coordinator user: admin@yourorganization.com
   Name: Admin User
   Phone: +1234567890
  
   The user has been created with a random password.
   To set a password, use the 'Forgot password?' link on the login page.
   Enter the email: admin@yourorganization.com

   Login page: https://yourdomain.com/auth
```

## Troubleshooting

### "ADMIN_EMAIL not set"
Add `ADMIN_EMAIL=your-email@domain.com` to your `.env` file.

### "Coordinator user already exists"
A coordinator user already exists. Use the existing admin account or contact your system administrator.

### "Email already registered"
The email is already in use by another user. Choose a different email or use the existing account.

### Email not received
- Check spam folder
- Verify `DOMAIN` environment variable is set correctly
- Check email service configuration (SES setup)

## Alternative Bootstrap Methods

If you need more control or have specific requirements:

### Database Direct Insert
```sql
-- Only use this if the bootstrap script doesn't work
INSERT INTO users (email, password, first_name, last_name, role) 
VALUES ('admin@domain.com', 'random_hash', 'Admin', 'User', 'coordinator');
```

### Custom Bootstrap Script
Create your own bootstrap script based on `python_server/bootstrap.py` for custom requirements.

## Security Notes

- The bootstrap only creates the user if no coordinators exist
- Random passwords are generated using cryptographically secure methods
- Password reset tokens expire after 1 hour
- Failed login attempts are tracked and accounts can be locked
- All passwords are hashed using PBKDF2 with SHA-256

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_EMAIL` | Yes | - | Email address for the admin user |
| `ADMIN_FIRST_NAME` | No | "Admin" | First name of the admin user |
| `ADMIN_LAST_NAME` | No | "User" | Last name of the admin user |
| `ADMIN_PHONE` | No | - | Phone number (optional) |
| `DOMAIN` | Yes* | - | Domain for password reset links |

*Required for password reset emails to work properly 