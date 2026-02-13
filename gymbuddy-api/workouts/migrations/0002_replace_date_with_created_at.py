# Replace old date (DateField) with created_at renamed to date (DateTimeField)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("workouts", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="workoutsession",
            name="date",
        ),
        migrations.RenameField(
            model_name="workoutsession",
            old_name="created_at",
            new_name="date",
        ),
        migrations.AlterModelOptions(
            name="workoutsession",
            options={"ordering": ["-date"]},
        ),
    ]
