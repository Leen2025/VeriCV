from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTRefreshView
from .serializers import UserSerializer, RegisterSerializer



class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = {
            "username": request.data.get("username"),
            "first_name": request.data.get("name"),
            "password": request.data.get("password"),
            "confirm_password": request.data.get("confirm_password"),
        }

        serializer = RegisterSerializer(data=data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "User registered successfully.",
                "username": user.username,
                "name": user.first_name,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )



class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if user is None:
            return Response({"error": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return Response({
            "message": "Login successful.",
            "user": {
                "username": user.username,
                "name": user.first_name
            },
            "tokens": {
                "access": access_token,
                "refresh": refresh_token
            }
        }, status=status.HTTP_200_OK)


class CustomTokenRefreshView(SimpleJWTRefreshView):
    """
    Custom wrapper for JWT token refresh endpoint.
    Allows frontend to refresh tokens easily.
    """
    permission_classes = [AllowAny]


class MeView(APIView):
    """Returns the currently authenticated user's basic info (used e.g. to name downloaded reports)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)