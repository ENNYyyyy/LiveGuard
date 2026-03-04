from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('agencies', '0002_securityagency_latitude_securityagency_longitude'),
    ]

    operations = [
        migrations.AddField(
            model_name='securityagency',
            name='web_push_subscription',
            field=models.TextField(blank=True, null=True),
        ),
    ]
