# invitation_email.py
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_invitation_email(to_email, invitation_token, app_url=None):
    """
    Sends an invitation email to the specified recipient.
    
    Args:
        to_email: Recipient email address
        invitation_token: The unique token for this invitation
        app_url: Base URL of the application (uses environment variable if not specified)
    """
    # Get email configuration from environment variables
    smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_username = os.environ.get('SMTP_USERNAME', 'your-email@gmail.com')
    smtp_password = os.environ.get('SMTP_PASSWORD', 'your-app-password')
    from_email = smtp_username
    
    # Use provided app_url or get from environment
    base_url = app_url or os.environ.get('APP_URL', 'http://localhost:3000')
    registration_url = f"{base_url}/register/{invitation_token}"
    
    # Create message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = "You've Been Invited to Band Rehearsal Scheduler!"
    msg['From'] = from_email
    msg['To'] = to_email
    
    # Create both plain text and HTML versions
    text = f"""
Hello!

You've been invited to join the Band Rehearsal Scheduler. This application helps band members coordinate rehearsal schedules.

To accept this invitation, please visit the following link:
{registration_url}

This invitation link will expire in 7 days.

If you have any questions, please contact the administrator.

Thank you!
"""
    
    html = f"""
<html>
  <head></head>
  <body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #2196f3;">You've Been Invited!</h2>
      <p>You've been invited to join the <strong>Band Rehearsal Scheduler</strong>. This application helps band members coordinate rehearsal schedules.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="{registration_url}" style="background-color: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Accept Invitation
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
      
      <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px; word-break: break-all;">
        {registration_url}
      </p>
      
      <p>If you have any questions, please contact the administrator.</p>
      
      <p>Thank you!</p>
    </div>
  </body>
</html>
"""
    
    # Attach parts
    part1 = MIMEText(text, 'plain')
    part2 = MIMEText(html, 'html')
    msg.attach(part1)
    msg.attach(part2)
    
    try:
        # Connect to SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        
        # Send email
        server.send_message(msg)
        server.quit()
        
        print(f"Invitation email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send invitation email: {str(e)}")
        return False
    
