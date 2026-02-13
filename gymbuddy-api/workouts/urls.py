from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"exercises", views.ExerciseViewSet, basename="exercise")
router.register(r"workouts", views.WorkoutSessionViewSet, basename="workout")
router.register(
    r"performed-exercises",
    views.PerformedExerciseViewSet,
    basename="performed-exercise",
)
router.register(r"set-entries", views.SetEntryViewSet, basename="set-entry")

urlpatterns = [
    path("debug-db/", views.debug_db),
] + router.urls
