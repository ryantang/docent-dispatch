from datetime import datetime
import boto3
from botocore.exceptions import ClientError
import os

AWS_PROFILE = os.getenv('AWS_PROFILE', 'default')


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
    
    body = f"""
Hello {new_docent_name} and {seasoned_docent_name},

A tag-along has been scheduled for:

Date: {tag_date}
Time: {tag_time_slot}

{new_docent_name}: {new_docent_phone}
{seasoned_docent_name}: {seasoned_docent_phone}

Please arrange a specific time and place to meet at the Zoo for your tag.  Your phone numbers are listed above.  
Please make sure to contact your tagging partner if you have any late breaking schedule changes or if there is rain in the forecast. If your tag date changes, please also contact me right away.

The active docent (seasoned) will be filling out a Tag Assesement Google Form after your tag. Please give feedback verbally as well, so that the new docent can benefit from the advice before their next tag.
Tell them as specifically as possible what they did well and what you think will help them improve going forward. We find that specific feedback and advice is most beneficial.  

Thank you for your participation in the docent program!

Best regards,
SF Zoo Docent Program Coordinator
"""

    return {
        "subject": subject,
        "body": body
    }

def send_email_confirmation(tag):
    print(f"inside send_email_confirmation for tag {tag.id}")
    """
    Send an email to three recipients using AWS SES.
    
    Args:
        params (dict): Dictionary containing the recipient objects and other parameters
                       needed for the email formatting.
    
    Returns:
        dict: Response from the SES send_email API call, or error information.
    """
    # Get the formatted email content

    email_content = format_tag_scheduling_email(tag)
    subject = email_content["subject"]
    body = email_content["body"]

    
    # Get recipient email addresses
    recipients = [
        tag.seasoned_docent.email,
        tag.new_docent.email,
        #TODO: Add coordinator to email
    ]
    
    # Create an SES client
    print(f"creating ses client")
    ses_client = boto3.client('ses', region_name='us-west-2')  # Replace with your preferred AWS region
    
    # Configure the email
    email_message = {
        'Subject': {
            'Data': subject
        },
        'Body': {
            'Html': {
                'Data': body
            }
        }
    }
    
    try:
        # Send the email
        print(f"sending email")
        response = ses_client.send_email(
            Source= os.getenv('SOURCE_EMAIL'),  # Replace with your verified sender email
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

