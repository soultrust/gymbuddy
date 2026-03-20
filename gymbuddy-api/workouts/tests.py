from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Exercise, PerformedExercise, Program, Session, SetEntry, UserExerciseNote

User = get_user_model()


class _AuthenticatedTestCase(APITestCase):
    """Base class that creates a user, token, and authenticates the client."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.other_user = User.objects.create_user(
            email="other@example.com", username="otheruser", password="otherpass123"
        )


# ---------------------------------------------------------------------------
# Session CRUD
# ---------------------------------------------------------------------------


class WorkoutSessionAPITests(_AuthenticatedTestCase):
    def test_list_workouts_requires_auth(self):
        self.client.credentials()
        r = self.client.get("/api/v1/workouts/")
        self.assertIn(r.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_list_workouts_empty(self):
        r = self.client.get("/api/v1/workouts/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data, [])

    def test_create_workout(self):
        r = self.client.post(
            "/api/v1/workouts/",
            {"name": "Push day", "notes": ""},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn("date", r.data)
        self.assertEqual(r.data["exercises"], [])

    def test_user_only_sees_own_workouts(self):
        Session.objects.create(user=self.user, name="Mine")
        Session.objects.create(user=self.other_user, name="Theirs")
        r = self.client.get("/api/v1/workouts/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["name"], "Mine")

    def test_retrieve_workout(self):
        w = Session.objects.create(user=self.user, name="Push")
        r = self.client.get(f"/api/v1/workouts/{w.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["name"], "Push")

    def test_cannot_retrieve_other_users_workout(self):
        w = Session.objects.create(user=self.other_user, name="Theirs")
        r = self.client.get(f"/api/v1/workouts/{w.id}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Exercises on a session
# ---------------------------------------------------------------------------


class WorkoutExercisesAPITests(_AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.workout = Session.objects.create(user=self.user, name="Push")
        self.bench = Exercise.objects.create(name="Bench Press", description="")

    def test_add_exercise_by_id(self):
        r = self.client.post(
            f"/api/v1/workouts/{self.workout.id}/exercises/",
            {"exercise": self.bench.id, "order": 1},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["exercise"]["name"], "Bench Press")
        self.assertEqual(r.data["order"], 1)

    def test_add_exercise_by_name_creates_exercise(self):
        r = self.client.post(
            f"/api/v1/workouts/{self.workout.id}/exercises/",
            {"exercise_name": "Incline DB Press", "order": 1},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["exercise"]["name"], "Incline DB Press")
        self.assertTrue(Exercise.objects.filter(name="Incline DB Press").exists())

    def test_add_exercise_with_bodyweight_flag(self):
        r = self.client.post(
            f"/api/v1/workouts/{self.workout.id}/exercises/",
            {"exercise": self.bench.id, "order": 1, "is_bodyweight": True},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(r.data["is_bodyweight"])

    def test_list_exercises(self):
        PerformedExercise.objects.create(
            session=self.workout, exercise=self.bench, order=1
        )
        r = self.client.get(f"/api/v1/workouts/{self.workout.id}/exercises/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["exercise"]["name"], "Bench Press")


# ---------------------------------------------------------------------------
# Sets CRUD
# ---------------------------------------------------------------------------


class PerformedExerciseSetsAPITests(_AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.workout = Session.objects.create(user=self.user, name="Push")
        self.bench = Exercise.objects.create(name="Bench Press", description="")
        self.performed = PerformedExercise.objects.create(
            session=self.workout, exercise=self.bench, order=1
        )

    def test_add_set(self):
        r = self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/sets/",
            {"order": 1, "reps": 10, "weight": "135"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(r.data["reps"])), Decimal("10"))
        self.assertEqual(Decimal(str(r.data["weight"])), Decimal("135"))

    def test_add_set_without_weight(self):
        r = self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/sets/",
            {"order": 1, "reps": 12},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(r.data["weight"])

    def test_add_set_decimal_reps(self):
        r = self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/sets/",
            {"order": 1, "reps": "7.5", "weight": "100"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(r.data["reps"])), Decimal("7.5"))


# ---------------------------------------------------------------------------
# Set update / delete / renumber
# ---------------------------------------------------------------------------


class SetEntryAPITests(_AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.workout = Session.objects.create(user=self.user, name="Push")
        self.bench = Exercise.objects.create(name="Bench Press", description="")
        self.performed = PerformedExercise.objects.create(
            session=self.workout, exercise=self.bench, order=1
        )
        self.set_entry = SetEntry.objects.create(
            performed_exercise=self.performed, order=1, reps=10, weight=Decimal("135")
        )

    def test_patch_set(self):
        r = self.client.patch(
            f"/api/v1/set-entries/{self.set_entry.id}/",
            {"reps": 12, "weight": "145"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(r.data["reps"])), Decimal("12"))
        self.assertEqual(Decimal(str(r.data["weight"])), Decimal("145"))

    def test_delete_set(self):
        r = self.client.delete(f"/api/v1/set-entries/{self.set_entry.id}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SetEntry.objects.filter(id=self.set_entry.id).exists())

    def test_delete_renumbers_remaining_sets(self):
        s2 = SetEntry.objects.create(
            performed_exercise=self.performed, order=2, reps=8, weight=Decimal("135")
        )
        s3 = SetEntry.objects.create(
            performed_exercise=self.performed, order=3, reps=6, weight=Decimal("135")
        )
        self.client.delete(f"/api/v1/set-entries/{self.set_entry.id}/")
        s2.refresh_from_db()
        s3.refresh_from_db()
        self.assertEqual(s2.order, 1)
        self.assertEqual(s3.order, 2)


# ---------------------------------------------------------------------------
# Serializer validation
# ---------------------------------------------------------------------------


class SetEntryValidationTests(_AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.workout = Session.objects.create(user=self.user, name="Push")
        self.bench = Exercise.objects.create(name="Bench Press", description="")
        self.performed = PerformedExercise.objects.create(
            session=self.workout, exercise=self.bench, order=1
        )

    def test_negative_reps_rejected(self):
        r = self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/sets/",
            {"order": 1, "reps": -1, "weight": "100"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reps", r.data)

    def test_negative_weight_rejected(self):
        r = self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/sets/",
            {"order": 1, "reps": 10, "weight": "-50"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("weight", r.data)

    def test_zero_order_rejected(self):
        r = self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/sets/",
            {"order": 0, "reps": 10},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("order", r.data)


# ---------------------------------------------------------------------------
# Note for next time (save / clear on interaction)
# ---------------------------------------------------------------------------


class NoteForNextTimeTests(_AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.workout = Session.objects.create(user=self.user, name="Push")
        self.bench = Exercise.objects.create(name="Bench Press", description="")
        self.performed = PerformedExercise.objects.create(
            session=self.workout, exercise=self.bench, order=1
        )

    def test_save_note(self):
        r = self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/note_for_next_time/",
            {"note": "Try wider grip"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["note_for_next_time"], "Try wider grip")
        self.assertTrue(
            UserExerciseNote.objects.filter(
                user=self.user, exercise=self.bench, note="Try wider grip"
            ).exists()
        )

    def test_note_cleared_when_set_added(self):
        UserExerciseNote.objects.create(
            user=self.user, exercise=self.bench, note="Go heavier"
        )
        self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/sets/",
            {"order": 1, "reps": 10, "weight": "135"},
            format="json",
        )
        self.assertFalse(
            UserExerciseNote.objects.filter(user=self.user, exercise=self.bench).exists()
        )

    def test_note_cleared_when_set_updated(self):
        UserExerciseNote.objects.create(
            user=self.user, exercise=self.bench, note="Go heavier"
        )
        s = SetEntry.objects.create(
            performed_exercise=self.performed, order=1, reps=10, weight=Decimal("135")
        )
        self.client.patch(
            f"/api/v1/set-entries/{s.id}/",
            {"reps": 12},
            format="json",
        )
        self.assertFalse(
            UserExerciseNote.objects.filter(user=self.user, exercise=self.bench).exists()
        )

    def test_note_cleared_when_session_updated(self):
        UserExerciseNote.objects.create(
            user=self.user, exercise=self.bench, note="Go heavier"
        )
        self.client.patch(
            f"/api/v1/workouts/{self.workout.id}/",
            {"notes": "Great session"},
            format="json",
        )
        self.assertFalse(
            UserExerciseNote.objects.filter(user=self.user, exercise=self.bench).exists()
        )

    def test_note_appears_in_exercise_serializer(self):
        UserExerciseNote.objects.create(
            user=self.user, exercise=self.bench, note="Go heavier"
        )
        r = self.client.get(f"/api/v1/workouts/{self.workout.id}/exercises/")
        self.assertEqual(r.data[0]["note_for_next_time"], "Go heavier")


# ---------------------------------------------------------------------------
# Template session copy (with is_bodyweight)
# ---------------------------------------------------------------------------


class TemplateCopyTests(_AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.bench = Exercise.objects.create(name="Bench Press", description="")
        self.pullup = Exercise.objects.create(name="Pull-up", description="")

        self.template_session = Session.objects.create(user=self.user, name="Template")
        pe1 = PerformedExercise.objects.create(
            session=self.template_session, exercise=self.bench, order=1,
            is_bodyweight=False,
        )
        pe2 = PerformedExercise.objects.create(
            session=self.template_session, exercise=self.pullup, order=2,
            is_bodyweight=True,
        )
        SetEntry.objects.create(performed_exercise=pe1, order=1, reps=10, weight=Decimal("135"))
        SetEntry.objects.create(performed_exercise=pe1, order=2, reps=8, weight=Decimal("145"))
        SetEntry.objects.create(performed_exercise=pe2, order=1, reps=12)

    def test_copy_exercises_and_sets(self):
        r = self.client.post(
            "/api/v1/workouts/",
            {"template_session_id": self.template_session.id},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        exercises = r.data["exercises"]
        self.assertEqual(len(exercises), 2)
        self.assertEqual(len(exercises[0]["sets"]), 2)
        self.assertEqual(len(exercises[1]["sets"]), 1)

    def test_copy_preserves_bodyweight_flag(self):
        r = self.client.post(
            "/api/v1/workouts/",
            {"template_session_id": self.template_session.id},
            format="json",
        )
        exercises = r.data["exercises"]
        self.assertFalse(exercises[0]["is_bodyweight"])
        self.assertTrue(exercises[1]["is_bodyweight"])

    def test_copy_preserves_set_data(self):
        r = self.client.post(
            "/api/v1/workouts/",
            {"template_session_id": self.template_session.id},
            format="json",
        )
        first_set = r.data["exercises"][0]["sets"][0]
        self.assertEqual(Decimal(str(first_set["reps"])), Decimal("10"))
        self.assertEqual(Decimal(str(first_set["weight"])), Decimal("135"))

    def test_copy_ignores_invalid_template_id(self):
        r = self.client.post(
            "/api/v1/workouts/",
            {"template_session_id": 99999},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["exercises"], [])

    def test_copy_ignores_other_users_template(self):
        other_session = Session.objects.create(user=self.other_user, name="Theirs")
        r = self.client.post(
            "/api/v1/workouts/",
            {"template_session_id": other_session.id},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["exercises"], [])


# ---------------------------------------------------------------------------
# Template / previous_exercises endpoints
# ---------------------------------------------------------------------------


class TemplateAndPreviousExercisesAPITests(_AuthenticatedTestCase):
    def test_template_empty_when_no_workouts(self):
        r = self.client.get("/api/v1/workouts/template/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data, [])

    def test_template_returns_last_workout_exercises(self):
        w = Session.objects.create(user=self.user, name="Push")
        ex = Exercise.objects.create(name="Bench Press", description="")
        pe = PerformedExercise.objects.create(session=w, exercise=ex, order=1)
        SetEntry.objects.create(
            performed_exercise=pe, order=1, reps=10, weight=Decimal("135")
        )
        r = self.client.get("/api/v1/workouts/template/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["exercise"]["name"], "Bench Press")
        self.assertEqual(len(r.data[0]["last_sets"]), 1)

    def test_previous_exercises_returns_prior_workout(self):
        w1 = Session.objects.create(user=self.user, name="Earlier")
        w2 = Session.objects.create(user=self.user, name="Later")
        ex = Exercise.objects.create(name="Squat", description="")
        PerformedExercise.objects.create(session=w1, exercise=ex, order=1)
        r = self.client.get(f"/api/v1/workouts/{w2.id}/previous_exercises/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["exercise"]["name"], "Squat")


# ---------------------------------------------------------------------------
# Programs CRUD
# ---------------------------------------------------------------------------


class ProgramAPITests(_AuthenticatedTestCase):
    def test_create_program(self):
        r = self.client.post(
            "/api/v1/programs/",
            {"name": "Push Pull Legs", "description": "3-day split"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["name"], "Push Pull Legs")

    def test_list_only_own_programs(self):
        Program.objects.create(user=self.user, name="Mine")
        Program.objects.create(user=self.other_user, name="Theirs")
        r = self.client.get("/api/v1/programs/")
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["name"], "Mine")

    def test_assign_program_to_session(self):
        p = Program.objects.create(user=self.user, name="PPL")
        r = self.client.post(
            "/api/v1/workouts/",
            {"program": p.id},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["program"], p.id)


# ---------------------------------------------------------------------------
# User exercises / last_exercise_performance
# ---------------------------------------------------------------------------


class UserExerciseEndpointTests(_AuthenticatedTestCase):
    def test_user_exercises_returns_distinct(self):
        ex = Exercise.objects.create(name="Squat", description="")
        w1 = Session.objects.create(user=self.user, name="A")
        w2 = Session.objects.create(user=self.user, name="B")
        PerformedExercise.objects.create(session=w1, exercise=ex, order=1)
        PerformedExercise.objects.create(session=w2, exercise=ex, order=1)
        r = self.client.get("/api/v1/workouts/user_exercises/")
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["name"], "Squat")

    def test_last_exercise_performance(self):
        ex = Exercise.objects.create(name="Squat", description="")
        w = Session.objects.create(user=self.user, name="Leg day")
        pe = PerformedExercise.objects.create(session=w, exercise=ex, order=1)
        SetEntry.objects.create(performed_exercise=pe, order=1, reps=5, weight=Decimal("225"))
        r = self.client.get(f"/api/v1/workouts/last_exercise_performance/?exercise_id={ex.id}")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["exercise"]["name"], "Squat")
        self.assertEqual(len(r.data["last_sets"]), 1)

    def test_last_exercise_performance_missing_id(self):
        r = self.client.get("/api/v1/workouts/last_exercise_performance/")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_last_exercise_performance_no_history(self):
        ex = Exercise.objects.create(name="Squat", description="")
        r = self.client.get(f"/api/v1/workouts/last_exercise_performance/?exercise_id={ex.id}")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
