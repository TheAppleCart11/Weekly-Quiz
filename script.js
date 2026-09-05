let score = 0;
let completedQuestions = 0;
let totalQuestions = 0;


// --------------------------------------------------
// Determine which quiz week should be displayed
// --------------------------------------------------

function getQuizWeek() {

    const startDate = new Date("2026-09-09T00:00:00");

    const today = new Date();

    const difference =
        today.getTime() - startDate.getTime();

    const daysSinceStart =
        Math.floor(difference / (1000 * 60 * 60 * 24));

    const week =
        Math.floor(daysSinceStart / 7) + 1;

    return Math.max(1, week);
}


// --------------------------------------------------
// Load the appropriate JSON file
// --------------------------------------------------

async function loadQuiz() {

    try {

        const week = getQuizWeek();

        const response =
            await fetch(`quizzes/week${week}.json`);

        if (!response.ok) {
            throw new Error(
                `Quiz for Week ${week} could not be found.`
            );
        }

        const quiz = await response.json();

        displayQuiz(quiz);

    } catch (error) {

        document.getElementById("quiz-container").innerHTML =
            `
            <div class="error">
                <h2>Quiz unavailable</h2>
                <p>
                    This week's quiz hasn't been published yet.
                </p>
            </div>
            `;

        console.error(error);
    }
}


// --------------------------------------------------
// Display the quiz
// --------------------------------------------------

function displayQuiz(quiz) {

    const container =
        document.getElementById("quiz-container");

    document.getElementById("quiz-title").textContent =
        `Week ${quiz.week} • 25 Questions`;

    document.getElementById("week-number").textContent =
        quiz.week;

    container.innerHTML = "";

    score = 0;
    completedQuestions = 0;
    totalQuestions = 0;


    quiz.categories.forEach((category, categoryIndex) => {

        const categorySection =
            document.createElement("section");

        categorySection.className = "category";


        const categoryTitle =
            document.createElement("h2");

        categoryTitle.textContent =
            `${categoryIndex + 1}. ${category.name}`;

        categorySection.appendChild(categoryTitle);


        category.questions.forEach(question => {

            totalQuestions++;


            const questionCard =
                document.createElement("div");

            questionCard.className =
                "question-card";


            questionCard.innerHTML = `

                <div class="question-header">

                    <span class="question-number">
                        Question ${totalQuestions}
                    </span>

                    <span class="difficulty">
                        ${question.difficulty}
                    </span>

                </div>

                <h3>
                    ${question.question}
                </h3>

                <details>

                    <summary>
                        Reveal Answer
                    </summary>

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
                questionCard.querySelector(
                    ".correct-checkbox"
                );


            checkbox.addEventListener(
                "change",
                function () {

                    if (this.checked) {

                        score++;
                        completedQuestions++;

                    } else {

                        score--;
                        completedQuestions--;

                    }

                    updateScore();

                }
            );


            categorySection.appendChild(
                questionCard
            );

        });


        container.appendChild(
            categorySection
        );

    });


    updateScore();
}


// --------------------------------------------------
// Update score and progress
// --------------------------------------------------

function updateScore() {

    document.getElementById("score").textContent =
        `${score} / ${totalQuestions}`;


    const message =
        document.getElementById("score-message");


    if (completedQuestions === 0) {

        message.textContent =
            "Let's get started!";

    }

    else if (completedQuestions < totalQuestions) {

        message.textContent =
            `Progress: ${completedQuestions} / ${totalQuestions} questions`;

    }

    else if (score === totalQuestions) {

        message.textContent =
            "🎉 Perfect score! Excellent work.";

    }

    else {

        message.textContent =
            `Quiz complete! You scored ${score} / ${totalQuestions}.`;

    }

}


// --------------------------------------------------
// Start the quiz
// --------------------------------------------------

loadQuiz();
