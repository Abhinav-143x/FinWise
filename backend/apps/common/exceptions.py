"""
Custom exception handler — normalizes all error responses.
Every error returns: { "error": { "code": ..., "message": ..., "details": ... } }
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "error": {
                "code": response.status_code,
                "message": _extract_message(response.data),
                "details": response.data,
            }
        }
        response.data = error_data

    return response


def _extract_message(data):
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        return "Validation error."
    if isinstance(data, list):
        return str(data[0]) if data else "An error occurred."
    return str(data)
