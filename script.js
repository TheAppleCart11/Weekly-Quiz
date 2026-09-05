let score = 0;
let completedQuestions = 0;
let totalQuestions = 0;

let currentWeek = 1;
let savedAnswers = [];


// --------------------------------------------------
// Determine which quiz week should be displayed
// --------------------------------------------------

function getQuizWeek() {

    const startDate =
        new Date("2026-09-09T00:00:00");

    const today = new Date();

    const difference =
        today.getTime() - startDate.getTime();

    const daysSinceStart =
        Math.floor(
            difference /
            (1000 * 60 * 60 * 24)
        );

    const week =
        Math.floor(daysSinceStart / 7) + 1;

    return Math.max(1, week);
}


// --------------------------------------------------
// Load the appropriate quiz
// --------------------------------------------------

async function loadQuiz() {

    try {

        currentWeek = getQuizWeek();

        const response =
            await fetch(
                `quizzes/week${currentWeek}.json`
            );

        if (!response.ok) {

            throw new Error(
                `Quiz for Week ${currentWeek} could not be found.`
            );

        }

        const quiz =
            await response.json();

        loadSavedProgress();

        displayQuiz(quiz);

    }

    catch (error) {

        document.getElementById(
            "quiz-container"
        ).innerHTML = `

            <div class="error">

                <h2>Quiz unavailable</h2>

                <p>
                    Something went wrong while loading the quiz.
                </p>

                <p>
                    <strong>Error:</strong>
                    ${error.message}
                </p>

            </div>

        `;

        console.error(
            "Quiz loading error:",
            error
        );

    }

}


// --------------------------------------------------
// Load saved progress
// --------------------------------------------------

function loadSavedProgress() {

    const saved =
        localStorage.getItem(
            `weeklyQuiz_week${currentWeek}`
        );

    if (!saved) {

        savedAnswers = [];

        return;
    }

    try {

        const parsed =
            JSON.parse(saved);

        if (Array.isArray(parsed)) {

            savedAnswers = parsed;

        }

        else {

            savedAnswers = [];

        }

    }

    catch (error) {

        console.warn(
            "Saved progress was invalid and has been reset."
        );

        savedAnswers = [];

        localStorage.removeItem(
            `weeklyQuiz_week${currentWeek}`
        );

    }

}


// --------------------------------------------------
// Save progress
// --------------------------------------------------

function saveProgress() {

    localStorage.setItem(

        `weeklyQuiz_week${currentWeek}`,

        JSON.stringify(savedAnswers)

    );

}


// --------------------------------------------------
// Display the quiz
// --------------------------------------------------

