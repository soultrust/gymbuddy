# workouts/views.py
# pyright: reportUnreachable=false
import os

from django.conf import settings
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.mixins import (
    RetrieveModelMixin,
    UpdateModelMixin,
    DestroyModelMixin,
)
from .models import WorkoutSession, PerformedExercise, SetEntry, Exercise, UserExerciseNote
from .serializers import (
    WorkoutSessionSerializer,
    PerformedExerciseSerializer,
    SetEntrySerializer,
    ExerciseSerializer,
    TemplateExerciseSerializer,
)


def debug_db(request):
    """Temporary: report which DB the running process is using. Remove after testing."""
    db = settings.DATABASES["default"]
    return JsonResponse({
        "engine": db["ENGINE"],
        "has_database_url": bool(os.environ.get("DATABASE_URL")),
    })


class ExerciseViewSet(viewsets.ReadOnlyModelViewSet):
    """Master list of exercise types (read-only)."""

    serializer_class = ExerciseSerializer
    queryset = Exercise.objects.all()
    permission_classes = [AllowAny]


class WorkoutSessionViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSessionSerializer
    queryset = WorkoutSession.objects.all()

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def _copy_session_as_template(self, new_workout, template_workout_id):
        """Copy exercises and sets from template_workout_id (must be user's) into new_workout."""
        template = self.get_queryset().filter(id=template_workout_id).first()
        if not template:
            return
        for pe in template.exercises.all().order_by("order"):
            new_pe = PerformedExercise.objects.create(
                workout=new_workout,
                exercise=pe.exercise,
                user_preferred_name=pe.user_preferred_name or "",
                order=pe.order,
            )
            for s in pe.sets.all().order_by("order"):
                SetEntry.objects.create(
                    performed_exercise=new_pe,
                    order=s.order,
                    reps=s.reps,
                    weight=s.weight,
                    notes=s.notes or "",
                )

    def create(self, request, *args, **kwargs):
        data = dict(request.data)
        template_session_id = data.pop("template_session_id", None)
        if template_session_id is not None:
            try:
                template_session_id = int(template_session_id)
            except (TypeError, ValueError):
                template_session_id = None
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        new_workout = serializer.instance
        if template_session_id is not None:
            self._copy_session_as_template(new_workout, template_session_id)
            # Re-fetch so response includes the copied exercises
            new_workout = self.get_queryset().get(pk=new_workout.pk)
            serializer = self.get_serializer(new_workout)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def perform_create(self, serializer):
        kwargs = {"user": self.request.user}
        if "date" in serializer.validated_data:
            kwargs["date"] = serializer.validated_data["date"]
        serializer.save(**kwargs)

    @action(detail=False, methods=["get"])
    def template(self, request):
        """GET /api/v1/workouts/template/ - last workout's exercises with sets (for next workout)."""
        last = self.get_queryset().order_by("-date").first()
        if not last:
            return Response([])
        exercises = last.exercises.all()
        serializer = TemplateExerciseSerializer(exercises, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def previous_exercises(self, request, pk=None):
        """GET /api/v1/workouts/{id}/previous_exercises/ - prior workout's exercises (for 'last time' ref)."""
        workout = self.get_object()
        previous = (
            self.get_queryset()
            .filter(date__lt=workout.date)
            .order_by("-date")
            .first()
        )
        if not previous:
            return Response([])
        exercises = previous.exercises.all()
        serializer = TemplateExerciseSerializer(exercises, many=True)
        return Response(serializer.data)

    def _add_exercise(self, workout, request):
        data = dict(request.data)
        exercise_name = data.pop("exercise_name", None)
        if exercise_name:
            name = (
                exercise_name[0]
                if isinstance(exercise_name, (list, tuple))
                else exercise_name
            )
            exercise, _ = Exercise.objects.get_or_create(
                name=str(name).strip(),
                defaults={"description": ""},
            )
            data["exercise"] = exercise.id
        serializer = PerformedExerciseSerializer(data=data)
        if serializer.is_valid():
            serializer.save(workout=workout)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _list_exercises(self, workout):
        exercises = workout.exercises.all()
        serializer = PerformedExerciseSerializer(exercises, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"])
    def exercises(self, request, pk=None):
        """GET /api/workouts/{id}/exercises/ - list | POST - add one exercise"""
        workout = self.get_object()
        if request.method == "POST":
            return self._add_exercise(workout, request)
        return self._list_exercises(workout)


class PerformedExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = PerformedExerciseSerializer

    def get_queryset(self):
        return PerformedExercise.objects.filter(workout__user=self.request.user)

    def _add_set(self, exercise, request):
        serializer = SetEntrySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(performed_exercise=exercise)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def sets(self, request, pk=None):
        """POST /api/workout-exercises/{id}/sets/ - add one set to exercise"""
        return self._add_set(self.get_object(), request)

    @action(detail=True, methods=["post"])
    def note_for_next_time(self, request, pk=None):
        """POST /api/v1/performed-exercises/{id}/note_for_next_time/ - save note for next time user does this exercise."""
        performed = self.get_object()
        note = request.data.get("note", "")
        if not isinstance(note, str):
            note = str(note) if note is not None else ""
        obj, _ = UserExerciseNote.objects.update_or_create(
            user=request.user,
            exercise=performed.exercise,
            defaults={"note": note.strip()},
        )
        return Response({"note_for_next_time": obj.note})


class SetEntryViewSet(
    RetrieveModelMixin, UpdateModelMixin, DestroyModelMixin, viewsets.GenericViewSet
):
    serializer_class = SetEntrySerializer
    queryset = SetEntry.objects.all()

    def get_queryset(self):
        return self.queryset.filter(performed_exercise__workout__user=self.request.user)
