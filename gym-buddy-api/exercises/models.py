from django.db import models


class Exercise(models.Model):
    title = models.CharField(max_length=36, blank=False, unique=True)

    def __str__(self):
        return self.title


class Set(models.Model):
    exercise = models.ForeignKey(
        Exercise, related_name="sets", on_delete=models.CASCADE
    )
    weight = models.FloatField()
    reps = models.IntegerField(blank=False, default=0)
    entrydate = models.DateField(auto_now_add=True)
