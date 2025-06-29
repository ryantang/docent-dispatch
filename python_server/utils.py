from datetime import datetime
import boto3
from botocore.exceptions import ClientError, NoCredentialsError, PartialCredentialsError, ProfileNotFound
import os
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()

AWS_PROFILE = os.getenv('AWS_PROFILE', 'default')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_aws_credentials():
    """Debug AWS credential configuration"""
    logger.info("=== AWS Credentials Debug Info ===")
    
    # Check environment variables
    logger.info(f"AWS_PROFILE env var: {os.getenv('AWS_PROFILE', 'Not set')}")
    logger.info(f"AWS_ACCESS_KEY_ID env var: {'Set' if os.getenv('AWS_ACCESS_KEY_ID') else 'Not set'}")
    logger.info(f"AWS_SECRET_ACCESS_KEY env var: {'Set' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'Not set'}")
    logger.info(f"AWS_DEFAULT_REGION env var: {os.getenv('AWS_DEFAULT_REGION', 'Not set')}")
    logger.info(f"SOURCE_EMAIL env var: {os.getenv('SOURCE_EMAIL', 'Not set')}")
    
    # Check boto3 session
    try:
        session = boto3.Session(profile_name=AWS_PROFILE if AWS_PROFILE != 'default' else None)
        credentials = session.get_credentials()
        if credentials:
            logger.info(f"Boto3 credentials found - Access Key: {credentials.access_key[:8]}...")
            logger.info(f"Session region: {session.region_name}")
        else:
            logger.error("No boto3 credentials found")
    except ProfileNotFound as e:
        logger.error(f"AWS Profile not found: {e}")
    except Exception as e:
        logger.error(f"Error checking boto3 session: {e}")


def send_password_reset_email(user, reset_link):
    logger.info(f"Sending password reset email to {user.email}")
    
    # Debug credentials before attempting to send
    debug_aws_credentials()

    email_content = format_password_reset_email(user, reset_link)
    subject = email_content["subject"]
    text_body = email_content["text_body"]
    html_body = email_content["html_body"]

    recipients = [user.email]
    
    try:
        # Create an SES client with explicit session handling
        logger.info("Creating SES client...")
        
        # Use profile if specified and not default
        session_kwargs = {}
        if AWS_PROFILE and AWS_PROFILE != 'default':
            session_kwargs['profile_name'] = AWS_PROFILE
            
        session = boto3.Session(**session_kwargs)
        ses_client = session.client('ses', region_name='us-west-2')
        
        # Test credentials by getting send quota (lightweight operation)
        logger.info("Testing SES credentials...")
        send_quota = ses_client.get_send_quota()
        logger.info(f"SES send quota check successful: {send_quota['Max24HourSend']} emails/24h")
        
    except NoCredentialsError as e:
        error_msg = f"AWS credentials not found: {str(e)}"
        logger.error(error_msg)
        logger.error("Ensure AWS credentials are configured via environment variables, AWS profile, or IAM role")
        return {"success": False, "error": error_msg, "error_type": "NoCredentialsError"}
        
    except PartialCredentialsError as e:
        error_msg = f"Incomplete AWS credentials: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "error_type": "PartialCredentialsError"}
        
    except ProfileNotFound as e:
        error_msg = f"AWS profile '{AWS_PROFILE}' not found: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "error_type": "ProfileNotFound"}
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(f"AWS Client Error during setup - Code: {error_code}, Message: {error_msg}")
        return {"success": False, "error": f"{error_code}: {error_msg}", "error_type": "ClientError"}
        
    except Exception as e:
        error_msg = f"Unexpected error during SES client setup: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {"success": False, "error": error_msg, "error_type": "UnexpectedError"}
    
    # Prepare email message
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
        logger.info(f"Sending email to {recipients}")
        source_email = os.getenv('SOURCE_EMAIL')
        if not source_email:
            raise ValueError("SOURCE_EMAIL environment variable not set")
            
        response = ses_client.send_email(
            Source=source_email,
            Destination={
                'ToAddresses': recipients
            },
            Message=email_message
        )
        logger.info(f"Email sent successfully - Message ID: {response['MessageId']}")
        return {"success": True, "message_id": response['MessageId']}
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(f"SES Client Error - Code: {error_code}, Message: {error_msg}")
        logger.error(f"Full error response: {e.response}")
        return {"success": False, "error": f"{error_code}: {error_msg}", "error_type": "SESClientError"}
        
    except Exception as e:
        error_msg = f"Unexpected error sending email: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {"success": False, "error": error_msg, "error_type": "UnexpectedError"}

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
    logger.info(f"Sending email confirmation for tag {tag.id}")
    
    # Debug credentials before attempting to send
    debug_aws_credentials()
    
    email_content = format_tag_scheduling_email(tag)
    subject = email_content["subject"]
    text_body = email_content["text_body"]
    html_body = email_content["html_body"]

    recipients = [
        tag.seasoned_docent.email,
        tag.new_docent.email,
        #TODO: Add coordinator to email
    ]
    
    try:
        # Create an SES client with explicit session handling
        logger.info("Creating SES client...")
        
        # Use profile if specified and not default
        session_kwargs = {}
        if AWS_PROFILE and AWS_PROFILE != 'default':
            session_kwargs['profile_name'] = AWS_PROFILE
            
        session = boto3.Session(**session_kwargs)
        ses_client = session.client('ses', region_name='us-west-2')
        
        # Test credentials by getting send quota (lightweight operation)
        logger.info("Testing SES credentials...")
        send_quota = ses_client.get_send_quota()
        logger.info(f"SES send quota check successful: {send_quota['Max24HourSend']} emails/24h")
        
    except NoCredentialsError as e:
        error_msg = f"AWS credentials not found: {str(e)}"
        logger.error(error_msg)
        logger.error("Ensure AWS credentials are configured via environment variables, AWS profile, or IAM role")
        return {"success": False, "error": error_msg, "error_type": "NoCredentialsError"}
        
    except PartialCredentialsError as e:
        error_msg = f"Incomplete AWS credentials: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "error_type": "PartialCredentialsError"}
        
    except ProfileNotFound as e:
        error_msg = f"AWS profile '{AWS_PROFILE}' not found: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg, "error_type": "ProfileNotFound"}
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(f"AWS Client Error during setup - Code: {error_code}, Message: {error_msg}")
        return {"success": False, "error": f"{error_code}: {error_msg}", "error_type": "ClientError"}
        
    except Exception as e:
        error_msg = f"Unexpected error during SES client setup: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {"success": False, "error": error_msg, "error_type": "UnexpectedError"}
    
    # Prepare email message
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
        logger.info(f"Sending email to {recipients}")
        source_email = os.getenv('SOURCE_EMAIL')
        if not source_email:
            raise ValueError("SOURCE_EMAIL environment variable not set")
            
        response = ses_client.send_email(
            Source=source_email,
            Destination={
                'ToAddresses': recipients
            },
            Message=email_message
        )
        logger.info(f"Email sent successfully - Message ID: {response['MessageId']}")
        return {"success": True, "message_id": response['MessageId']}
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = e.response['Error']['Message']
        logger.error(f"SES Client Error - Code: {error_code}, Message: {error_msg}")
        logger.error(f"Full error response: {e.response}")
        return {"success": False, "error": f"{error_code}: {error_msg}", "error_type": "SESClientError"}
        
    except Exception as e:
        error_msg = f"Unexpected error sending email: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {"success": False, "error": error_msg, "error_type": "UnexpectedError"}

