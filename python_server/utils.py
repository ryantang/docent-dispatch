from datetime import datetime
from twilio.rest import Client
import os

def format_tag_request_email(params):
    """Format email for tag request notification"""
    new_docent_name = f"{params['new_docent'].first_name} {params['new_docent'].last_name}"
    new_docent_email = params['new_docent'].email
    seasoned_docent_name = f"{params['seasoned_docent'].first_name} {params['seasoned_docent'].last_name}"
    seasoned_docent_email = params['seasoned_docent'].email
    tag_date = params['tag_date'].strftime('%A, %B %d, %Y')
    tag_time_slot = params['tag_time_slot']
    
    subject = f"SF Zoo Tag-Along Scheduled: {tag_date} ({tag_time_slot})"
    
    body = f"""
Hello {new_docent_name} and {seasoned_docent_name},

A tag-along has been scheduled for:

Date: {tag_date}
Time: {tag_time_slot}

New Docent: {new_docent_name} ({new_docent_email})
Seasoned Docent: {seasoned_docent_name} ({seasoned_docent_email})

Please communicate directly to agree on a specific meeting time and location within the Zoo.

If you need to cancel or reschedule, please do so at least 24 hours in advance through the SF Zoo Docent Matching app.

Thank you for your participation in the docent program!

Best regards,
SF Zoo Docent Program Coordinator
"""
    
    return {
        "subject": subject,
        "body": body
    }

def send_sms_notification(to_phone, message):
    """Send SMS notification using Twilio"""
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    from_phone = os.environ.get('TWILIO_PHONE_NUMBER')
    
    # Only send if Twilio credentials are configured
    if account_sid and auth_token and from_phone and to_phone:
        try:
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body=message,
                from_=from_phone,
                to=to_phone
            )
            return True
        except Exception as e:
            print(f"Failed to send SMS: {str(e)}")
            return False
    
    # Log the message for development
    print(f"SMS Notification to {to_phone}: {message}")
    return False