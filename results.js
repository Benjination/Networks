// Results page functionality
let results = null;

// Initialize results page
document.addEventListener('DOMContentLoaded', function() {
    const resultsData = sessionStorage.getItem('quizResults');
    if (!resultsData) {
        window.location.href = 'index.html';
        return;
    }
    
    results = JSON.parse(resultsData);
    displayResults();
});

// Display quiz results
function displayResults() {
    // Update score summary
    document.getElementById('scoreNumber').textContent = `${results.score}%`;
    document.getElementById('correctCount').textContent = results.correctAnswers;
    document.getElementById('incorrectCount').textContent = results.incorrectAnswers;
    document.getElementById('unansweredCount').textContent = results.unanswered;
    
    // Add score-based styling
    const scoreCircle = document.querySelector('.score-circle');
    if (results.score >= 90) {
        scoreCircle.style.background = 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)';
    } else if (results.score >= 70) {
        scoreCircle.style.background = 'linear-gradient(135deg, #d69e2e 0%, #b7791f 100%)';
    } else {
        scoreCircle.style.background = 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)';
    }
    
    // Show encouragement message based on score
    showEncouragementMessage();
}

// Show encouragement message
function showEncouragementMessage() {
    let message = '';
    let messageClass = '';
    
    if (results.score >= 90) {
        message = '🎉 Excellent work! You have mastered these networking concepts!';
        messageClass = 'success';
    } else if (results.score >= 70) {
        message = '👏 Good job! You have a solid understanding with room for improvement.';
        messageClass = 'good';
    } else if (results.score >= 50) {
        message = '📚 Keep studying! You\'re on the right track but need more practice.';
        messageClass = 'needs-work';
    } else {
        message = '💪 Don\'t give up! Review the material and try again. You can do this!';
        messageClass = 'needs-work';
    }
    
    const encouragementEl = document.createElement('div');
    encouragementEl.className = `encouragement-message ${messageClass}`;
    encouragementEl.innerHTML = `<p>${message}</p>`;
    encouragementEl.style.cssText = `
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 15px;
        padding: 1.5rem;
        margin: 1rem 0;
        text-align: center;
        font-size: 1.1rem;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    `;
    
    // Insert after score summary
    const scoreSummary = document.getElementById('scoreSummary');
    scoreSummary.insertAdjacentElement('afterend', encouragementEl);
}

// Review detailed answers
function reviewDetails() {
    const answerReview = document.getElementById('answerReview');
    const reviewList = document.getElementById('reviewList');
    
    if (answerReview.style.display === 'none' || !answerReview.style.display) {
        // Show detailed review
        reviewList.innerHTML = generateDetailedReview();
        answerReview.style.display = 'block';
        
        // Scroll to review section
        answerReview.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Hide detailed review
        answerReview.style.display = 'none';
    }
}

// Generate detailed review HTML
function generateDetailedReview() {
    return results.detailedResults.map((result, index) => {
        const statusClass = result.status;
        const statusIcon = {
            'correct': '✅',
            'incorrect': '❌',
            'unanswered': '⚠️'
        }[result.status];
        
        let userAnswerDisplay = '';
        if (result.userAnswer === null) {
            userAnswerDisplay = '<em>No answer provided</em>';
        } else if (Array.isArray(result.userAnswer)) {
            userAnswerDisplay = result.userAnswer.join(', ');
        } else {
            userAnswerDisplay = result.userAnswer;
        }
        
        return `
            <div class="review-question ${statusClass}">
                <div class="review-header">
                    <span class="review-icon">${statusIcon}</span>
                    <h3>Question ${result.questionId}</h3>
                    <span class="review-points">${result.pointsEarned}/${result.totalPoints} points</span>
                </div>
                
                <div class="review-content">
                    <p class="review-question-text">${result.question}</p>
                    
                    <div class="review-answers">
                        <div class="review-answer user-answer">
                            <strong>Your Answer:</strong>
                            <p>${userAnswerDisplay}</p>
                        </div>
                        
                        ${result.status !== 'correct' ? `
                            <div class="review-answer correct-answer">
                                <strong>Correct Answer:</strong>
                                <p>${result.correctAnswer}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Navigation functions
function retakeQuiz() {
    // Clear previous results
    sessionStorage.removeItem('quizResults');
    
    // Go back to quiz page with the same quiz ID
    sessionStorage.setItem('currentQuizId', results.quizId);
    window.location.href = 'quiz.html';
}

function goHome() {
    // Clear session data
    sessionStorage.removeItem('quizResults');
    sessionStorage.removeItem('currentQuizId');
    
    window.location.href = 'index.html';
}

// Add some CSS for the review section
const reviewStyles = `
<style>
.answer-review {
    display: none;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 15px;
    padding: 2rem;
    margin-top: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.review-question {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
}

.review-question.correct {
    border-color: #38a169;
    background: rgba(56, 161, 105, 0.05);
}

.review-question.incorrect {
    border-color: #e53e3e;
    background: rgba(229, 62, 62, 0.05);
}

.review-question.unanswered {
    border-color: #d69e2e;
    background: rgba(214, 158, 46, 0.05);
}

.review-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.review-icon {
    font-size: 1.5rem;
}

.review-header h3 {
    flex: 1;
    margin: 0;
    color: #2d3748;
}

.review-points {
    background: #667eea;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 500;
}

.review-question-text {
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 1rem;
}

.review-answers {
    display: grid;
    gap: 1rem;
}

.review-answer {
    padding: 1rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.7);
}

.review-answer strong {
    display: block;
    margin-bottom: 0.5rem;
    color: #4a5568;
}

.user-answer {
    border-left: 4px solid #667eea;
}

.correct-answer {
    border-left: 4px solid #38a169;
}

.encouragement-message.success {
    color: #2f855a;
}

.encouragement-message.good {
    color: #b7791f;
}

.encouragement-message.needs-work {
    color: #c53030;
}
</style>
`;

// Add the styles to the document
document.head.insertAdjacentHTML('beforeend', reviewStyles);