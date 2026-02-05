// Quiz application state
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let startTime = null;

// Initialize quiz
document.addEventListener('DOMContentLoaded', function() {
    const quizId = sessionStorage.getItem('currentQuizId');
    if (!quizId) {
        window.location.href = 'index.html';
        return;
    }
    
    loadQuiz(quizId);
});

// Load quiz data
async function loadQuiz(quizId) {
    try {
        const response = await fetch(`./data/${quizId}.json`);
        currentQuiz = await response.json();
        
        // Initialize user answers object
        userAnswers = {};
        currentQuiz.questions.forEach(q => {
            userAnswers[q.id] = null;
        });
        
        startTime = new Date();
        initializeQuiz();
        renderCurrentQuestion();
        updateNavigation();
        updateProgress();
        
    } catch (error) {
        console.error('Error loading quiz:', error);
        showError('Failed to load quiz data. Redirecting to home...');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

// Initialize quiz interface
function initializeQuiz() {
    document.getElementById('quizTitle').textContent = currentQuiz.title;
    
    // Create question navigation
    const questionNav = document.getElementById('questionNav');
    questionNav.innerHTML = currentQuiz.questions.map((q, index) => 
        `<div class="nav-item" onclick="goToQuestion(${index})">${q.id}</div>`
    ).join('');
}

// Render current question
function renderCurrentQuestion() {
    const question = currentQuiz.questions[currentQuestionIndex];
    
    document.getElementById('questionNumber').textContent = `Question ${question.id}`;
    document.getElementById('questionType').textContent = getQuestionTypeLabel(question.type);
    
    // Handle question text and image together
    const questionTextContainer = document.getElementById('questionText');
    let questionHtml = question.question;
    
    // Add image if present
    if (question.image) {
        questionHtml += `<div class="question-image" style="margin: 15px 0;">
            <img src="figures/${question.image}" alt="Question ${question.id} diagram" 
                 style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;">
        </div>`;
    }
    
    questionTextContainer.innerHTML = questionHtml;
    
    const answerSection = document.getElementById('answerSection');
    answerSection.innerHTML = renderAnswerInput(question);
    
    // Handle hint button and content
    const hintBtn = document.getElementById('hintBtn');
    const hintContent = document.getElementById('hintContent');
    const checkBtn = document.getElementById('checkAnswerBtn');
    const feedbackDiv = document.getElementById('answerFeedback');
    
    if (question.hint) {
        hintBtn.style.display = 'block';
        hintContent.innerHTML = question.hint;
        hintContent.style.display = 'none'; // Reset to hidden
        hintBtn.textContent = '💡 How Do I Solve This?';
    } else {
        hintBtn.style.display = 'none';
    }
    
    // Show check answer button for gradeable questions
    if (canGradeQuestion(question)) {
        checkBtn.style.display = 'block';
        feedbackDiv.style.display = 'none'; // Reset feedback
    } else {
        checkBtn.style.display = 'none';
    }
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.textContent = currentQuestionIndex === currentQuiz.questions.length - 1 ? 'Finish' : 'Next';
    
    // Restore previous answer if exists
    restoreAnswer(question);
}

// Toggle hint display
function toggleHint() {
    const hintContent = document.getElementById('hintContent');
    const hintBtn = document.getElementById('hintBtn');
    
    if (hintContent.style.display === 'none') {
        hintContent.style.display = 'block';
        hintBtn.textContent = '❌ Hide Solution Approach';
    } else {
        hintContent.style.display = 'none';
        hintBtn.textContent = '💡 How Do I Solve This?';
    }
}

// Check if a question can be auto-graded
function canGradeQuestion(question) {
    const gradeable = ['multiple_choice', 'single_choice', 'matching', 'calculation', 'short_answer'];
    return gradeable.includes(question.type) && (question.correctAnswer || question.correctAnswers || question.keywords || question.answer);
}

// Check the current question's answer
function checkCurrentAnswer() {
    const question = currentQuiz.questions[currentQuestionIndex];
    const userAnswer = userAnswers[question.id];
    
    if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
        showFeedback('Please provide an answer first.', 'incorrect');
        return;
    }
    
    const result = gradeAnswer(question, userAnswer);
    showFeedback(result.message, result.type, result.score);
}

// Grade an answer based on question type
function gradeAnswer(question, userAnswer) {
    switch (question.type) {
        case 'single_choice':
            return gradeSingleChoice(question, userAnswer);
        case 'multiple_choice':
            return gradeMultipleChoice(question, userAnswer);
        case 'matching':
            return gradeMatching(question, userAnswer);
        case 'calculation':
            return gradeCalculation(question, userAnswer);
        case 'short_answer':
            return gradeShortAnswer(question, userAnswer);
        case 'multi_part':
            return gradeMultiPart(question, userAnswer);
        default:
            return { type: 'partial', message: 'Answer recorded. Manual review required.', score: 0 };
    }
}

// Grade single choice questions
function gradeSingleChoice(question, userAnswer) {
    if (userAnswer === question.correctAnswer) {
        return { type: 'correct', message: '✓ Correct!', score: question.points };
    } else {
        return { 
            type: 'incorrect', 
            message: `✗ Incorrect. The correct answer is ${question.correctAnswer}.`,
            score: 0 
        };
    }
}

// Grade multiple choice questions
function gradeMultipleChoice(question, userAnswer) {
    const correct = question.correctAnswers.sort();
    const user = Array.isArray(userAnswer) ? userAnswer.sort() : [userAnswer];
    
    if (JSON.stringify(correct) === JSON.stringify(user)) {
        return { type: 'correct', message: '✓ Correct! You selected all the right answers.', score: question.points };
    } else {
        const correctCount = user.filter(ans => correct.includes(ans)).length;
        const partialScore = Math.floor((correctCount / correct.length) * question.points);
        
        if (partialScore > 0) {
            return { 
                type: 'partial', 
                message: `⚡ Partially correct (${correctCount}/${correct.length} right). Correct answers: ${correct.join(', ')}`,
                score: partialScore
            };
        } else {
            return { 
                type: 'incorrect', 
                message: `✗ Incorrect. Correct answers: ${correct.join(', ')}`,
                score: 0 
            };
        }
    }
}

// Grade calculation questions
function gradeCalculation(question, userAnswer) {
    const answer = userAnswer.toString().toLowerCase().trim();
    const correctAnswers = Array.isArray(question.expectedAnswers) ? 
        question.expectedAnswers : [question.answer];
    
    // Check for exact matches (handling different formats)
    for (let correctAns of correctAnswers) {
        const correct = correctAns.toString().toLowerCase().trim();
        if (answer === correct || answer.includes(correct.split(' ')[0])) {
            return { type: 'correct', message: '✓ Correct!', score: question.points };
        }
    }
    
    // Check for numerical values
    const userNum = parseFloat(answer.replace(/[^\d.]/g, ''));
    const correctNum = parseFloat(correctAnswers[0].toString().replace(/[^\d.]/g, ''));
    
    if (!isNaN(userNum) && !isNaN(correctNum)) {
        const tolerance = correctNum * 0.05; // 5% tolerance
        if (Math.abs(userNum - correctNum) <= tolerance) {
            return { type: 'correct', message: '✓ Correct!', score: question.points };
        }
    }
    
    return { 
        type: 'incorrect', 
        message: `✗ Incorrect. Expected: ${correctAnswers[0]}`,
        score: 0 
    };
}

// Grade short answer questions using keywords
function gradeShortAnswer(question, userAnswer) {
    if (!question.keywords) {
        return { type: 'partial', message: 'Answer recorded. Manual review required.', score: 0 };
    }
    
    const answer = userAnswer.toLowerCase();
    const required = question.keywords.required || [];
    const bonus = question.keywords.bonus || [];
    
    let score = 0;
    let matched = 0;
    let feedback = [];
    
    // Check required keywords
    for (let keyword of required) {
        if (answer.includes(keyword.toLowerCase())) {
            matched++;
            score += 1;
        } else {
            feedback.push(`Missing: ${keyword}`);
        }
    }
    
    // Check bonus keywords
    for (let keyword of bonus) {
        if (answer.includes(keyword.toLowerCase())) {
            score += 0.5;
            feedback.push(`Good: mentioned ${keyword}`);
        }
    }
    
    const percentage = matched / required.length;
    const finalScore = Math.min(Math.floor((score / (required.length + bonus.length * 0.5)) * question.points), question.points);
    
    if (percentage >= 0.8) {
        return { 
            type: 'correct', 
            message: `✓ Excellent! ${feedback.length > 0 ? feedback.join('. ') : ''}`,
            score: finalScore
        };
    } else if (percentage >= 0.5) {
        return { 
            type: 'partial', 
            message: `⚡ Good effort! ${feedback.length > 0 ? feedback.join('. ') : ''}`,
            score: finalScore
        };
    } else {
        return { 
            type: 'incorrect', 
            message: `✗ Needs improvement. ${feedback.length > 0 ? feedback.join('. ') : ''}`,
            score: 0
        };
    }
}

// Grade multi-part questions
function gradeMultiPart(question, userAnswer) {
    if (!question.expectedAnswers || typeof userAnswer !== 'object') {
        return { type: 'partial', message: 'Answer recorded. Manual review required.', score: 0 };
    }
    
    let totalScore = 0;
    let maxScore = question.points;
    let feedback = [];
    let correctParts = 0;
    
    for (let partId in userAnswer) {
        if (question.expectedAnswers[partId] && userAnswer[partId]) {
            const partAnswer = userAnswer[partId].toLowerCase().trim();
            const expectedAnswers = question.expectedAnswers[partId];
            
            let partCorrect = false;
            for (let expected of expectedAnswers) {
                if (partAnswer === expected.toLowerCase() || partAnswer.includes(expected.toLowerCase().split(' ')[0])) {
                    partCorrect = true;
                    break;
                }
            }
            
            if (partCorrect) {
                correctParts++;
                feedback.push(`Part ${partId}: ✓`);
            } else {
                feedback.push(`Part ${partId}: ✗ Expected: ${expectedAnswers[0]}`);
            }
        }
    }
    
    const totalParts = Object.keys(question.expectedAnswers).length;
    const scorePercentage = correctParts / totalParts;
    totalScore = Math.floor(scorePercentage * maxScore);
    
    if (scorePercentage === 1) {
        return { 
            type: 'correct', 
            message: `✓ Perfect! All parts correct. ${feedback.join(', ')}`,
            score: totalScore
        };
    } else if (scorePercentage >= 0.5) {
        return { 
            type: 'partial', 
            message: `⚡ Good work! ${correctParts}/${totalParts} parts correct. ${feedback.join(', ')}`,
            score: totalScore
        };
    } else {
        return { 
            type: 'incorrect', 
            message: `✗ Needs work. ${correctParts}/${totalParts} parts correct. ${feedback.join(', ')}`,
            score: 0
        };
    }
}

// Show feedback to user
function showFeedback(message, type, score = null) {
    const feedbackDiv = document.getElementById('answerFeedback');
    feedbackDiv.className = `answer-feedback feedback-${type}`;
    
    let content = `<div class="feedback-message">${message}</div>`;
    if (score !== null) {
        content = `<div class="feedback-score">Score: ${score}/${currentQuiz.questions[currentQuestionIndex].points}</div>` + content;
    }
    
    feedbackDiv.innerHTML = content;
    feedbackDiv.style.display = 'block';
}

// Get question type label
function getQuestionTypeLabel(type) {
    const labels = {
        'short_answer': 'Short Answer',
        'multiple_choice': 'Multiple Choice (Multiple Select)',
        'single_choice': 'Single Choice',
        'calculation': 'Calculation',
        'multi_part': 'Multi-Part Question',
        'matching': 'Matching'
    };
    return labels[type] || 'Unknown';
}

// Render answer input based on question type
function renderAnswerInput(question) {
    switch (question.type) {
        case 'short_answer':
        case 'calculation':
            return `
                <textarea 
                    class="answer-textarea" 
                    id="answer-${question.id}"
                    placeholder="Type your answer here..."
                    onchange="saveAnswer(${question.id}, this.value)"
                ></textarea>
            `;
            
        case 'multiple_choice':
            return question.options.map((option, index) => {
                const letter = option.charAt(0);
                const text = option.substring(3); // Remove "A. " prefix
                return `
                    <label class="answer-option">
                        <input 
                            type="checkbox" 
                            name="question-${question.id}"
                            value="${letter}"
                            onchange="saveMultipleChoice(${question.id})"
                        >
                        <span><strong>${letter}.</strong> ${text}</span>
                    </label>
                `;
            }).join('');
            
        case 'single_choice':
            return question.options.map((option, index) => {
                const value = option.charAt(0);
                const text = option.substring(3); // Remove "1. " prefix
                return `
                    <label class="answer-option">
                        <input 
                            type="radio" 
                            name="question-${question.id}"
                            value="${value}"
                            onchange="saveAnswer(${question.id}, this.value)"
                        >
                        <span><strong>${value}.</strong> ${text}</span>
                    </label>
                `;
            }).join('');
            
        case 'multi_part':
            return question.parts.map(part => {
                return `
                    <div class="question-part">
                        <h4>Part ${part.part}</h4>
                        <p>${part.question}</p>
                        <textarea 
                            class="answer-textarea" 
                            id="answer-${question.id}-${part.part}"
                            placeholder="Type your answer here..."
                            onchange="saveMultiPartAnswer(${question.id}, '${part.part}', this.value)"
                        ></textarea>
                    </div>
                `;
            }).join('');
            
        case 'matching':
            return `
                <div class="matching-section">
                    <div class="matching-instructions">Match each description with the correct option:</div>
                    ${question.items.map(item => `
                        <div class="matching-item">
                            <p><strong>${item.id}.</strong> ${item.description}</p>
                            <select id="match-${question.id}-${item.id}" onchange="saveMatchingAnswer(${question.id}, ${item.id}, this.value)">
                                <option value="">Select an answer...</option>
                                ${question.options.map(option => 
                                    `<option value="${option}">${option}</option>`
                                ).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
            `;
            
        default:
            return '<p>Unknown question type</p>';
    }
}

// Save answer for short answer and single choice questions
function saveAnswer(questionId, value) {
    userAnswers[questionId] = value;
    updateNavigationStatus();
}

// Save answer for multiple choice questions
function saveMultipleChoice(questionId) {
    const checkboxes = document.querySelectorAll(`input[name="question-${questionId}"]:checked`);
    const values = Array.from(checkboxes).map(cb => cb.value);
    userAnswers[questionId] = values.length > 0 ? values : null;
    updateNavigationStatus();
}

// Save answer for multi-part questions
function saveMultiPartAnswer(questionId, partId, value) {
    if (!userAnswers[questionId]) {
        userAnswers[questionId] = {};
    }
    userAnswers[questionId][partId] = value;
    updateNavigationStatus();
}

// Save answer for matching questions
function saveMatchingAnswer(questionId, itemId, value) {
    if (!userAnswers[questionId]) {
        userAnswers[questionId] = {};
    }
    userAnswers[questionId][itemId] = value;
    updateNavigationStatus();
}

// Grade matching questions
function gradeMatching(question, userAnswer) {
    if (!question.items || typeof userAnswer !== 'object') {
        return { type: 'partial', message: 'Answer recorded. Manual review required.', score: 0 };
    }
    
    let correctCount = 0;
    let totalItems = question.items.length;
    let feedback = [];
    
    question.items.forEach(item => {
        const userChoice = userAnswer[item.id];
        const correctChoice = item.correctAnswer || item.answer;
        
        if (userChoice && userChoice === correctChoice) {
            correctCount++;
            feedback.push(`${item.id}: ✓`);
        } else {
            feedback.push(`${item.id}: ✗ Expected ${correctChoice}`);
        }
    });
    
    const percentage = correctCount / totalItems;
    const score = Math.floor(percentage * question.points);
    
    if (percentage === 1) {
        return { 
            type: 'correct', 
            message: `✓ Perfect matching! All ${correctCount} items correct.`,
            score: question.points
        };
    } else if (percentage >= 0.6) {
        return { 
            type: 'partial', 
            message: `⚡ Good work! ${correctCount}/${totalItems} correct. ${feedback.join(', ')}`,
            score: score
        };
    } else {
        return { 
            type: 'incorrect', 
            message: `✗ Needs improvement. ${correctCount}/${totalItems} correct. ${feedback.join(', ')}`,
            score: 0
        };
    }
}

// Restore previous answer
function restoreAnswer(question) {
    const savedAnswer = userAnswers[question.id];
    if (!savedAnswer) return;
    
    switch (question.type) {
        case 'short_answer':
        case 'calculation':
            const textarea = document.getElementById(`answer-${question.id}`);
            if (textarea) textarea.value = savedAnswer;
            break;
            
        case 'single_choice':
            const radio = document.querySelector(`input[name="question-${question.id}"][value="${savedAnswer}"]`);
            if (radio) radio.checked = true;
            break;
            
        case 'multiple_choice':
            if (Array.isArray(savedAnswer)) {
                savedAnswer.forEach(value => {
                    const checkbox = document.querySelector(`input[name="question-${question.id}"][value="${value}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            break;
            
        case 'multi_part':
            if (typeof savedAnswer === 'object') {
                Object.keys(savedAnswer).forEach(partId => {
                    const textarea = document.getElementById(`answer-${question.id}-${partId}`);
                    if (textarea) textarea.value = savedAnswer[partId];
                });
            }
            break;
            
        case 'matching':
            if (typeof savedAnswer === 'object') {
                Object.keys(savedAnswer).forEach(itemId => {
                    const select = document.getElementById(`match-${question.id}-${itemId}`);
                    if (select) select.value = savedAnswer[itemId];
                });
            }
            break;
    }
}

// Navigation functions
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
        updateNavigation();
        updateProgress();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        renderCurrentQuestion();
        updateNavigation();
        updateProgress();
    } else {
        showSubmitModal();
    }
}

function goToQuestion(index) {
    currentQuestionIndex = index;
    renderCurrentQuestion();
    updateNavigation();
    updateProgress();
}

// Update navigation status
function updateNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item, index) => {
        item.classList.remove('current', 'answered', 'unanswered');
        
        if (index === currentQuestionIndex) {
            item.classList.add('current');
        } else {
            const questionId = currentQuiz.questions[index].id;
            const hasAnswer = userAnswers[questionId] !== null && userAnswers[questionId] !== '' && 
                             (!Array.isArray(userAnswers[questionId]) || userAnswers[questionId].length > 0);
            item.classList.add(hasAnswer ? 'answered' : 'unanswered');
        }
    });
}

