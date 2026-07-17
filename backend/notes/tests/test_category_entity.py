"""Category domain invariants (pure unit — no DB). Supports seeding (auth 1.5)."""

import pytest

from notes.domain.defaults import DEFAULT_CATEGORIES
from notes.domain.entities import Category
from notes.domain.exceptions import InvalidCategory


def test_valid_category_is_constructed_and_trims_name() -> None:
    cat = Category(id=None, name="  School  ", color="#F3DCA0", owner_id=1)
    assert cat.name == "School"
    assert cat.color == "#F3DCA0"


def test_empty_name_is_rejected() -> None:
    with pytest.raises(InvalidCategory):
        Category(id=None, name="   ", color="#F3DCA0", owner_id=1)


def test_non_hex_colour_is_rejected() -> None:
    with pytest.raises(InvalidCategory):
        Category(id=None, name="School", color="yellow", owner_id=1)


def test_default_categories_are_the_three_from_the_demo() -> None:
    names = [c.name for c in DEFAULT_CATEGORIES]
    assert names == ["Random Thoughts", "School", "Personal"]
    # every default colour is a valid entity colour
    for c in DEFAULT_CATEGORIES:
        Category(id=None, name=c.name, color=c.color, owner_id=1)
