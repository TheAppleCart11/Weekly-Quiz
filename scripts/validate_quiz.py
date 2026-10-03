#!/usr/bin/env python3

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUIZ_DIR = ROOT / "quizzes"


CATEGORIES = [
    "Electrical & Engineering",
    "Technology",
    "Australia",
    "Science",
    "History & Geography"
]


DIFFICULTIES = {
    "Easy",
    "Medium",
    "Hard"
}


def validate(path):

    with path.open("r", encoding="utf-8") as f:
        quiz = json.load(f)


    # --------------------------------------------------
    # Basic structure
    # --------------------------------------------------

    assert isinstance(
        quiz,
        dict
    )


    assert isinstance(
        quiz.get("week"),
        int
    )


    assert re.fullmatch(
        r"\d{4}-\d{2}-\d{2}",
        quiz.get("date", "")
    )


    assert quiz.get(
        "title"
    ) == "Weekly Knowledge Challenge"


    # --------------------------------------------------
    # Categories
    # --------------------------------------------------

    categories = quiz.get(
        "categories"
    )


    assert isinstance(
        categories,
        list
    )


    assert len(categories) == 5


    assert [
        category.get("name")
        for category in categories
    ] == CATEGORIES


    # --------------------------------------------------
    # Questions
    # --------------------------------------------------

    question_ids = set()


    for category in categories:

        questions = category.get(
            "questions"
        )


        assert isinstance(
            questions,
            list
        )


        assert len(questions) == 5


        for question in questions:

            # Exact question structure
            assert set(question) == {
                "id",
                "question",
                "answer",
                "difficulty"
            }


            # All fields must contain text
            assert all(
                isinstance(
                    question[key],
                    str
                )
                and question[key].strip()
                for key in question
            )


            # Difficulty must be valid
            assert question[
                "difficulty"
            ] in DIFFICULTIES


            # Question IDs must be unique
            assert question[
                "id"
            ] not in question_ids


            question_ids.add(
                question["id"]
            )


    # --------------------------------------------------
    # Total question count
    # --------------------------------------------------

    assert len(
        question_ids
    ) == 25


def main():

    paths = sorted(
        QUIZ_DIR.glob(
            "week*.json"
        )
    )


    if not paths:

        raise AssertionError(
            "No quiz files found."
        )


    for path in paths:

        validate(path)

        print(
            f"PASS {path.relative_to(ROOT)}"
        )


if __name__ == "__main__":

    try:

        main()

    except Exception as exc:

        print(
            f"FAIL: {exc}",
            file=sys.stderr
        )

        sys.exit(1)
