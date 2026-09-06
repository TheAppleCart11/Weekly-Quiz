let score = 0;
let completedQuestions = 0;
let totalQuestions = 0;

let currentWeek = 1;
let savedAnswers = [];

let currentQuiz = null;

let quizHistory = [];

let questionHistory = {};

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
// Load quiz history
// --------------------------------------------------

function loadQuizHistory() {

    const saved =
        localStorage.getItem(
            "quizHistory"
        );


    if (!saved) {

        quizHistory = [];

        return;

    }


    try {

        const parsed =
            JSON.parse(saved);


        if (Array.isArray(parsed)) {

            quizHistory = parsed;

        }

        else {

            quizHistory = [];

        }

    }

    catch (error) {

        console.warn(
            "Quiz history was invalid and has been reset."
        );

        quizHistory = [];

        localStorage.removeItem(
            "quizHistory"
        );

    }

}

// --------------------------------------------------
// Save quiz history
// --------------------------------------------------

function saveQuizHistory() {

    localStorage.setItem(

        "quizHistory",

        JSON.stringify(quizHistory)

    );

}

// --------------------------------------------------
// Load individual question history
// --------------------------------------------------

function loadQuestionHistory() {

    const saved =
        localStorage.getItem(
            "questionHistory"
        );


    if (!saved) {

        questionHistory = {};

        return;

    }


    try {

        const parsed =
            JSON.parse(saved);


        if (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
        ) {

            questionHistory = parsed;

        }

        else {

            questionHistory = {};

        }

    }

    catch (error) {

        console.warn(
            "Question history was invalid and has been reset."
        );

        questionHistory = {};

        localStorage.removeItem(
            "questionHistory"
        );

    }

}


// --------------------------------------------------
// Save individual question history
// --------------------------------------------------

function saveQuestionHistory() {

    localStorage.setItem(

        "questionHistory",

        JSON.stringify(questionHistory)

    );

}

// --------------------------------------------------
// Calculate adaptive difficulty recommendation
// --------------------------------------------------

function getRecommendedDifficulty(
    categoryName
) {

    const categoryQuestions =
        Object.values(questionHistory)
            .filter(
                question =>
                    question.category ===
                    categoryName
            );

    if (
        categoryQuestions.length === 0
    ) {
        return "Medium";
    }

    let attempts = 0;
    let correct = 0;

    categoryQuestions.forEach(
        question => {

            attempts +=
                question.attempts;

            correct +=
                question.correct;

        }
    );

    if (attempts === 0) {
        return "Medium";
    }

    const accuracy =
        correct / attempts;

    // Very strong performance
    if (accuracy >= 0.85) {
        return "Hard";
    }

    // Moderate performance
    if (accuracy >= 0.65) {
        return "Medium";
    }

    // Needs reinforcement
    return "Easy";

}

// --------------------------------------------------
// Get adaptive difficulty recommendations
// for every category
// --------------------------------------------------

function getAdaptiveRecommendations() {

    const recommendations = {};

    if (!currentQuiz) {
        return recommendations;
    }

    currentQuiz.categories.forEach(
        category => {

            recommendations[
                category.name
            ] =
                getRecommendedDifficulty(
                    category.name
                );

        }
    );

    return recommendations;

}

// --------------------------------------------------
// Calculate streak statistics
// --------------------------------------------------

function getStreakStats() {

    if (quizHistory.length === 0) {

        return {
            current: 0,
            best: 0
        };

    }


    // Sort quizzes by week number

    const weeks =
        [...quizHistory]
            .sort((a, b) => a.week - b.week)
            .map(quiz => quiz.week);


    // Remove duplicate weeks

    const uniqueWeeks =
        [...new Set(weeks)];


    let bestStreak = 1;

    let runningStreak = 1;


    // ----------------------------------------------
    // Find the longest consecutive run
    // ----------------------------------------------

    for (
        let i = 1;
        i < uniqueWeeks.length;
        i++
    ) {

        if (
            uniqueWeeks[i] ===
            uniqueWeeks[i - 1] + 1
        ) {

            runningStreak++;

        }

        else {

            runningStreak = 1;

        }


        if (
            runningStreak > bestStreak
        ) {

            bestStreak =
                runningStreak;

        }

    }


    // ----------------------------------------------
    // Calculate current streak
    // ----------------------------------------------

    const latestWeek =
        uniqueWeeks[
            uniqueWeeks.length - 1
        ];


    let currentStreak = 0;


    /*
       A streak is still active if the most
       recently completed quiz was either:

       - this week
       - last week

       This gives you time to complete the
       current week's quiz.
    */

    if (
        latestWeek >= currentWeek - 1
    ) {

        currentStreak = 1;


        for (
            let i = uniqueWeeks.length - 1;
            i > 0;
            i--
        ) {

            if (
                uniqueWeeks[i] ===
                uniqueWeeks[i - 1] + 1
            ) {

                currentStreak++;

            }

            else {

                break;

            }

        }

    }


    return {

        current: currentStreak,

        best: bestStreak

    };

}

