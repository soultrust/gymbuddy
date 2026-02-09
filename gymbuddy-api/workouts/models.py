# workouts/models.py
from django.conf import settings
from django.db import models


class Exercise(models.Model):
    """Master list of exercise types (Bench Press, Squat, etc.)."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class WorkoutSession(models.Model):
    """One workout done by a user on a given date."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workout_sessions",
    )
    date = models.DateField()
    name = models.CharField(max_length=100, blank=True)  # “Push day”, etc.
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]


class PerformedExercise(models.Model):
    """An exercise performed in a specific workout session."""

    workout = models.ForeignKey(
        WorkoutSession,
        on_delete=models.CASCADE,
        related_name="exercises",
    )
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.PROTECT,
        related_name="performed_instances",
    )
    user_preferred_name = models.CharField(max_length=100, blank=True)
    order = models.PositiveSmallIntegerField()  # position in the workout: 1,2,3,...

    class Meta:
        ordering = ["order"]
        unique_together = ("workout", "order")


class SetEntry(models.Model):
    """One set of an exercise in a workout, with reps & weight."""

    performed_exercise = models.ForeignKey(
        PerformedExercise,
        on_delete=models.CASCADE,
        related_name="sets",
    )
    order = models.PositiveSmallIntegerField()
    reps = models.PositiveSmallIntegerField()
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("performed_exercise", "order")
