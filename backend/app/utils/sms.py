import os
import httpx
import logging

logger = logging.getLogger(__name__)

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")


def send_sms(phone: str, message: str) -> bool:
    if not FAST2SMS_API_KEY:
        logger.info(f"[SMS MOCK] To: {phone} | Message: {message}")
        return True

    try:
        response = httpx.post(
            "https://www.fast2sms.com/dev/bulkV2",
            headers={"authorization": FAST2SMS_API_KEY},
            json={
                "route": "q",
                "message": message,
                "language": "english",
                "numbers": phone,
            },
            timeout=10,
        )
        data = response.json()
        if data.get("return"):
            logger.info(f"SMS sent to {phone}")
            return True
        logger.warning(f"SMS failed for {phone}: {data}")
        return False
    except Exception as e:
        logger.error(f"SMS error for {phone}: {e}")
        return False


BOOKING_CONFIRMED = "Dear {name}, your appointment with Dr. {doctor} is confirmed on {date} at {time}. Token: {token}. - Clinic"
REMINDER_24H = "Reminder: Your appointment with Dr. {doctor} is tomorrow at {time}. Token: {token}. - Clinic"
REMINDER_1H = "Your appointment with Dr. {doctor} is in 1 hour at {time}. Please arrive 10 mins early. - Clinic"
CANCELLATION = "Dear {name}, your appointment on {date} at {time} with Dr. {doctor} has been cancelled. - Clinic"
