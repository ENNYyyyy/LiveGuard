from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    name = 'notifications'

    def ready(self):
        from .firebase_config import initialize_firebase
        initialize_firebase()
