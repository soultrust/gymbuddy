from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny

from firebase_auth import exchange_firebase_token

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/token/", permission_classes([AllowAny])(obtain_auth_token)),
    path("api/v1/auth/firebase-token/", exchange_firebase_token),
    path("api/v1/", include("workouts.urls")),
]
