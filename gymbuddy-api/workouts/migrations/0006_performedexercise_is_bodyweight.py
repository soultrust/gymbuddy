# Generated migration for is_bodyweight on PerformedExercise

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workouts", "0005_workout_to_session_rename"),
    ]

    operations = [
        migrations.AddField(
            model_name="performedexercise",
            name="is_bodyweight",
            field=models.BooleanField(default=False),
        ),
    ]
