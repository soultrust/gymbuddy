from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("workouts", "0006_performedexercise_is_bodyweight"),
    ]

    operations = [
        migrations.AlterField(
            model_name="setentry",
            name="reps",
            field=models.DecimalField(decimal_places=2, max_digits=5),
        ),
    ]