// --------------------------------------------------
// Count perfect weeks
// --------------------------------------------------

function getPerfectWeeks() {

    return quizHistory.filter(

        quiz =>
            quiz.score === quiz.total

    ).length;

}

// --------------------------------------------------
// Record individual question performance
// --------------------------------------------------

function recordQuestionHistory() {

    if (
        !currentQuiz ||
        completedQuestions !== totalQuestions
    ) {
        return;
    }

    let questionIndex = 0;

    currentQuiz.categories.forEach(
        category => {

            category.questions.forEach(
                question => {

                    const answer =
                        savedAnswers[
                            questionIndex
                        ];

                    const isCorrect =
                        answer === true;

                    if (question.id) {

                        if (
                            !questionHistory[
                                question.id
                            ]
                        ) {

                            questionHistory[
                                question.id
                            ] = {

                                question:
                                    question.question,

                                category:
                                    category.name,

                                difficulty:
                                    question.difficulty,

                                attempts: 0,

                                correct: 0,

                                incorrect: 0,

                                lastAnswered:
                                    null
                            };
                        }

                        const history =
                            questionHistory[
                                question.id
                            ];

                        history.attempts++;

                        if (isCorrect) {

                            history.correct++;

                        } else {

                            history.incorrect++;

                        }

                        history.lastAnswered =
                            new Date()
                                .toISOString();
                    }

                    questionIndex++;

                }
            );

        }
    );

    saveQuestionHistory();

}

// --------------------------------------------------
// Check whether question history has been recorded
// for this week's quiz
// --------------------------------------------------

function hasRecordedQuestionHistory() {

    return localStorage.getItem(
        `questionHistoryRecorded_week${currentWeek}`
    ) === "true";

}

// --------------------------------------------------
// Mark this week's question history as recorded
// --------------------------------------------------

function markQuestionHistoryRecorded() {

    localStorage.setItem(
        `questionHistoryRecorded_week${currentWeek}`,
        "true"
    );

}

// --------------------------------------------------
// Save completed quiz result
// --------------------------------------------------

function saveCompletedQuiz() {

    if (
        !currentQuiz ||
        completedQuestions !== totalQuestions
    ) {
        return;
    }


    const categoryResults = {};

    const difficultyResults = {

        Easy: {
            correct: 0,
            total: 0
        },

        Medium: {
            correct: 0,
            total: 0
        },

        Hard: {
            correct: 0,
            total: 0
        }

    };


    let questionIndex = 0;


    currentQuiz.categories.forEach(

        category => {

            let categoryCorrect = 0;

            const categoryTotal =
                category.questions.length;


            const categoryDifficulties = {

                Easy: {
                    correct: 0,
                    total: 0
                },

                Medium: {
                    correct: 0,
                    total: 0
                },

                Hard: {
                    correct: 0,
                    total: 0
                }

            };


            category.questions.forEach(

                question => {

                    const answer =
                        savedAnswers[
                            questionIndex
                        ];


                    const difficulty =
                        question.difficulty;


                    const isCorrect =
                        answer === true;


                    // ----------------------------------
                    // Category score
                    // ----------------------------------

                    if (isCorrect) {

                        categoryCorrect++;

                    }


                    // ----------------------------------
                    // Overall difficulty performance
                    // ----------------------------------

                    if (
                        difficultyResults[
                            difficulty
                        ]
                    ) {

                        difficultyResults[
                            difficulty
                        ].total++;


                        if (isCorrect) {

                            difficultyResults[
                                difficulty
                            ].correct++;

                        }

                    }


                    // ----------------------------------
                    // Category + difficulty performance
                    // ----------------------------------

                    if (
                        categoryDifficulties[
                            difficulty
                        ]
                    ) {

                        categoryDifficulties[
                            difficulty
                        ].total++;


                        if (isCorrect) {

                            categoryDifficulties[
                                difficulty
                            ].correct++;

                        }

                    }


                    questionIndex++;

                }

            );


            categoryResults[
                category.name
            ] = {

                correct:
                    categoryCorrect,

                total:
                    categoryTotal,

                difficulties:
                    categoryDifficulties

            };

        }

    );


    const result = {

        week:
            currentQuiz.week,

        title:
            currentQuiz.title,

        score:
            score,

        total:
            totalQuestions,

        percentage:
            Math.round(
                (
                    score /
                    totalQuestions
                ) * 100
            ),

        completedAt:
            new Date()
                .toISOString(),

        categories:
            categoryResults,

        difficulties:
            difficultyResults

    };


    // --------------------------------------------------
    // Update existing result for this week,
    // or add a new one
    // --------------------------------------------------

    const existingResultIndex =
        quizHistory.findIndex(
            quizResult =>
                quizResult.week ===
                currentQuiz.week
        );


    if (existingResultIndex !== -1) {

        quizHistory[
            existingResultIndex
        ] = result;

    } else {

        quizHistory.push(
            result
        );

    }


    // --------------------------------------------------
    // Save weekly quiz history
    // --------------------------------------------------

    saveQuizHistory();


    // --------------------------------------------------
    // Record individual question history only once
    // for this weekly quiz
    // --------------------------------------------------

    if (
        !hasRecordedQuestionHistory()
    ) {

        recordQuestionHistory();

        markQuestionHistoryRecorded();

    }


    // --------------------------------------------------
    // Refresh statistics display
    // --------------------------------------------------

    displayStatistics();

}

