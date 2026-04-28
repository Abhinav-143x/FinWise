"""
Currency rates endpoint.
GET /api/v1/currency/rates/ — returns current rates + metadata
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.common.currency import get_rates, get_rate_info, convert
from decimal import Decimal
from rest_framework import serializers


class CurrencyRatesView(APIView):
    """GET /api/v1/currency/rates/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rates = get_rates()
        info = get_rate_info()
        return Response({
            "base": "USD",
            "rates": {k: str(v) for k, v in rates.items()},
            "meta": info,
        })


class CurrencyConvertSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=18, decimal_places=2)
    from_currency = serializers.CharField(max_length=3)
    to_currency = serializers.CharField(max_length=3)


class CurrencyConvertView(APIView):
    """POST /api/v1/currency/convert/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = CurrencyConvertSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        result = convert(d["amount"], d["from_currency"], d["to_currency"])
        return Response({
            "amount": str(d["amount"]),
            "from_currency": d["from_currency"].upper(),
            "to_currency": d["to_currency"].upper(),
            "converted": str(result),
        })
