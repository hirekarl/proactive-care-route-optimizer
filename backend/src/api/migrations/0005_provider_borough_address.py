from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0004_elevator_count_override"),
    ]

    operations = [
        migrations.AddField(
            model_name="dftaprovider",
            name="borough",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="dftaprovider",
            name="address",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
    ]