// --------------------------------------------------
// Display score chart
// --------------------------------------------------

function displayScoreChart() {

    const canvas =
        document.getElementById(
            "score-chart"
        );


    if (!canvas) {
        return;
    }


    if (quizHistory.length === 0) {
        return;
    }


    const sortedHistory =
        [...quizHistory].sort(
            (a, b) => a.week - b.week
        );


    const labels =
        sortedHistory.map(
            quiz => `Week ${quiz.week}`
        );


    const scores =
        sortedHistory.map(
            quiz => quiz.percentage
        );


    // Remove an existing chart before
    // creating a new one

    if (window.scoreChart) {

        window.scoreChart.destroy();

    }


    window.scoreChart =
        new Chart(canvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {

                        label: "Score",

                        data: scores,

                        tension: 0.25,

                        fill: false

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    y: {

                        min: 0,

                        max: 100,

                        ticks: {

                            callback:
                                value => `${value}%`

                        }

                    }

                }

            }

        });

}

// --------------------------------------------------
// Display recent quizzes
// --------------------------------------------------

function displayRecentQuizzes() {

    const container =
        document.getElementById(
            "recent-quizzes"
        );


    if (!container) {
        return;
    }


    if (quizHistory.length === 0) {

        container.innerHTML =
            "<p>No completed quizzes yet.</p>";

        return;

    }


    const sortedHistory =
        [...quizHistory]
            .sort(
                (a, b) => b.week - a.week
            )
            .slice(0, 5);


    container.innerHTML = "";


    sortedHistory.forEach(

        quiz => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "recent-quiz";


            const title =
                quiz.title ||
                "Weekly Quiz";


            item.innerHTML = `

                <div>

                    <div class="recent-quiz-title">

                        Week ${quiz.week}

                    </div>

                    <div>

                        ${title}

                    </div>

                </div>


                <div class="recent-quiz-score">

                    ${quiz.score} /
                    ${quiz.total}

                    (${quiz.percentage}%)

                </div>

            `;


            container.appendChild(
                item
            );

        }

    );

}

// --------------------------------------------------
// Display statistics
// --------------------------------------------------

function displayStatistics() {

    const completedElement =
        document.getElementById(
            "quizzes-completed"
        );


    const averageElement =
        document.getElementById(
            "average-score"
        );


    const questionsElement =
        document.getElementById(
            "questions-answered"
        );

    const currentStreakElement =
    document.getElementById(
        "current-streak"
        );
    
    
    const bestStreakElement =
        document.getElementById(
            "best-streak"
        );
    
    
    const perfectWeeksElement =
        document.getElementById(
            "perfect-weeks"
        );


    if (!completedElement) {

        return;

    console.log(
        "Adaptive difficulty:",
        getAdaptiveRecommendations()
    );

    }


    // ----------------------------------------------
    // No history yet
    // ----------------------------------------------

    if (quizHistory.length === 0) {
    
        completedElement.textContent = "0";
    
        averageElement.textContent = "0%";
    
        questionsElement.textContent = "0";
    
        currentStreakElement.textContent = "0";
    
        bestStreakElement.textContent = "0";
    
        perfectWeeksElement.textContent = "0";
    
        displayAchievements();
    
        return;
    
    }


    // ----------------------------------------------
    // Basic totals
    // ----------------------------------------------

    const totalQuizzes =
        quizHistory.length;


    const totalQuestionsAnswered =
        quizHistory.reduce(

            (total, quiz) =>
                total + quiz.total,

            0

        );


    const averageScore =
        Math.round(

            quizHistory.reduce(

                (total, quiz) =>
                    total + quiz.percentage,

                0

            ) / totalQuizzes

        );

    const streakStats =
        getStreakStats();
    
    
    const perfectWeeks =
        getPerfectWeeks();


    completedElement.textContent =
        totalQuizzes;


    averageElement.textContent =
        `${averageScore}%`;


    questionsElement.textContent =
        totalQuestionsAnswered;

    currentStreakElement.textContent =
        streakStats.current;
    
    
    bestStreakElement.textContent =
        streakStats.best;
    
    
    perfectWeeksElement.textContent =
        perfectWeeks;


    displayWeeklyHistory();

    displayCategoryHistory();

    displayAchievements();

    displayScoreChart();

    displayRecentQuizzes();

}

