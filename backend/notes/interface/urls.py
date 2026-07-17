"""Notes + categories routes, mounted under ``/api/`` by the project URLconf."""

from django.urls import path

from .views import (
    CategoriesView,
    HealthView,
    NoteDetailView,
    NoteHeartbeatView,
    NoteLockView,
    NotesView,
    NoteUnlockView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("notes/", NotesView.as_view(), name="notes"),
    path("notes/<uuid:note_id>/", NoteDetailView.as_view(), name="note-detail"),
    path("notes/<uuid:note_id>/lock/", NoteLockView.as_view(), name="note-lock"),
    path(
        "notes/<uuid:note_id>/lock/heartbeat/",
        NoteHeartbeatView.as_view(),
        name="note-heartbeat",
    ),
    path(
        "notes/<uuid:note_id>/unlock/",
        NoteUnlockView.as_view(),
        name="note-unlock",
    ),
    path("categories/", CategoriesView.as_view(), name="categories"),
]
