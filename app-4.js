// PHY107 CBT Practice - 30 questions, 15 minutes
// Simplified single-exam format

let currentUser = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let flaggedQuestions = new Set();
let timer = null;
let timeRemaining = 0;
let questionsDatabase = null;

const EXAM_CONFIG = {
    questions: 30,
    time: 15 * 60
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestionsDatabase();
    loadUserSession();
});

async function loadQuestionsDatabase() {
    try {
        const response = await fetch('questions.json');
        questionsDatabase = await response.json();
        console.log('Loaded:', questionsDatabase.all?.length, 'questions');
    } catch (error) {
        alert('Error loading questions!');
    }
}

function login() {
    const name = document.getElementById('studentName').value.trim();
    const dept = document.getElementById('studentDept').value.trim();
    
    if (!name || !dept) {
        alert('Please enter name and department');
        return;
    }
    
    currentUser = { name, department: dept };
    localStorage.setItem('phy107User', JSON.stringify(currentUser));
    
    showPage('startPage');
    document.getElementById('welcomeNameStart').textContent = name;
}

function loadUserSession() {
    const saved = localStorage.getItem('phy107User');
    if (saved) {
        currentUser = JSON.parse(saved);
        showPage('startPage');
        document.getElementById('welcomeNameStart').textContent = currentUser.name;
    }
}

function startExam() {
    const pool = questionsDatabase.all || [];
    if (pool.length < 30) {
        alert(`Only ${pool.length} questions available`);
        return;
    }
    
    // Fisher-Yates shuffle
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    currentQuestions = shuffled.slice(0, 30);
    
    currentQuestionIndex = 0;
    userAnswers = {};
    flaggedQuestions = new Set();
    timeRemaining = 15 * 60;
    
    showPage('examPage');
    startTimer();
    loadQuestion();
    buildQuestionGrid();
}

function loadQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('examProgress').textContent = `Question ${currentQuestionIndex + 1} of 30`;
    document.getElementById('questionNumber').textContent = `Question ${currentQuestionIndex + 1}`;
    document.getElementById('questionText').textContent = q.question;
    
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    
    Object.entries(q.options).forEach(([key, value]) => {
        const div = document.createElement('div');
        div.className = 'option';
        if (userAnswers[currentQuestionIndex] === key) div.classList.add('selected');
        
        div.innerHTML = `
            <input type="radio" name="answer" value="${key}" ${userAnswers[currentQuestionIndex] === key ? 'checked' : ''}>
            <span class="option-label">${key}.</span>
            <span class="option-text">${value}</span>
        `;
        
        div.onclick = () => {
            div.querySelector('input').checked = true;
            selectAnswer(key);
        };
        container.appendChild(div);
    });
    
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.innerHTML = currentQuestionIndex === 29 ? 
        '<i class="fas fa-flag-checkered"></i> Finish' : 
        'Next <i class="fas fa-arrow-right"></i>';
    
    updateQuestionGrid();
}

function selectAnswer(option) {
    userAnswers[currentQuestionIndex] = option;
    document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    updateQuestionGrid();
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < 29) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        submitExam();
    }
}

function flagQuestion() {
    if (flaggedQuestions.has(currentQuestionIndex)) {
        flaggedQuestions.delete(currentQuestionIndex);
    } else {
        flaggedQuestions.add(currentQuestionIndex);
    }
    updateQuestionGrid();
}

function buildQuestionGrid() {
    const grid = document.getElementById('questionGrid');
    grid.innerHTML = '';
    for (let i = 0; i < 30; i++) {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.textContent = i + 1;
        item.onclick = () => {
            currentQuestionIndex = i;
            loadQuestion();
        };
        grid.appendChild(item);
    }
}

function updateQuestionGrid() {
    document.querySelectorAll('.grid-item').forEach((item, i) => {
        item.classList.remove('answered', 'flagged', 'current');
        if (i === currentQuestionIndex) item.classList.add('current');
        if (userAnswers[i]) item.classList.add('answered');
        if (flaggedQuestions.has(i)) item.classList.add('flagged');
    });
}

function startTimer() {
    updateTimerDisplay();
    timer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining === 3 * 60) alert('⚠️ 3 minutes left!');
        if (timeRemaining <= 0) {
            clearInterval(timer);
            alert('Time up!');
            gradeExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    document.getElementById('timerDisplay').textContent = `${m}:${s.toString().padStart(2,'0')}`;
    if (timeRemaining <= 3 * 60) document.getElementById('timer').classList.add('warning');
}

function submitExam() {
    const unanswered = 30 - Object.keys(userAnswers).length;
    if (unanswered > 0 && !confirm(`${unanswered} unanswered. Submit?`)) return;
    if (!confirm('Submit exam?')) return;
    if (timer) clearInterval(timer);
    gradeExam();
}

function gradeExam() {
    let correct = 0;
    currentQuestions.forEach((q, i) => {
        if (userAnswers[i] === q.correct_answer) correct++;
    });
    
    const percentage = Math.round((correct / 30) * 100);
    const result = { correct, wrong: 30 - correct, percentage, timestamp: new Date() };
    
    const history = JSON.parse(localStorage.getItem(`phy107_${currentUser.name}`) || '[]');
    history.push(result);
    localStorage.setItem(`phy107_${currentUser.name}`, JSON.stringify(history));
    
    showResults(result);
}

function showResults(result) {
    showPage('resultsPage');
    document.getElementById('scorePercentage').textContent = result.percentage + '%';
    document.getElementById('correctCount').textContent = result.correct;
    document.getElementById('wrongCount').textContent = result.wrong;
    
    const verdict = document.getElementById('verdict');
    verdict.className = result.percentage >= 50 ? 'verdict pass' : 'verdict fail';
    verdict.innerHTML = result.percentage >= 50 ?
        `<i class="fas fa-check-circle"></i> Good job! ${result.percentage}%` :
        `<i class="fas fa-times-circle"></i> Keep practicing! ${result.percentage}%`;
}

function reviewAnswers() {
    const review = document.getElementById('reviewContent');
    review.innerHTML = '';
    
    currentQuestions.forEach((q, i) => {
        const userAns = userAnswers[i];
        const correct = userAns === q.correct_answer;
        
        const item = document.createElement('div');
        item.className = `review-item ${correct ? 'correct' : 'wrong'}`;
        item.innerHTML = `
            <div class="review-question"><strong>Q${i+1}:</strong> ${q.question}</div>
            <div class="review-answer ${correct ? 'correct-answer' : 'wrong-answer'}">
                Your: ${userAns ? userAns + '. ' + q.options[userAns] : 'Not answered'}
            </div>
            ${!correct ? `<div class="review-answer correct-answer">Correct: ${q.correct_answer}. ${q.options[q.correct_answer]}</div>` : ''}
            <div class="ai-explanation"><p>${q.explanation}</p></div>
        `;
        review.appendChild(item);
    });
    
    showPage('reviewPage');
}

function backToResults() { showPage('resultsPage'); }
function retakeExam() { if(confirm('New exam?')) location.reload(); }
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

window.addEventListener('beforeunload', e => {
    if (document.getElementById('examPage').classList.contains('active')) {
        e.preventDefault();
        e.returnValue = '';
    }
});
