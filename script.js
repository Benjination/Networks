// Main application state
let quizzes = [];
let userProgress = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadQuizzes();
    loadUserProgress();
    updateStats();
    renderQuizzes();
    renderRecentActivity();
});

// Load quiz data
async function loadQuizzes() {
    try {
        const response = await fetch('./data/quizzes.json');
        const data = await response.json();
        quizzes = data.quizzes;
    } catch (error) {
        console.error('Error loading quizzes:', error);
        showError('Failed to load quiz data. Please refresh the page.');
    }
}

// Load user progress from localStorage
function loadUserProgress() {
    const stored = localStorage.getItem('networkingStudyProgress');
    if (stored) {
        userProgress = JSON.parse(stored);
    }
}

// Save user progress to localStorage
function saveUserProgress() {
    localStorage.setItem('networkingStudyProgress', JSON.stringify(userProgress));
}

// Update statistics display
function updateStats() {
    const totalQuizzesEl = document.getElementById('totalQuizzes');
    const completedQuizzesEl = document.getElementById('completedQuizzes');
    const averageScoreEl = document.getElementById('averageScore');

    const totalQuizzes = quizzes.length;
    const completedQuizzes = Object.keys(userProgress).filter(quizId => 
        userProgress[quizId] && userProgress[quizId].completed
    ).length;
    
    const scores = Object.values(userProgress)
        .filter(progress => progress && progress.completed && progress.score !== undefined)
        .map(progress => progress.score);
    
    const averageScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    totalQuizzesEl.textContent = totalQuizzes;
    completedQuizzesEl.textContent = completedQuizzes;
    averageScoreEl.textContent = `${averageScore}%`;
}

// Render quiz cards
function renderQuizzes() {
    const quizGrid = document.getElementById('quizGrid');
    
    if (quizzes.length === 0) {
        quizGrid.innerHTML = '<p class="no-quizzes">No quizzes available yet. Check back soon!</p>';
        return;
    }

    quizGrid.innerHTML = quizzes.map(quiz => {
        const progress = userProgress[quiz.id];
        const isCompleted = progress && progress.completed;
        const score = isCompleted ? progress.score : null;
        
        return `
            <div class="quiz-card" onclick="startQuiz('${quiz.id}')">
                <div class="quiz-card-header">
                    <h3 class="quiz-title">${quiz.title}</h3>
                    <span class="quiz-status ${isCompleted ? 'status-completed' : 'status-new'}">
                        ${isCompleted ? `Completed (${score}%)` : 'New'}
                    </span>
                </div>
                <p class="quiz-description">${quiz.description}</p>
                <div class="quiz-meta">
                    <span>${quiz.totalQuestions} questions</span>
                    <span>${quiz.estimatedTime}</span>
                    <span class="difficulty difficulty-${quiz.difficulty}">${quiz.difficulty}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Render recent activity
function renderRecentActivity() {
    const recentActivityEl = document.getElementById('recentActivity');
    
    const recentActivities = Object.entries(userProgress)
        .filter(([quizId, progress]) => progress && progress.lastAttempted)
        .sort((a, b) => new Date(b[1].lastAttempted) - new Date(a[1].lastAttempted))
        .slice(0, 5);

    if (recentActivities.length === 0) {
        recentActivityEl.innerHTML = '<p class="no-activity">No recent activity. Start a quiz to see your progress here!</p>';
        return;
    }

    recentActivityEl.innerHTML = recentActivities.map(([quizId, progress]) => {
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) return '';
        
        const date = new Date(progress.lastAttempted).toLocaleDateString();
        const status = progress.completed ? `Scored ${progress.score}%` : 'In Progress';
        
        return `
            <div class="activity-item">
                <div class="activity-info">
                    <strong>${quiz.title}</strong>
                    <span class="activity-status">${status}</span>
                </div>
                <span class="activity-date">${date}</span>
            </div>
        `;
    }).join('');
}

// Start a quiz
function startQuiz(quizId) {
    // Store the selected quiz ID for the quiz page
    sessionStorage.setItem('currentQuizId', quizId);
    
    // Navigate to quiz page
    window.location.href = 'quiz.html';
}

// Error handling
function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    errorEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fed7d7;
        color: #c53030;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        border: 1px solid #feb2b2;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 400px;
    `;
    
    document.body.appendChild(errorEl);
    
    setTimeout(() => {
        errorEl.remove();
    }, 5000);
}