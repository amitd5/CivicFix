
import os
import random
import asyncio
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()


def generate_otp():
    return str(random.randint(100000, 999999))


def otp_expiry():
    return datetime.now(timezone.utc) + timedelta(minutes=10)


def _send_email(message: EmailMessage):
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")

    if not username or not password:
        raise RuntimeError("SMTP credentials are missing")

    with smtplib.SMTP(host, port, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(username, password)
        server.send_message(message)


async def send_otp_email(
    recipient_email: str,
    otp: str,
):
    message = EmailMessage()

    message["From"] = os.getenv("SMTP_USERNAME")
    message["To"] = recipient_email
    message["Subject"] = "CivicFix Email Verification OTP"

    message.set_content(
        f"""
Hello,

Welcome to CivicFix!

Your email verification OTP is:

{otp}

This OTP is valid for 10 minutes.

If you did not create a CivicFix account, you can safely ignore this email.

Regards,
CivicFix Team
"""
    )

    await asyncio.to_thread(_send_email, message)


async def send_password_reset_email(
    recipient_email: str,
    reset_link: str,
):
    message = EmailMessage()

    message["From"] = os.getenv("SMTP_USERNAME")
    message["To"] = recipient_email
    message["Subject"] = "CivicFix Password Recovery"

    message.set_content(
        f"""
Hello,

We received a request to reset your CivicFix password.

Click the link below to create a new password:

{reset_link}

This password recovery link is valid for 15 minutes.

If you did not request a password reset, you can safely ignore this email.

Regards,
CivicFix Team
"""
    )

    await asyncio.to_thread(_send_email, message)
