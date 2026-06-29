from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0002_risk_scoring"),
    ]

    operations = [
        migrations.AddField(
            model_name="buildingriskscore",
            name="is_single_elevator",
            field=models.BooleanField(null=True),
        ),
    ]
