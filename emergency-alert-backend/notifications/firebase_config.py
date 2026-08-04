import logging
import firebase_admin
from firebase_admin import credentials
from decouple import config, UndefinedValueError

logger = logging.getLogger(__name__)


def initialize_firebase():
    """Initialize Firebase Admin SDK. Call once at startup."""
    if firebase_admin._apps:
        return
    try:
        cred_path = config('FCM_CREDENTIALS_PATH')
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized.")
    except (UndefinedValueError, FileNotFoundError) as e:
        logger.warning(f"Firebase not initialized: {e}. Push notifications will be unavailable.")
