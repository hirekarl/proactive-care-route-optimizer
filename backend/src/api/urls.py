from django.urls import path

from .views import (
    BuildingDetailView,
    BuildingListView,
    HealthCheckView,
    OutagesView,
    RouteCreateView,
    RouteDetailView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("outages/", OutagesView.as_view(), name="outages"),
    path("routes/", RouteCreateView.as_view(), name="route-create"),
    path("routes/<int:pk>/", RouteDetailView.as_view(), name="route-detail"),
    path("buildings/", BuildingListView.as_view(), name="building-list"),
    path("buildings/<str:bin>/", BuildingDetailView.as_view(), name="building-detail"),
]
