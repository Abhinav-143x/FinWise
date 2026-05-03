"""
Health check endpoint — used by Docker, load balancers, uptime monitors.
Returns 200 with DB status.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from django.utils import timezone
import time


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = False
        db_ms = None
        try:
            t0 = time.monotonic()
            connection.ensure_connection()
            db_ms = round((time.monotonic() - t0) * 1000, 1)
            db_ok = True
        except Exception:
            pass

        status_code = 200 if db_ok else 503
        return Response({
            "status": "ok" if db_ok else "degraded",
            "timestamp": timezone.now().isoformat(),
            "db": {"connected": db_ok, "latency_ms": db_ms},
            "version": "2.5",
        }, status=status_code)
