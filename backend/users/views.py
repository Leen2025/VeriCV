from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTRefreshView



class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        name = request.data.get("name")
        password = request.data.get("password")
        confirm_password = request.data.get("confirm_password")

        if not all([username, name, password, confirm_password]):
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        if password != confirm_password:
            return Response({"error": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password, first_name=name)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        return Response({
            "message": "User registered successfully.",
            "username": user.username,
            "name": user.first_name,
            "tokens": {
                "access": access_token,
                "refresh": refresh_token
            }
        }, status=status.HTTP_201_CREATED)



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