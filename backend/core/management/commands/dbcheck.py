from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError
from django.conf import settings
from django.apps import apps

class Command(BaseCommand):
    help = "Check database connection and print basic info"

    def handle(self, *args, **kwargs):
        db_conn = connections['default']
        try:
            db_conn.cursor()
            engine = settings.DATABASES['default']['ENGINE']
            name = settings.DATABASES['default']['NAME']
            self.stdout.write(self.style.SUCCESS("✅ Database connection successful"))
            self.stdout.write(f"Engine: {engine}")
            self.stdout.write(f"Database name: {name}")

            # Try counting a sample model if available
            if apps.is_installed('users'):
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user_count = User.objects.count()
                self.stdout.write(f"Total users: {user_count}")
            if apps.is_installed('cv'):
                from cv.models import CV
                cv_count = CV.objects.count()
                self.stdout.write(f"Total CVs: {cv_count}")
        except OperationalError as e:
            self.stdout.write(self.style.ERROR(f"❌ Database connection failed: {e}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ Other issue detected: {e}"))
