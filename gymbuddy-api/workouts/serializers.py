# workouts/serializers.py
from rest_framework import serializers
from .models import WorkoutSession, PerformedExercise, SetEntry, Exercise


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ["id", "name", "description"]


class SetEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = SetEntry
        fields = ["id", "order", "reps", "weight", "notes"]


class PerformedExerciseSerializer(serializers.ModelSerializer):
    sets = SetEntrySerializer(many=True, read_only=True)

    class Meta:
        model = PerformedExercise
        fields = ["id", "exercise", "user_preferred_name", "order", "sets"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["exercise"] = ExerciseSerializer(instance.exercise).data
        return data


class WorkoutSessionSerializer(serializers.ModelSerializer):
    exercises = PerformedExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = WorkoutSession
        fields = ["id", "date", "name", "notes", "exercises"]


class TemplateExerciseSerializer(serializers.ModelSerializer):
    """For GET /workouts/template/ - last workout's exercises with sets for reference."""

    exercise = ExerciseSerializer(read_only=True)
    last_sets = SetEntrySerializer(source="sets", many=True, read_only=True)

    class Meta:
        model = PerformedExercise
        fields = ["exercise", "user_preferred_name", "order", "last_sets"]
