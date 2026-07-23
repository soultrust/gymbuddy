from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("workouts", "0007_alter_setentry_reps"),
    ]

    operations = [
        migrations.AddField(
            model_name="performedexercise",
            name="measure_unit",
            field=models.CharField(
                choices=[("sets_reps", "Sets/Reps"), ("stopwatch", "Stopwatch")],
                default="sets_reps",
                max_length=20,
            ),
        ),
    ]
