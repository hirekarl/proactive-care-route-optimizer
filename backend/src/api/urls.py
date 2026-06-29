from django.urls import path

from .views import (
    BuildingDetailView,
    BuildingListView,
    DashboardSummaryView,
    HealthCheckView,
    OutagesView,
    ProvidersView,
    RouteCreateView,
    RouteDetailView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("outages/", OutagesView.as_view(), name="outages"),
    path("providers/", ProvidersView.as_view(), name="providers"),
    path("routes/", RouteCreateView.as_view(), name="route-create"),
    path("routes/<int:pk>/", RouteDetailView.as_view(), name="route-detail"),
    path("buildings/", BuildingListView.as_view(), name="building-list"),
    path("buildings/<str:bin>/", BuildingDetailView.as_view(), name="building-detail"),
]
