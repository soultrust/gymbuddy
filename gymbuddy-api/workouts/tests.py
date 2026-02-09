from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Exercise, PerformedExercise, SetEntry, WorkoutSession

User = get_user_model()


class WorkoutSessionAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.other_user = User.objects.create_user(
            email="other@example.com", username="otheruser", password="otherpass123"
        )

    def test_list_workouts_requires_auth(self):
        self.client.credentials()
        r = self.client.get("/api/v1/workouts/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_workouts_empty(self):
        r = self.client.get("/api/v1/workouts/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data, [])

    def test_create_workout(self):
        r = self.client.post(
            "/api/v1/workouts/",
            {"date": "2025-01-15", "name": "Push day", "notes": ""},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["date"], "2025-01-15")
        self.assertEqual(r.data["name"], "Push day")
        self.assertEqual(r.data["exercises"], [])

    def test_user_only_sees_own_workouts(self):
        WorkoutSession.objects.create(
            user=self.user, date=date(2025, 1, 15), name="Mine"
        )
        WorkoutSession.objects.create(
            user=self.other_user, date=date(2025, 1, 16), name="Theirs"
        )
        r = self.client.get("/api/v1/workouts/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["name"], "Mine")

    def test_retrieve_workout(self):
        w = WorkoutSession.objects.create(
            user=self.user, date=date(2025, 1, 15), name="Push"
        )
        r = self.client.get(f"/api/v1/workouts/{w.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["name"], "Push")

    def test_cannot_retrieve_other_users_workout(self):
        w = WorkoutSession.objects.create(
            user=self.other_user, date=date(2025, 1, 15), name="Theirs"
        )
        r = self.client.get(f"/api/v1/workouts/{w.id}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)


class WorkoutExercisesAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.workout = WorkoutSession.objects.create(
            user=self.user, date=date(2025, 1, 15), name="Push"
        )
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

    def test_list_exercises(self):
        PerformedExercise.objects.create(
            workout=self.workout, exercise=self.bench, order=1
        )
        r = self.client.get(f"/api/v1/workouts/{self.workout.id}/exercises/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["exercise"]["name"], "Bench Press")


class PerformedExerciseSetsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.workout = WorkoutSession.objects.create(
            user=self.user, date=date(2025, 1, 15), name="Push"
        )
        self.bench = Exercise.objects.create(name="Bench Press", description="")
        self.performed = PerformedExercise.objects.create(
            workout=self.workout, exercise=self.bench, order=1
        )

    def test_add_set(self):
        r = self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/sets/",
            {"order": 1, "reps": 10, "weight": "135"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["reps"], 10)
        self.assertEqual(Decimal(str(r.data["weight"])), Decimal("135"))

    def test_add_set_without_weight(self):
        r = self.client.post(
            f"/api/v1/performed-exercises/{self.performed.id}/sets/",
            {"order": 1, "reps": 12},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(r.data["weight"])


class SetEntryAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.workout = WorkoutSession.objects.create(
            user=self.user, date=date(2025, 1, 15), name="Push"
        )
        self.bench = Exercise.objects.create(name="Bench Press", description="")
        self.performed = PerformedExercise.objects.create(
            workout=self.workout, exercise=self.bench, order=1
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
        self.assertEqual(r.data["reps"], 12)
        self.assertEqual(Decimal(str(r.data["weight"])), Decimal("145"))

    def test_delete_set(self):
        r = self.client.delete(f"/api/v1/set-entries/{self.set_entry.id}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SetEntry.objects.filter(id=self.set_entry.id).exists())


class TemplateAndPreviousExercisesAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpass123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_template_empty_when_no_workouts(self):
        r = self.client.get("/api/v1/workouts/template/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data, [])

    def test_template_returns_last_workout_exercises(self):
        w = WorkoutSession.objects.create(
            user=self.user, date=date(2025, 1, 15), name="Push"
        )
        ex = Exercise.objects.create(name="Bench Press", description="")
        pe = PerformedExercise.objects.create(workout=w, exercise=ex, order=1)
        SetEntry.objects.create(
            performed_exercise=pe, order=1, reps=10, weight=Decimal("135")
        )
        r = self.client.get("/api/v1/workouts/template/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["exercise"]["name"], "Bench Press")
        self.assertEqual(len(r.data[0]["last_sets"]), 1)

    def test_previous_exercises_returns_prior_workout(self):
        w1 = WorkoutSession.objects.create(
            user=self.user, date=date(2025, 1, 10), name="Earlier"
        )
        w2 = WorkoutSession.objects.create(
            user=self.user, date=date(2025, 1, 15), name="Later"
        )
        ex = Exercise.objects.create(name="Squat", description="")
        PerformedExercise.objects.create(workout=w1, exercise=ex, order=1)
        r = self.client.get(f"/api/v1/workouts/{w2.id}/previous_exercises/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["exercise"]["name"], "Squat")
