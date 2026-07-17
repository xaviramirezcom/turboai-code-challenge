"""Notes + categories routes, mounted under ``/api/`` by the project URLconf."""

from django.urls import path

from .views import CategoriesView, NoteDetailView, NotesView

urlpatterns = [
    path("notes/", NotesView.as_view(), name="notes"),
    path("notes/<uuid:note_id>/", NoteDetailView.as_view(), name="note-detail"),
    path("categories/", CategoriesView.as_view(), name="categories"),
]
