# workouts/views.py
# pyright: reportUnreachable=false
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.mixins import (
    RetrieveModelMixin,
    UpdateModelMixin,
    DestroyModelMixin,
)
from .models import WorkoutSession, PerformedExercise, SetEntry, Exercise
from .serializers import (
    WorkoutSessionSerializer,
    PerformedExerciseSerializer,
    SetEntrySerializer,
    ExerciseSerializer,
    TemplateExerciseSerializer,
)


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

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def template(self, request):
        """GET /api/v1/workouts/template/ - last workout's exercises with sets (for next workout)."""
        last = self.get_queryset().order_by("-date", "-created_at").first()
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
            .order_by("-date", "-created_at")
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


class SetEntryViewSet(
    RetrieveModelMixin, UpdateModelMixin, DestroyModelMixin, viewsets.GenericViewSet
):
    serializer_class = SetEntrySerializer
    queryset = SetEntry.objects.all()

    def get_queryset(self):
        return self.queryset.filter(performed_exercise__workout__user=self.request.user)