function displayQuiz(quiz) {

    const container =
        document.getElementById(
            "quiz-container"
        );

    document.getElementById(
        "quiz-title"
    ).textContent =
        `Week ${quiz.week} • 25 Questions`;

    document.getElementById(
        "week-number"
    ).textContent =
        quiz.week;

    container.innerHTML = "";

    score = 0;
    completedQuestions = 0;
    totalQuestions = 0;


    // ----------------------------------------------
    // Create all question cards
    // ----------------------------------------------

    quiz.categories.forEach(

        (category, categoryIndex) => {

            const categorySection =
                document.createElement(
                    "section"
                );

            categorySection.className =
                "category";


            const categoryTitle =
                document.createElement(
                    "h2"
                );

            categoryTitle.textContent =
                `${categoryIndex + 1}. ${category.name}`;

            categorySection.appendChild(
                categoryTitle
            );


            category.questions.forEach(

                question => {

                    const questionNumber =
                        totalQuestions;

                    totalQuestions++;


                    const questionCard =
                        document.createElement(
                            "div"
                        );

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


                        <div class="answer-section">

                            <p class="answer-prompt">
                                Did you get it right?
                            </p>

                            <div class="answer-buttons">

                                <button
                                    class="answer-button correct-button"
                                    data-result="correct"
                                >
                                    ✓ Correct
                                </button>

                                <button
                                    class="answer-button incorrect-button"
                                    data-result="incorrect"
                                >
                                    ✗ Incorrect
                                </button>

                            </div>

                        </div>

                    `;


                    // --------------------------------
                    // Restore saved answer
                    // --------------------------------

                    const saved =
                        savedAnswers[
                            questionNumber
                        ];

                    if (
                        saved === true ||
                        saved === false
                    ) {

                        completedQuestions++;

                        if (saved === true) {

                            score++;

                        }

                        updateQuestionAppearance(
                            questionCard,
                            saved
                        );

                    }


                    // --------------------------------
                    // Correct / Incorrect buttons
                    // --------------------------------

                    const buttons =
                        questionCard.querySelectorAll(
                            ".answer-button"
                        );


                    buttons.forEach(

                        button => {

                            button.addEventListener(

                                "click",

                                function () {

                                    const result =
                                        this.dataset.result;

                                    const isCorrect =
                                        result === "correct";

                                    setQuestionResult(

                                        questionNumber,

                                        isCorrect,

                                        questionCard

                                    );

                                }

                            );

                        }

                    );


                    categorySection.appendChild(
                        questionCard
                    );

                }

            );


            container.appendChild(
                categorySection
            );

        }

    );


    updateScore();

}


// --------------------------------------------------
// Set a question as Correct or Incorrect
// --------------------------------------------------

function setQuestionResult(
    questionNumber,
    isCorrect,
    questionCard
) {

    const previousAnswer =
        savedAnswers[questionNumber];


    // ----------------------------------------------
    // If this question hasn't been answered yet
    // ----------------------------------------------

    if (
        previousAnswer !== true &&
        previousAnswer !== false
    ) {

        completedQuestions++;

    }


    // ----------------------------------------------
    // Remove previous correct score
    // if the user changes their answer
    // ----------------------------------------------

    if (previousAnswer === true) {

        score--;

    }


    // ----------------------------------------------
    // Save new answer
    // ----------------------------------------------

    savedAnswers[questionNumber] =
        isCorrect;


    // ----------------------------------------------
    // Add score if correct
    // ----------------------------------------------

    if (isCorrect) {

        score++;

    }


    updateQuestionAppearance(
        questionCard,
        isCorrect
    );


    saveProgress();

    updateScore();

}


// --------------------------------------------------
// Update the visual appearance of a question
// --------------------------------------------------

function updateQuestionAppearance(
    questionCard,
    answer
) {

    const correctButton =
        questionCard.querySelector(
            ".correct-button"
        );

    const incorrectButton =
        questionCard.querySelector(
            ".incorrect-button"
        );


    questionCard.classList.remove(
        "answered",
        "correct",
        "incorrect"
    );

    correctButton.classList.remove(
        "selected"
    );

    incorrectButton.classList.remove(
        "selected"
    );


    if (answer === true) {

        questionCard.classList.add(
            "answered",
            "correct"
        );

        correctButton.classList.add(
            "selected"
        );

    }


    if (answer === false) {

        questionCard.classList.add(
            "answered",
            "incorrect"
        );

        incorrectButton.classList.add(
            "selected"
        );

    }

}


// --------------------------------------------------
// Update score and progress
// --------------------------------------------------

function updateScore() {

    const progressText =
        document.getElementById(
            "progress-text"
        );

    const progressFill =
        document.getElementById(
            "progress-fill"
        );


    progressText.textContent =
        `${completedQuestions} / ${totalQuestions}`;


    const percentage =
        totalQuestions > 0
            ? (completedQuestions / totalQuestions) * 100
            : 0;


    progressFill.style.width =
        `${percentage}%`;


    // ----------------------------------------------
    // Score
    // ----------------------------------------------

    document.getElementById(
        "score"
    ).textContent =
        `${score} / ${totalQuestions}`;


    const scorePercentage =
        totalQuestions > 0
            ? Math.round(
                (score / totalQuestions) * 100
            )
            : 0;


    document.getElementById(
        "score-percentage"
    ).textContent =
        `${scorePercentage}%`;


    // ----------------------------------------------
    // Messages
    // ----------------------------------------------

    const message =
        document.getElementById(
            "score-message"
        );

    const summary =
        document.getElementById(
            "result-summary"
        );


    if (completedQuestions === 0) {

        message.textContent =
            "Let's get started!";

        summary.textContent =
            "Answer each question and mark yourself as correct or incorrect.";

    }


    else if (
        completedQuestions < totalQuestions
    ) {

        message.textContent =
            `You've answered ${completedQuestions} of ${totalQuestions} questions.`;

        summary.textContent =
            `${score} correct • ${completedQuestions - score} incorrect`;

    }


    else if (
        score === totalQuestions
    ) {

        message.textContent =
            "🎉 Perfect score! Excellent work.";

        summary.textContent =
            `All ${totalQuestions} questions correct!`;

    }


    else {

        message.textContent =
            "🎉 Quiz complete!";

        summary.textContent =
            `${score} correct • ${totalQuestions - score} incorrect`;

    }

}


// --------------------------------------------------
// Reset the current quiz
// --------------------------------------------------

function resetQuiz() {

    const confirmed =
        confirm(
            "Are you sure you want to reset this week's quiz?"
        );


    if (!confirmed) {

        return;

    }


    localStorage.removeItem(
        `weeklyQuiz_week${currentWeek}`
    );


    location.reload();

}


// --------------------------------------------------
// Start quiz
// --------------------------------------------------

loadQuiz();
