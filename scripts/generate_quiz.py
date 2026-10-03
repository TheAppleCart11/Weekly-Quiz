#!/usr/bin/env python3

import json
import os
import re
import sys

from datetime import date, timedelta
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError


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


# --------------------------------------------------
# Load existing quiz
# --------------------------------------------------

def load_quiz(path):

    with path.open(
        "r",
        encoding="utf-8"
    ) as f:

        return json.load(f)


# --------------------------------------------------
# Find existing quiz weeks
# --------------------------------------------------

def existing_weeks():

    weeks = []


    for path in QUIZ_DIR.glob(
        "week*.json"
    ):

        match = re.fullmatch(
            r"week(\d+)\.json",
            path.name
        )


        if match:

            weeks.append(
                int(match.group(1))
            )


    return sorted(
        weeks
    )


# --------------------------------------------------
# Determine next quiz week
# --------------------------------------------------

def next_week():

    weeks = existing_weeks()


    if not weeks:

        return 1


    return max(weeks) + 1


# --------------------------------------------------
# Calculate quiz date
#
# Week 1 = Wednesday 9 September 2026
# --------------------------------------------------

def week_date(
    week_number
):

    return (
        date(
            2026,
            9,
            9
        )
        +
        timedelta(
            days=(week_number - 1) * 7
        )
    )


# --------------------------------------------------
# Build AI prompt
# --------------------------------------------------

def build_prompt(
    week_number,
    target_date,
    previous_quiz
):

    previous = json.dumps(
        previous_quiz,
        ensure_ascii=False,
        indent=2
    )


    return f"""
Create the next weekly quiz for a personal knowledge challenge.

Return ONLY valid JSON.

Do not use Markdown fences.
Do not include explanatory text.

Required structure:

{{
  "week": {week_number},
  "date": "{target_date.isoformat()}",
  "title": "Weekly Knowledge Challenge",
  "categories": [
    {{
      "name": "...",
      "questions": [
        {{
          "id": "...",
          "question": "...",
          "answer": "...",
          "difficulty": "Easy|Medium|Hard"
        }}
      ]
    }}
  ]
}}

Requirements:

- Exactly these five categories, in this order:

  1. Electrical & Engineering
  2. Technology
  3. Australia
  4. Science
  5. History & Geography

- Exactly 5 questions per category.
- Exactly 25 questions total.
- Every question must have a unique ID.
- Every question must contain:
  - id
  - question
  - answer
  - difficulty

- Difficulty must be one of:
  - Easy
  - Medium
  - Hard

- Each category should contain a useful spread
  of Easy, Medium and Hard questions.

- Questions should be objective and factually
  defensible.

- Questions should be suitable for a general
  adult knowledge quiz.

- Keep the established style:
  concise questions and useful concise answers.

- Avoid repeating or closely duplicating questions
  from the previous quiz.

- Do not depend on the learner having seen
  an earlier question.

- Use Australian English where spelling differs.

- Do not include political persuasion,
  partisan framing or current political questions.

- Do not add fields other than those specified.

Here is the previous quiz.
Use it only to avoid repetition:

{previous}
""".strip()


# --------------------------------------------------
# Call Gemini
# --------------------------------------------------

def call_gemini(
    prompt
):

    api_key = os.environ.get(
        "GEMINI_API_KEY"
    )


    if not api_key:

        raise RuntimeError(
            "GEMINI_API_KEY is not configured "
            "in GitHub Actions."
        )


    model = os.environ.get(
        "GEMINI_MODEL",
        "gemini-3.7-flash"
    )


    url = (
        "https://generativelanguage.googleapis.com/"
        "v1beta/models/"
        f"{model}:generateContent"
        f"?key={api_key}"
    )


    payload = {

        "contents": [

            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }

        ],

        "generationConfig": {

            "temperature": 0.7,

            "responseMimeType":
                "application/json"

        }

    }


    request = Request(

        url,

        data=json.dumps(
            payload
        ).encode(),

        headers={
            "Content-Type":
                "application/json"
        },

        method="POST"

    )


    try:

        with urlopen(
            request,
            timeout=120
        ) as response:

            data = json.load(
                response
            )


    except HTTPError as exc:

        body = exc.read().decode(
            errors="replace"
        )


        raise RuntimeError(
            f"Gemini API request failed "
            f"({exc.code}): {body}"
        ) from exc


    try:

        text = (
            data[
                "candidates"
            ][0][
                "content"
            ][
                "parts"
            ][0][
                "text"
            ]
        )


        return json.loads(
            text
        )


    except (
        KeyError,
        IndexError,
        TypeError,
        json.JSONDecodeError
    ) as exc:

        raise RuntimeError(
            f"Gemini returned invalid JSON: {data}"
        ) from exc


