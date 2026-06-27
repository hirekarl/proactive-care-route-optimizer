from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0003_single_elevator"),
    ]

    operations = [
        migrations.AddField(
            model_name="buildingriskscore",
            name="elevator_count_override",
            field=models.IntegerField(null=True),
        ),
    ]
