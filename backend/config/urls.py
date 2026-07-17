"""Root URL configuration. Versioned API under ``/api/``."""

from django.urls import include, path

urlpatterns = [
    path("api/auth/", include("accounts.interface.urls")),
    path("api/", include("notes.interface.urls")),
]