// --------------------------------------------------
// Display achievements
// --------------------------------------------------

function displayAchievements() {

    const container =
        document.getElementById(
            "achievements"
        );


    if (!container) {

        return;

    }


    const streakStats =
        getStreakStats();


    const perfectWeeks =
        getPerfectWeeks();


    const achievements = [

        {
            icon: "🏅",

            name: "First Quiz",

            description:
                "Complete your first weekly quiz.",

            unlocked:
                quizHistory.length >= 1

        },


        {
            icon: "🔥",

            name: "3 Week Streak",

            description:
                "Complete 3 consecutive weekly quizzes.",

            unlocked:
                streakStats.best >= 3

        },


        {
            icon: "🔥",

            name: "5 Week Streak",

            description:
                "Complete 5 consecutive weekly quizzes.",

            unlocked:
                streakStats.best >= 5

        },


        {
            icon: "💯",

            name: "Perfect Score",

            description:
                "Score 25 / 25 on a weekly quiz.",

            unlocked:
                perfectWeeks >= 1

        },


        {
            icon: "📚",

            name: "Quiz Veteran",

            description:
                "Complete 10 weekly quizzes.",

            unlocked:
                quizHistory.length >= 10

        },


        {
            icon: "🏆",

            name: "Perfect Month",

            description:
                "Complete 4 consecutive weekly quizzes with no missed weeks.",

            unlocked:
                streakStats.best >= 4

        }

    ];


    container.innerHTML = "";


    achievements.forEach(

        achievement => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "achievement " +
                (
                    achievement.unlocked
                        ? "unlocked"
                        : "locked"
                );


            item.innerHTML = `

                <span class="achievement-icon">
                    ${achievement.icon}
                </span>

                <span class="achievement-name">
                    ${achievement.name}
                </span>

                <span class="achievement-description">
                    ${achievement.description}
                </span>

            `;


            container.appendChild(
                item
            );

        }

    );

}

// --------------------------------------------------
// Display weekly history
// --------------------------------------------------

function displayWeeklyHistory() {

    const container =
        document.getElementById(
            "weekly-history"
        );


    if (!container) {

        return;

    }


    if (quizHistory.length === 0) {

        container.innerHTML =
            "<p>No completed quizzes yet.</p>";

        return;

    }


    const sortedHistory =
        [...quizHistory].sort(

            (a, b) =>
                a.week - b.week

        );


    container.innerHTML = "";


    sortedHistory.forEach(

        quiz => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "week-history-item";


            item.innerHTML = `

                <span>
                    Week ${quiz.week}
                </span>

                <span class="week-score">
                    ${quiz.score} / ${quiz.total}
                    (${quiz.percentage}%)
                </span>

            `;


            container.appendChild(item);

        }

    );

}

// --------------------------------------------------
// Display category history
// --------------------------------------------------

function displayCategoryHistory() {

    const container =
        document.getElementById(
            "category-history"
        );


    if (!container) {

        return;

    }


    const categories = {};


    // ----------------------------------------------
    // Combine all historical results
    // ----------------------------------------------

    quizHistory.forEach(

        quiz => {

            Object.entries(
                quiz.categories
            ).forEach(

                ([name, result]) => {

                    if (!categories[name]) {

                        categories[name] = {

                            correct: 0,

                            total: 0

                        };

                    }


                    categories[name].correct +=
                        result.correct;


                    categories[name].total +=
                        result.total;

                }

            );

        }

    );


    container.innerHTML = "";


    // ----------------------------------------------
    // Display each category
    // ----------------------------------------------

    Object.entries(categories).forEach(

        ([name, result]) => {

            const percentage =
                Math.round(

                    (
                        result.correct /
                        result.total
                    ) * 100

                );


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "category-history-item";


            item.innerHTML = `

                <div class="category-history-header">

                    <span>
                        ${name}
                    </span>

                    <span>
                        ${percentage}%
                    </span>

                </div>


                <div class="category-bar">

                    <div
                        class="category-bar-fill"
                        style="width: ${percentage}%"
                    ></div>

                </div>

            `;


            container.appendChild(item);

        }

    );

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

    currentQuiz = quiz;

    loadQuizHistory();

    loadQuestionHistory();

    displayStatistics();    

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

    if (
        completedQuestions === totalQuestions &&
        totalQuestions > 0
    ) {
        saveCompletedQuiz();
    }
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
