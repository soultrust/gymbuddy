"""
Firebase token verification and Django token exchange.

Set GOOGLE_APPLICATION_CREDENTIALS to the path of your Firebase service account JSON,
or place it at gymbuddy-api/firebase-service-account.json

To add OAuth2 providers (Google, Apple, etc.): verify the provider's token, extract
provider_uid and email, then use UserIdentity to find or create the user - same pattern
as below. Add UserIdentity.Provider entries for each new provider.
"""

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.models import UserIdentity

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
    logger.info(f"Looking for Firebase credentials at: {cred_path}")
    logger.info(
        f"GOOGLE_APPLICATION_CREDENTIALS env var: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'NOT SET')}"
    )
    if not os.path.exists(cred_path):
        error_msg = (
            f"Firebase service account not found at {cred_path}. "
            "Download it from Firebase Console > Project Settings > Service Accounts."
        )
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)
    logger.info(f"Found Firebase credentials at: {cred_path}")
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

        identity = UserIdentity.objects.filter(
            provider=UserIdentity.Provider.FIREBASE, provider_uid=uid
        ).first()
        if identity:
            user = identity.user
        else:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"username": email},
            )
            if created:
                user.set_unusable_password()
                user.save()
            UserIdentity.objects.get_or_create(
                user=user,
                provider=UserIdentity.Provider.FIREBASE,
                provider_uid=uid,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key})
    except FileNotFoundError as e:
        logger.exception("Firebase credentials not found")
        return Response(
            {"detail": f"Server configuration error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    except Exception as e:
        logger.exception("Firebase token exchange failed")
        return Response(
            {"detail": str(e)},
            status=status.HTTP_401_UNAUTHORIZED,
        )
