from django.contrib import admin
from .models import Exercise, WorkoutSession, PerformedExercise, SetEntry


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ["name", "description"]
    search_fields = ["name"]


class SetEntryInline(admin.TabularInline):
    model = SetEntry
    extra = 0
    min_num = 1
    max_num = 1000


class PerformedExerciseInline(admin.TabularInline):
    model = PerformedExercise
    extra = 0


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ["user", "date", "name"]
    list_filter = ["date"]
    search_fields = ["user__username", "name"]
    inlines = [PerformedExerciseInline]


@admin.register(PerformedExercise)
class PerformedExerciseAdmin(admin.ModelAdmin):
    list_display = ["workout", "exercise", "order"]
    list_filter = ["exercise"]
    inlines = [SetEntryInline]


@admin.register(SetEntry)
class SetEntryAdmin(admin.ModelAdmin):
    list_display = ["performed_exercise", "order", "reps", "weight"]
    list_filter = ["performed_exercise__exercise"]
