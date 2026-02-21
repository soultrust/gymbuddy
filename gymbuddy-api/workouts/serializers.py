# workouts/serializers.py
from rest_framework import serializers
from .models import Program, Session, PerformedExercise, SetEntry, Exercise, UserExerciseNote


class ProgramSerializer(serializers.ModelSerializer):
    workout_sessions = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Program
        fields = ["id", "name", "description", "created_at", "workout_sessions"]


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
    note_for_next_time = serializers.SerializerMethodField()

    class Meta:
        model = PerformedExercise
        fields = ["id", "exercise", "user_preferred_name", "order", "sets", "note_for_next_time"]

    def get_note_for_next_time(self, instance):
        request = self.context.get("request")
        if not request or not request.user:
            return ""
        note_obj = UserExerciseNote.objects.filter(
            user=request.user, exercise=instance.exercise
        ).first()
        return note_obj.note if note_obj else ""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["exercise"] = ExerciseSerializer(instance.exercise).data
        return data


class SessionSerializer(serializers.ModelSerializer):
    exercises = PerformedExerciseSerializer(many=True, read_only=True)
    date = serializers.DateTimeField(required=False)
    date_display = serializers.SerializerMethodField()
    program = serializers.PrimaryKeyRelatedField(
        allow_null=True, required=False, queryset=Program.objects.none()
    )

    class Meta:
        model = Session
        fields = ["id", "date", "date_display", "name", "notes", "exercises", "program"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user:
            self.fields["program"].queryset = Program.objects.filter(user=request.user)

    def get_date_display(self, obj):
        if not obj or not obj.date:
            return ""
        d = obj.date
        return f"{d.month}/{d.day:02d}"


class TemplateExerciseSerializer(serializers.ModelSerializer):
    """For GET /workouts/template/ - last workout's exercises with sets for reference."""

    exercise = ExerciseSerializer(read_only=True)
    last_sets = SetEntrySerializer(source="sets", many=True, read_only=True)

    class Meta:
        model = PerformedExercise
        fields = ["exercise", "user_preferred_name", "order", "last_sets"]
