from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("api", "0007_data_minimization")]

    operations = [
        migrations.AddField(
            model_name="routestop",
            name="borough",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="routestop",
            name="floor",
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name="routestop",
            name="provider_id",
            field=models.TextField(blank=True, db_index=True),
        ),
        migrations.AddField(
            model_name="routestop",
            name="recipient_name",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="routestop",
            name="scheduled_time",
            field=models.TextField(blank=True),
        ),
    ]
