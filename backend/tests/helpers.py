from django.db import connection


def _set_location(complaint_number: str, lon: float, lat: float) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE elevator_complaints SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
            " WHERE complaint_number = %s",
            [lon, lat, complaint_number],
        )
