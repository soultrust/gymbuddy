from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model with email as the primary identifier.
    Supports multiple auth providers via UserIdentity.
    """

    email = models.EmailField(unique=True)
    # Keep username for Django admin compatibility, but we use email for login

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]  # username still required for createsuperuser

    def __str__(self):
        return self.email


class UserIdentity(models.Model):
    """
    Links a User to an external auth provider (Firebase, Google, etc.).
    One user can have multiple identities (e.g. signed up with Google, also links Firebase).
    """

    class Provider(models.TextChoices):
        FIREBASE = "firebase", "Firebase"
        GOOGLE = "google", "Google"
        APPLE = "apple", "Apple"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="identities",
    )
    provider = models.CharField(max_length=20, choices=Provider.choices)
    provider_uid = models.CharField(max_length=255)

    class Meta:
        unique_together = ("provider", "provider_uid")

    def __str__(self):
        return f"{self.user.email} ({self.provider})"
