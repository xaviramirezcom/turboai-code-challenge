"""Thin HTTP adapter: translate request → command, call a use case, serialize.

Owner is always ``request.user`` — every query is scoped to them (5.2). No
business logic here.
"""

from uuid import UUID

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..application.commands import CreateNote, UpdateNote
from ..container import category_service, note_service
from ..domain.entities import Category, Note
from ..domain.exceptions import ForeignCategory, NoteNotFound
from .serializers import (
    CategoryOutSerializer,
    NoteCreateSerializer,
    NoteOutSerializer,
    NoteUpdateSerializer,
)

_FOREIGN_CATEGORY = {"category_id": ["Not one of your categories."]}


def _payload(note: Note, category: Category) -> dict[str, object]:
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "category_id": note.category_id,
        "category": {
            "id": category.id,
            "name": category.name,
            "color": category.color,
        },
        "created_at": note.created_at,
        "last_edited_at": note.last_edited_at,
    }


class NotesView(APIView):
    def get(self, request: Request) -> Response:
        owner_id = request.user.pk
        category_id: int | None = None
        raw = request.query_params.get("category")
        if raw:
            try:
                category_id = int(raw)
            except ValueError:
                return Response(
                    {"category": ["Must be an integer id."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        # One query joins each note's category (select_related) — no N+1, no
        # separate categories round-trip.
        views = note_service().list_with_category(owner_id, category_id)
        data = [
            NoteOutSerializer(_payload(view.note, view.category)).data for view in views
        ]
        return Response(data)

    def post(self, request: Request) -> Response:
        owner_id = request.user.pk
        body = NoteCreateSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            note = note_service().create(
                CreateNote(
                    owner_id=owner_id,
                    category_id=body.validated_data.get("category_id"),
                )
            )
        except ForeignCategory:
            return Response(_FOREIGN_CATEGORY, status=status.HTTP_400_BAD_REQUEST)
        assert note.id is not None
        view = note_service().get_with_category(owner_id, note.id)
        return Response(
            NoteOutSerializer(_payload(view.note, view.category)).data,
            status=status.HTTP_201_CREATED,
        )


class NoteDetailView(APIView):
    def get(self, request: Request, note_id: UUID) -> Response:
        owner_id = request.user.pk
        try:
            view = note_service().get_with_category(owner_id, note_id)
        except NoteNotFound:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(NoteOutSerializer(_payload(view.note, view.category)).data)

    def patch(self, request: Request, note_id: UUID) -> Response:
        owner_id = request.user.pk
        body = NoteUpdateSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            note_service().update(
                UpdateNote(
                    owner_id=owner_id,
                    note_id=note_id,
                    title=body.validated_data.get("title"),
                    content=body.validated_data.get("content"),
                    category_id=body.validated_data.get("category_id"),
                )
            )
        except NoteNotFound:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except ForeignCategory:
            return Response(_FOREIGN_CATEGORY, status=status.HTTP_400_BAD_REQUEST)
        view = note_service().get_with_category(owner_id, note_id)
        return Response(NoteOutSerializer(_payload(view.note, view.category)).data)

    def delete(self, request: Request, note_id: UUID) -> Response:
        owner_id = request.user.pk
        try:
            note_service().delete(owner_id, note_id)
        except NoteNotFound:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoriesView(APIView):
    def get(self, request: Request) -> Response:
        owner_id = request.user.pk
        items = category_service().list_with_counts(owner_id)
        data: list[dict[str, object]] = [
            {
                "id": item.category.id,
                "name": item.category.name,
                "color": item.category.color,
                "is_default": item.category.is_default,
                "note_count": item.note_count,
            }
            for item in items
        ]
        return Response([CategoryOutSerializer(row).data for row in data])
