# email_service.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import os
from flask import current_app
from sqlalchemy import desc
from models import db, User, Rehearsal, Response

def send_rehearsal_summary():
    """
    Creates and sends an HTML email with a summary of upcoming rehearsals.
    This function mimics the functionality of the Google Sheets script.
    """
    # Get the application context
    with current_app.app_context():
        # Get upcoming rehearsals (next 5 weeks)
        today = datetime.now().date()
        five_weeks_ahead = today + timedelta(weeks=5)
        upcoming_rehearsals = Rehearsal.query.filter(
            db.func.date(Rehearsal.date) >= today,
            db.func.date(Rehearsal.date) <= five_weeks_ahead
        ).order_by(Rehearsal.date).all()
        
        # If no upcoming rehearsals, don't send email
        if not upcoming_rehearsals:
            return
        
        # Create the HTML email content
        html_content = event_header()
        
        for rehearsal in upcoming_rehearsals:
            # Get all responses for this rehearsal
            responses = Response.query.filter_by(rehearsal_id=rehearsal.id).all()
            declined_responses = []
            
            for response in responses:
                if not response.attending:  # Equivalent to "Nej"
                    declined_responses.append([
                        response.user.first_name or response.user.username,
                        response.comment or ""
                    ])
            
            # Format the date for display
            formatted_date = rehearsal.date.strftime("%d %b")
            
            # Add row to the HTML table
            if declined_responses:
                html_content += event_decline(formatted_date, declined_responses)
            else:
                html_content += event_no_decline(formatted_date)
        
        html_content += event_footer()
        
        # Get all active user emails
        user_emails = [user.email for user in User.query.all() if user.email]
        
        # Send the email
        send_email(
            to_emails=user_emails,
            subject="Rehearsal Schedule for Next Five Weeks",
            html_content=html_content
        )

def event_no_decline(event_date):
    """Creates the HTML table row for a date with no declined responses."""
    return f'<tr><td style="vertical-align: top; background-color: rgb(0, 153, 0);">{event_date}<br></td><td style="vertical-align: top;"><br></td></tr>'

def event_decline(event_date, decline_array):
    """Creates the HTML table row for a date with at least one declined response."""
    html_string = ""
    declines = ""
    
    # Builds a string of participants who declined and their comments
    for decline in decline_array:
        if not decline[1]:
            declines += f"{decline[0]}<BR>"  # Add participant name if no comment
        else:
            declines += f"{decline[0]} - {decline[1]}<BR>"  # Add participant name and comment
    
    html_string += f'<tr><td style="vertical-align: top; background-color: red;">{event_date}</td><td style="vertical-align: top;">{declines}</td></tr>'
    
    return html_string

def event_header():
    """Creates the HTML email header and table start."""
    app_url = os.environ.get('APP_URL', 'http://localhost:3000')
    
    return f"""<html>
    <head>
        <meta content="text/html; charset=UTF-8" http-equiv="content-type">
        <title>Rehearsal Schedule</title>
    </head>
    <body>
        Hej!<br><br>
        Se rep-status för kommande veckor. Är något fel, uppdatera gärna på 
        <a href="{app_url}" target="_blank">denna länk</a> för att justera.
        <br><br><br>
        <table style="text-align: left; width: 274px; height: 148px;" border="1" cellpadding="0" cellspacing="2">
            <tbody>
                <tr>
                    <td style="vertical-align: top; background-color: rgb(51, 51, 51); color: white;">Datum<br></td>
                    <td style="vertical-align: top; background-color: rgb(51, 51, 51); color: white;">Frånvarande<br></td>
                </tr>
    """

def event_footer():
    """Creates the HTML email footer and table end."""
    return """
            </tbody>
        </table>
        <br>
    </body>
</html>
    """

def send_email(to_emails, subject, html_content, from_email=None):
    """
    Sends an HTML email to the specified recipients.
    
    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        html_content: HTML content of the email
        from_email: Sender email address (uses environment variable if not specified)
    """
    # Get email configuration from environment variables
    smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_username = os.environ.get('SMTP_USERNAME', 'your-email@gmail.com')
    smtp_password = os.environ.get('SMTP_PASSWORD', 'your-app-password')
    from_email = from_email or smtp_username
    
    # Convert to_emails to a comma-separated string if it's a list
    if isinstance(to_emails, list):
        to_emails = ','.join(to_emails)
    
    # Create message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_emails
    
    # Attach HTML content
    msg.attach(MIMEText(html_content, 'html'))
    
    try:
        # Connect to SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        
        # Send email
        server.send_message(msg)
        server.quit()
        
        print(f"Email sent successfully to {to_emails}")
        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False