# --------------------------------------------------
# Validate generated quiz
# --------------------------------------------------

def validate(
    quiz,
    week_number,
    target_date
):

    if not isinstance(
        quiz,
        dict
    ):

        raise ValueError(
            "Quiz must be a JSON object."
        )


    if quiz.get(
        "week"
    ) != week_number:

        raise ValueError(
            "Incorrect week number."
        )


    if quiz.get(
        "date"
    ) != target_date.isoformat():

        raise ValueError(
            "Incorrect quiz date."
        )


    if quiz.get(
        "title"
    ) != "Weekly Knowledge Challenge":

        raise ValueError(
            "Unexpected quiz title."
        )


    categories = quiz.get(
        "categories"
    )


    if (
        not isinstance(
            categories,
            list
        )
        or
        len(categories) != 5
    ):

        raise ValueError(
            "Exactly 5 categories required."
        )


    category_names = [
        category.get(
            "name"
        )
        for category in categories
    ]


    if category_names != CATEGORIES:

        raise ValueError(
            "Unexpected category list."
        )


    question_ids = set()


    for category in categories:

        questions = category.get(
            "questions"
        )


        if (
            not isinstance(
                questions,
                list
            )
            or
            len(questions) != 5
        ):

            raise ValueError(
                f"{category.get('name')} "
                "needs exactly 5 questions."
            )


        difficulties = set()


        for question in questions:

            if set(
                question.keys()
            ) != {
                "id",
                "question",
                "answer",
                "difficulty"
            }:

                raise ValueError(
                    f"Invalid fields in "
                    f"{question.get('id')}."
                )


            if not all(
                isinstance(
                    question[key],
                    str
                )
                and
                question[key].strip()
                for key in question
            ):

                raise ValueError(
                    "Question contains "
                    "an empty field."
                )


            question_id = question[
                "id"
            ]


            if question_id in question_ids:

                raise ValueError(
                    f"Duplicate question ID: "
                    f"{question_id}"
                )


            question_ids.add(
                question_id
            )


            difficulty = question[
                "difficulty"
            ]


            if difficulty not in DIFFICULTIES:

                raise ValueError(
                    f"Invalid difficulty: "
                    f"{difficulty}"
                )


            difficulties.add(
                difficulty
            )


        if len(
            difficulties
        ) < 2:

            raise ValueError(
                f"{category.get('name')} "
                "needs at least two "
                "difficulty levels."
            )


    if len(
        question_ids
    ) != 25:

        raise ValueError(
            f"Expected 25 unique questions, "
            f"got {len(question_ids)}."
        )


# --------------------------------------------------
# Main
# --------------------------------------------------

def main():

    requested_week = os.environ.get(
        "QUIZ_WEEK",
        ""
    ).strip()


    if requested_week:

        week_number = int(
            requested_week
        )

    else:

        week_number = next_week()


    target_path = (
        QUIZ_DIR
        /
        f"week{week_number}.json"
    )


    # Never overwrite an existing quiz

    if target_path.exists():

        raise RuntimeError(
            f"{target_path.name} already exists. "
            "Refusing to overwrite it."
        )


    weeks = existing_weeks()


    if weeks:

        expected_week = (
            max(weeks) + 1
        )


        if week_number != expected_week:

            raise RuntimeError(
                f"Next sequential week is "
                f"{expected_week}. "
                f"Refusing to create week "
                f"{week_number}."
            )


    previous_path = (
        QUIZ_DIR
        /
        f"week{week_number - 1}.json"
    )


    if previous_path.exists():

        previous_quiz = load_quiz(
            previous_path
        )

    else:

        previous_quiz = {}


    target_date = week_date(
        week_number
    )


    prompt = build_prompt(
        week_number,
        target_date,
        previous_quiz
    )


    quiz = call_gemini(
        prompt
    )


    validate(
        quiz,
        week_number,
        target_date
    )


    target_path.write_text(

        json.dumps(
            quiz,
            ensure_ascii=False,
            indent=2
        )
        +
        "\n",

        encoding="utf-8"

    )


    print(
        "Generated and validated "
        f"{target_path.relative_to(ROOT)}"
    )


if __name__ == "__main__":

    try:

        main()

    except Exception as exc:

        print(
            f"ERROR: {exc}",
            file=sys.stderr
        )

        sys.exit(1)