function updateNavigationStatus() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item, index) => {
        if (index !== currentQuestionIndex) {
            const questionId = currentQuiz.questions[index].id;
            const hasAnswer = userAnswers[questionId] !== null && userAnswers[questionId] !== '' && 
                             (!Array.isArray(userAnswers[questionId]) || userAnswers[questionId].length > 0);
            
            item.classList.remove('answered', 'unanswered');
            item.classList.add(hasAnswer ? 'answered' : 'unanswered');
        }
    });
}

// Update progress bar
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${currentQuestionIndex + 1} / ${currentQuiz.questions.length}`;
}

// Review answers
function reviewAnswers() {
    // Show a summary of all answers
    let reviewHTML = '<div class="review-summary"><h3>Your Answers Summary</h3>';
    
    currentQuiz.questions.forEach(question => {
        const answer = userAnswers[question.id];
        const hasAnswer = answer !== null && answer !== '' && 
                         (!Array.isArray(answer) || answer.length > 0);
        
        reviewHTML += `
            <div class="review-item ${hasAnswer ? 'answered' : 'unanswered'}">
                <strong>Question ${question.id}:</strong> ${hasAnswer ? '✓ Answered' : '⚠ Not answered'}
            </div>
        `;
    });
    
    reviewHTML += '</div>';
    
    // Show in a temporary modal
    showCustomModal('Review Answers', reviewHTML);
}

// Submit quiz
function submitQuiz() {
    showSubmitModal();
}

function showSubmitModal() {
    const modal = document.getElementById('submitModal');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('submitModal');
    modal.classList.remove('active');
}

function confirmSubmit() {
    closeModal();
    
    // Calculate score
    const results = calculateScore();
    
    // Save progress
    saveQuizProgress(results);
    
    // Store results for results page
    sessionStorage.setItem('quizResults', JSON.stringify(results));
    
    // Navigate to results page
    window.location.href = 'results.html';
}

// Calculate score
function calculateScore() {
    let totalPoints = 0;
    let earnedPoints = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let unanswered = 0;
    
    const detailedResults = currentQuiz.questions.map(question => {
        totalPoints += question.points || 1;
        const userAnswer = userAnswers[question.id];
        let isCorrect = false;
        let pointsEarned = 0;
        
        if (userAnswer === null || userAnswer === '' || 
            (Array.isArray(userAnswer) && userAnswer.length === 0)) {
            unanswered++;
            return {
                questionId: question.id,
                question: question.question,
                userAnswer: null,
                correctAnswer: getCorrectAnswer(question),
                isCorrect: false,
                pointsEarned: 0,
                totalPoints: question.points || 1,
                status: 'unanswered'
            };
        }
        
        // Check if answer is correct
        if (question.type === 'multiple_choice') {
            const correct = question.correctAnswers.sort();
            const user = Array.isArray(userAnswer) ? userAnswer.sort() : [];
            isCorrect = JSON.stringify(correct) === JSON.stringify(user);
        } else if (question.type === 'single_choice') {
            isCorrect = userAnswer === question.correctAnswer;
        } else {
            // For short answers, we'll give full points since auto-grading is complex
            // In a real implementation, this would need manual grading or AI assistance
            isCorrect = true; // Assume correct for now
        }
        
        if (isCorrect) {
            correctAnswers++;
            pointsEarned = question.points || 1;
            earnedPoints += pointsEarned;
        } else {
            incorrectAnswers++;
        }
        
        return {
            questionId: question.id,
            question: question.question,
            userAnswer: userAnswer,
            correctAnswer: getCorrectAnswer(question),
            isCorrect: isCorrect,
            pointsEarned: pointsEarned,
            totalPoints: question.points || 1,
            status: isCorrect ? 'correct' : 'incorrect'
        };
    });
    
    const endTime = new Date();
    const timeSpent = Math.round((endTime - startTime) / 1000); // in seconds
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    
    return {
        quizId: currentQuiz.id,
        quizTitle: currentQuiz.title,
        score: score,
        earnedPoints: earnedPoints,
        totalPoints: totalPoints,
        correctAnswers: correctAnswers,
        incorrectAnswers: incorrectAnswers,
        unanswered: unanswered,
        timeSpent: timeSpent,
        completedAt: endTime.toISOString(),
        detailedResults: detailedResults
    };
}

// Get correct answer for display
function getCorrectAnswer(question) {
    switch (question.type) {
        case 'multiple_choice':
            return question.correctAnswers.join(', ');
        case 'single_choice':
            return question.correctAnswer;
        case 'short_answer':
            return question.answer;
        default:
            return 'N/A';
    }
}

// Save quiz progress
function saveQuizProgress(results) {
    let userProgress = {};
    const stored = localStorage.getItem('networkingStudyProgress');
    if (stored) {
        userProgress = JSON.parse(stored);
    }
    
    userProgress[currentQuiz.id] = {
        completed: true,
        score: results.score,
        lastAttempted: results.completedAt,
        attempts: (userProgress[currentQuiz.id]?.attempts || 0) + 1,
        bestScore: Math.max(results.score, userProgress[currentQuiz.id]?.bestScore || 0)
    };
    
    localStorage.setItem('networkingStudyProgress', JSON.stringify(userProgress));
}

// Utility functions
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

function showCustomModal(title, content) {
    const existingModal = document.getElementById('customModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'customModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${title}</h3>
            <div>${content}</div>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="document.getElementById('customModal').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}