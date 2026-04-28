"""Profile views — single resource per user."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Profile
from .serializers import ProfileSerializer


class ProfileView(APIView):
    """GET/PATCH /api/v1/profile/"""
    permission_classes = [IsAuthenticated]

    def _get_or_create_profile(self, user):
        profile, _ = Profile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        profile = self._get_or_create_profile(request.user)
        return Response(ProfileSerializer(profile).data)

    def patch(self, request):
        profile = self._get_or_create_profile(request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        """Full update — same as patch but requires all fields."""
        return self.patch(request)
