"""
Firebase token verification and Django token exchange.

Set GOOGLE_APPLICATION_CREDENTIALS to the path of your Firebase service account JSON,
or place it at gym-buddy-api/firebase-service-account.json
"""

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

User = get_user_model()


def _init_firebase():
    import firebase_admin
    from firebase_admin import credentials

    if firebase_admin._apps:
        return
    cred_path = os.environ.get(
        "GOOGLE_APPLICATION_CREDENTIALS",
        str(Path(__file__).resolve().parent / "firebase-service-account.json"),
    )
    if not os.path.exists(cred_path):
        raise FileNotFoundError(
            f"Firebase service account not found at {cred_path}. "
            "Download it from Firebase Console > Project Settings > Service Accounts."
        )
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)


@api_view(["POST"])
@permission_classes([AllowAny])
def exchange_firebase_token(request: Request) -> Response:
    """Exchange Firebase ID token for Django REST token."""
    id_token = request.data.get("id_token")
    if not id_token or not isinstance(id_token, str):
        return Response(
            {"detail": "id_token required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        _init_firebase()
        from firebase_admin import auth as firebase_auth

        decoded = firebase_auth.verify_id_token(id_token)
        uid = decoded.get("uid")
        email = decoded.get("email") or f"{uid}@firebase.local"
        if not uid:
            return Response(
                {"detail": "Invalid token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        user, created = User.objects.get_or_create(
            username=email,
            defaults={"email": email},
        )
        if created:
            user.set_unusable_password()
            user.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key})
    except Exception as e:
        logger.exception("Firebase token exchange failed")
        return Response(
            {"detail": str(e)},
            status=status.HTTP_401_UNAUTHORIZED,
        )
