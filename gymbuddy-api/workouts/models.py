# workouts/models.py
from django.conf import settings
from django.db import models


class Exercise(models.Model):
    """Master list of exercise types (Bench Press, Squat, etc.)."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Program(models.Model):
    """A training program that groups multiple workout sessions (e.g. Push/Pull/Legs, 5/3/1)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="programs",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class WorkoutSession(models.Model):
    """One workout done by a user on a given date."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workout_sessions",
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workout_sessions",
    )
    date = models.DateTimeField(auto_now_add=True)  # when the workout was logged
    name = models.CharField(max_length=100, blank=True)  # “Push day”, etc.
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date"]


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


class UserExerciseNote(models.Model):
    """Note for next time the user does this exercise (one per user per exercise type)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="exercise_notes",
    )
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.CASCADE,
        related_name="user_notes",
    )
    note = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "exercise")
        ordering = ["-updated_at"]
