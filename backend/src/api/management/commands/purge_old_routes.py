"""Delete routes (and their stops) older than a configurable retention window."""

import datetime

from django.core.management.base import BaseCommand, CommandParser

from api.models import Route

DEFAULT_RETENTION_DAYS = 90


class Command(BaseCommand):
    help = "Delete routes and their stops older than --days (default 90)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--days",
            type=int,
            default=DEFAULT_RETENTION_DAYS,
            help="Retain routes created within this many days (default: 90).",
        )

    def handle(self, *args: object, **options: object) -> None:
        days = int(str(options.get("days") or DEFAULT_RETENTION_DAYS))
        cutoff = datetime.date.today() - datetime.timedelta(days=days)
        qs = Route.objects.filter(date__lt=cutoff)
        count = qs.count()
        if count == 0:
            self.stdout.write(f"No routes older than {days} days — nothing to delete.")
            return
        qs.delete()
        self.stdout.write(
            self.style.SUCCESS(f"Deleted {count} route(s) with date before {cutoff}.")
        )
