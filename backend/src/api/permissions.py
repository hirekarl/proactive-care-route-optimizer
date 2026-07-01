"""Custom DRF permission classes."""

from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView


class HasRouteApiKey(BasePermission):
    """Require 'Authorization: Api-Key <ROUTE_API_KEY>' on route endpoints."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        expected: str = getattr(settings, "ROUTE_API_KEY", "")
        if not expected:
            return False
        auth: str = request.META.get("HTTP_AUTHORIZATION", "")
        scheme, _, token = auth.partition(" ")
        return scheme == "Api-Key" and token == expected
