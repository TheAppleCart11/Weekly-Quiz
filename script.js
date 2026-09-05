let score = 0;
let totalQuestions = 0;

async function loadQuiz() {

    try {

        const response = await fetch("quizzes/week1.json");

        if (!response.ok) {
            throw new Error("Could not load quiz.");
        }

        const quiz = await response.json();

        displayQuiz(quiz);

    } catch (error) {

        document.getElementById("quiz-container").innerHTML =
            "<p>Sorry, the quiz could not be loaded.</p>";

        console.error(error);
    }
}


function displayQuiz(quiz) {

    const container = document.getElementById("quiz-container");

    document.getElementById("quiz-title").textContent =
        `Week ${quiz.week} • 25 Questions`;

    document.getElementById("week-number").textContent =
        quiz.week;

    container.innerHTML = "";

    totalQuestions = 0;

    quiz.categories.forEach((category, categoryIndex) => {

        const categorySection = document.createElement("section");

        categorySection.className = "category";

        const categoryTitle = document.createElement("h2");

        categoryTitle.textContent =
            `${categoryIndex + 1}. ${category.name}`;

        categorySection.appendChild(categoryTitle);

        category.questions.forEach((question, questionIndex) => {

            totalQuestions++;

            const questionCard =
                document.createElement("div");

            questionCard.className = "question-card";

            questionCard.innerHTML = `
                <div class="question-header">

                    <span class="question-number">
                        Question ${totalQuestions}
                    </span>

                    <span class="difficulty">
                        ${question.difficulty}
                    </span>

                </div>

                <h3>${question.question}</h3>

                <details>
                    <summary>Reveal Answer</summary>

                    <p class="answer">
                        ${question.answer}
                    </p>

                </details>

                <label class="correct-check">

                    <input
                        type="checkbox"
                        class="correct-checkbox"
                    >

                    I got this correct

                </label>

            `;

            const checkbox =
                questionCard.querySelector(".correct-checkbox");

            checkbox.addEventListener("change", function () {

                if (this.checked) {
                    score++;
                } else {
                    score--;
                }

                updateScore();

            });

            categorySection.appendChild(questionCard);

        });

        container.appendChild(categorySection);

    });

    updateScore();
}


function updateScore() {

    document.getElementById("score").textContent =
        `${score} / ${totalQuestions}`;

    const message =
        document.getElementById("score-message");

    if (score === 0) {

        message.textContent =
            "Let's get started!";

    } else if (score < totalQuestions) {

        message.textContent =
            `${totalQuestions - score} questions still to go.`;

    } else {

        message.textContent =
            "🎉 Perfect score! Excellent work.";

    }
}


loadQuiz();
