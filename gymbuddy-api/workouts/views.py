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
from .models import Program, Session, PerformedExercise, SetEntry, Exercise, UserExerciseNote
from .serializers import (
    ProgramSerializer,
    SessionSerializer,
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


class ProgramViewSet(viewsets.ModelViewSet):
    """CRUD for training programs (each can have many workout sessions)."""

    serializer_class = ProgramSerializer
    queryset = Program.objects.all()

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user).prefetch_related(
            "workout_sessions"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WorkoutSessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    queryset = Session.objects.all()

    def get_queryset(self):
        return (
            self.queryset.filter(user=self.request.user)
            .prefetch_related(
                "exercises__exercise",
                "exercises__sets",
            )
        )

    def _copy_session_as_template(self, new_session, template_session_id):
        """Copy exercises and sets from template_session_id (must be user's) into new_session."""
        template = self.get_queryset().filter(id=template_session_id).first()
        if not template:
            return
        for pe in template.exercises.all().order_by("order"):
            new_pe = PerformedExercise.objects.create(
                session=new_session,
                exercise=pe.exercise,
                user_preferred_name=pe.user_preferred_name or "",
                order=pe.order,
                is_bodyweight=pe.is_bodyweight,
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
        data.pop("name", None)  # do not save session name to database
        if template_session_id is not None:
            try:
                template_session_id = int(template_session_id)
            except (TypeError, ValueError):
                template_session_id = None
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        new_session = serializer.instance
        if template_session_id is not None:
            self._copy_session_as_template(new_session, template_session_id)
            new_session = self.get_queryset().get(pk=new_session.pk)
            serializer = self.get_serializer(new_session)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def perform_create(self, serializer):
        kwargs = {"user": self.request.user}
        if "date" in serializer.validated_data:
            kwargs["date"] = serializer.validated_data["date"]
        serializer.save(**kwargs)

    def perform_update(self, serializer):
        serializer.save()
        session = serializer.instance
        exercise_ids = list(
            session.exercises.values_list("exercise_id", flat=True).distinct()
        )
        UserExerciseNote.clear_for_exercises(session.user_id, exercise_ids)

    @action(detail=False, methods=["get"])
    def user_exercises(self, request):
        """GET /api/v1/workouts/user_exercises/ - distinct exercises the user has ever performed."""
        exercises = (
            Exercise.objects.filter(
                performed_instances__session__user=request.user
            )
            .distinct()
            .order_by("name")
        )
        serializer = ExerciseSerializer(exercises, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="last_exercise_performance")
    def last_exercise_performance(self, request):
        """GET /api/v1/workouts/last_exercise_performance/?exercise_id=X - last time user did this exercise, with sets."""
        exercise_id = request.query_params.get("exercise_id")
        if not exercise_id:
            return Response(
                {"detail": "exercise_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            exercise_id = int(exercise_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "exercise_id must be an integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        last = (
            PerformedExercise.objects.filter(
                session__user=request.user,
                exercise_id=exercise_id,
            )
            .order_by("-session__date")
            .select_related("exercise")
            .prefetch_related("sets")
            .first()
        )
        if not last:
            return Response(
                {"detail": "No previous performance for this exercise"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TemplateExerciseSerializer(last)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def template(self, request):
        """GET /api/v1/workouts/template/ - last workout's exercises with sets (for next workout)."""
        last = self.get_queryset().order_by("-date").first()
        if not last:
            return Response([])
        exercises = last.exercises.all().select_related("exercise").prefetch_related("sets")
        serializer = TemplateExerciseSerializer(exercises, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def previous_exercises(self, request, pk=None):
        """GET /api/v1/workouts/{id}/previous_exercises/ - prior session's exercises (for 'last time' ref)."""
        session = self.get_object()
        previous = (
            self.get_queryset()
            .filter(date__lt=session.date)
            .order_by("-date")
            .first()
        )
        if not previous:
            return Response([])
        exercises = previous.exercises.all().select_related("exercise").prefetch_related("sets")
        serializer = TemplateExerciseSerializer(exercises, many=True)
        return Response(serializer.data)

    def _add_exercise(self, session, request):
        data = dict(request.data)
        exercise_name = data.pop("exercise_name", None)
        is_bodyweight = data.pop("is_bodyweight", False)
        if exercise_name:
            name = (
                exercise_name[0]
                if isinstance(exercise_name, (list, tuple))
                else exercise_name
            )
            name_str = str(name).strip()[:100]
            exercise, _ = Exercise.objects.get_or_create(
                name=name_str,
                defaults={"description": ""},
            )
            data["exercise"] = exercise.id
        serializer = PerformedExerciseSerializer(data=data)
        if serializer.is_valid():
            serializer.save(session=session, is_bodyweight=bool(is_bodyweight))
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _list_exercises(self, session):
        exercises = session.exercises.all().select_related("exercise").prefetch_related("sets")
        serializer = PerformedExerciseSerializer(
            exercises, many=True, context={"request": self.request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"])
    def exercises(self, request, pk=None):
        """GET /api/workouts/{id}/exercises/ - list | POST - add one exercise"""
        session = self.get_object()
        if request.method == "POST":
            return self._add_exercise(session, request)
        return self._list_exercises(session)


class PerformedExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = PerformedExerciseSerializer

    def get_queryset(self):
        return (
            PerformedExercise.objects.filter(session__user=self.request.user)
            .select_related("exercise")
            .prefetch_related("sets")
        )

    def _add_set(self, exercise, request):
        serializer = SetEntrySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(performed_exercise=exercise)
        UserExerciseNote.clear_for(request.user, exercise.exercise_id)
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
        return self.queryset.filter(
            performed_exercise__session__user=self.request.user
        ).select_related("performed_exercise__exercise")

    def perform_update(self, serializer):
        serializer.save()
        instance = serializer.instance
        UserExerciseNote.clear_for(
            self.request.user, instance.performed_exercise.exercise_id
        )

    def perform_destroy(self, instance):
        performed_exercise_id = instance.performed_exercise_id
        instance.delete()
        remaining = list(
            SetEntry.objects.filter(performed_exercise_id=performed_exercise_id).order_by("id")
        )
        if not remaining:
            return
        offset = 1000
        for set_entry in remaining:
            set_entry.order = offset + set_entry.order
            set_entry.save(update_fields=["order"])
        for order, set_entry in enumerate(remaining, start=1):
            set_entry.order = order
            set_entry.save(update_fields=["order"])
