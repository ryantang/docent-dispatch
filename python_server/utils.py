from datetime import datetime
import boto3
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

AWS_PROFILE = os.getenv('AWS_PROFILE', 'default')


def send_password_reset_email(user, reset_link):
    print(f"sending password reset email to {user.email} with reset link {reset_link}")

    email_content = format_password_reset_email(user, reset_link)
    subject = email_content["subject"]
    text_body = email_content["text_body"]
    html_body = email_content["html_body"]

    recipients = [user.email]
    
    # Create an SES client
    print(f"creating ses client")
    ses_client = boto3.client('ses', region_name='us-west-2')
    
    email_message = {
        'Subject': {
            'Data': subject,
            'Charset': 'UTF-8'
        },
        'Body': {
            'Text': {
                'Data': text_body,
                'Charset': 'UTF-8'
            },
            'Html': {
                'Data': html_body,
                'Charset': 'UTF-8'
            }
        }
    }

    try:
        # Send the email
        print(f"sending email")
        response = ses_client.send_email(
            Source=os.getenv('SOURCE_EMAIL'),
            Destination={
                'ToAddresses': recipients
            },
            Message=email_message
        )
        print(f"email sent")
        return {"success": True, "message_id": response['MessageId']}
    except ClientError as e:
        print(f"error sending email: {e}")
        return {"success": False, "error": str(e)}

def format_password_reset_email(user, reset_link):
    subject = "SF Zoo Docent Tagging - Password Reset Request"
    text_body = f"""
Hello {user.first_name} {user.last_name},

You are receiving this email because you requested a password reset for your account.

Please click the link below to reset your password:

{reset_link}

If you did not request a password reset, please ignore this email.

Best regards,
SF Zoo Docent Tagging Coordinator
"""
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <p>Hello {user.first_name} {user.last_name},</p>

    <p>You are receiving this email because you requested a password reset for your account.</p>    

    <p>Please click the link below to reset your password:</p>

    <p><a href="{reset_link}">Reset Password</a></p>

    <p>If you did not request a password reset, please ignore this email.</p>   

    <p>Best regards,<br>
    SF Zoo Docent Tagging Coordinator</p>
</body>
</html>
"""

    return {
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body
    }
def format_tag_scheduling_email(tag):
    """Format email for tag request notification"""
    new_docent_name = f"{tag.new_docent.first_name} {tag.new_docent.last_name}"
    new_docent_email = tag.new_docent.email
    new_docent_phone = tag.new_docent.phone
    seasoned_docent_name = f"{tag.seasoned_docent.first_name} {tag.seasoned_docent.last_name}"
    seasoned_docent_email = tag.seasoned_docent.email
    seasoned_docent_phone = tag.seasoned_docent.phone
    tag_date = tag.date.strftime('%A, %B %d, %Y')
    tag_time_slot = tag.time_slot

    subject = f"SF Zoo Tag-Along Scheduled: {tag_date} ({tag_time_slot})"
    
    form_url = os.getenv('FORM_URL')

    # Plain text version
    text_body = f"""
Hello {new_docent_name} and {seasoned_docent_name},

A tag-along has been scheduled for:

Date: {tag_date}
Time: {tag_time_slot}

{new_docent_name}: {new_docent_phone}
{seasoned_docent_name}: {seasoned_docent_phone}

Please arrange a specific time and place to meet at the Zoo for your tag. Your phone numbers are listed above.
Please make sure to contact your tagging partner if you have any late breaking schedule changes or if there is rain in the forecast. If your tag date changes, please also contact me right away.

The active docent (seasoned) will be filling out a Tag Assessment Google Form ({form_url}) after your tag. Please give feedback verbally as well, so that the new docent can benefit from the advice before their next tag.
Tell them as specifically as possible what they did well and what you think will help them improve going forward. We find that specific feedback and advice is most beneficial.

Thank you for your participation in the docent program!

Best regards,
SF Zoo Docent Program Coordinator
"""

    # HTML version
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <p>Hello {new_docent_name} and {seasoned_docent_name},</p>

    <p>A tag-along has been scheduled for:</p>

    <p><strong>Date:</strong> {tag_date}<br>
    <strong>Time:</strong> {tag_time_slot}</p>

    <p><strong>{new_docent_name}:</strong> {new_docent_phone}<br>
    <strong>{seasoned_docent_name}:</strong> {seasoned_docent_phone}</p>

    <p>Please arrange a specific time and place to meet at the Zoo for your tag. Your phone numbers are listed above.</p>

    <p>Please make sure to contact your tagging partner if you have any late breaking schedule changes or if there is rain in the forecast. If your tag date changes, please also contact me right away.</p>

    <p>The active docent (seasoned) will be filling out a <a href="{form_url}">Tag Assessment Google Form</a> after your tag. Please give feedback verbally as well, so that the new docent can benefit from the advice before their next tag.<br>
    Tell them as specifically as possible what they did well and what you think will help them improve going forward. We find that specific feedback and advice is most beneficial.</p>

    <p>Thank you for your participation in the docent program!</p>

    <p>Best regards,<br>
    SF Zoo Docent Program Coordinator</p>
</body>
</html>
"""

    return {
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body
    }

def send_email_confirmation(tag):
    print(f"inside send_email_confirmation for tag {tag.id}")
    
    email_content = format_tag_scheduling_email(tag)
    subject = email_content["subject"]
    text_body = email_content["text_body"]
    html_body = email_content["html_body"]

    recipients = [
        tag.seasoned_docent.email,
        tag.new_docent.email,
        #TODO: Add coordinator to email
    ]
    
    # Create an SES client
    print(f"creating ses client")
    ses_client = boto3.client('ses', region_name='us-west-2')
    
    email_message = {
        'Subject': {
            'Data': subject,
            'Charset': 'UTF-8'
        },
        'Body': {
            'Text': {
                'Data': text_body,
                'Charset': 'UTF-8'
            },
            'Html': {
                'Data': html_body,
                'Charset': 'UTF-8'
            }
        }
    }
    
    try:
        # Send the email
        print(f"sending email")
        response = ses_client.send_email(
            Source=os.getenv('SOURCE_EMAIL'),
            Destination={
                'ToAddresses': recipients
            },
            Message=email_message
        )
        print(f"email sent")
        return {"success": True, "message_id": response['MessageId']}
    except ClientError as e:
        print(f"error sending email: {e}")
        return {"success": False, "error": str(e)}

