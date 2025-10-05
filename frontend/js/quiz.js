// Configuration
const QUIZ_CONFIG = {
    totalQuestions: 5,
    timePerQuestion: 20, // secondes
    apiUrl: 'http://localhost:5000/api'
};

// État du quiz
let quizState = {
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    timeLeft: QUIZ_CONFIG.timePerQuestion,
    timerInterval: null
};

// Bank de questions (fallback si API offline)
const QUESTIONS_BANK = [
    {
        id: 1,
        type: 'mcq',
        question: "Que mesure le satellite SMAP de la NASA?",
        options: [
            "La température de l'air",
            "L'humidité du sol",
            "La vitesse du vent",
            "La pollution atmosphérique"
        ],
        correct: 1,
        explanation: "SMAP (Soil Moisture Active Passive) mesure l'humidité du sol depuis l'espace à une résolution de 9-36 km. Crucial pour l'irrigation!"
    },
    {
        id: 2,
        type: 'mcq',
        question: "Quelle valeur NDVI indique une végétation très saine?",
        options: [
            "0.1 - 0.3",
            "0.3 - 0.5",
            "0.6 - 0.8",
            "-0.1 - 0.1"
        ],
        correct: 2,
        explanation: "NDVI entre 0.6 et 0.8 indique une végétation dense et en bonne santé. Plus bas = stress ou sol nu."
    },
    {
        id: 3,
        type: 'true_false',
        question: "GPM peut prédire les précipitations jusqu'à 7 jours à l'avance.",
        options: ["Vrai", "Faux"],
        correct: 0,
        explanation: "Vrai! GPM (Global Precipitation Measurement) fournit des prévisions de précipitations qui aident les agriculteurs à planifier irrigation et récoltes."
    },
    {
        id: 4,
        type: 'mcq',
        question: "Votre sol a 15% d'humidité. L'optimal pour le maïs est 25-35%. Que faire?",
        options: [
            "Attendre qu'il pleuve",
            "Irriguer immédiatement",
            "Fertiliser d'abord",
            "Ne rien faire"
        ],
        correct: 1,
        explanation: "Avec seulement 15% d'humidité, le maïs est en stress hydrique sévère. Irrigation immédiate nécessaire avant toute autre action!"
    },
    {
        id: 5,
        type: 'mcq',
        question: "Quelle donnée NASA aide le PLUS à décider du timing de fertilisation?",
        options: [
            "GPM uniquement",
            "SMAP uniquement",
            "MODIS uniquement",
            "Combinaison SMAP + GPM + MODIS"
        ],
        correct: 3,
        explanation: "La meilleure décision combine MODIS (besoin fertilisant?), SMAP (sol assez humide pour absorption?), et GPM (pluie qui lessiverait fertilisant?)."
    }
];

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestions();
    displayQuestion();
    startTimer();
});

// Charger questions
async function loadQuestions() {
    try {
        const response = await fetch(`${QUIZ_CONFIG.apiUrl}/quiz/questions`);
        if (response.ok) {
            quizState.questions = await response.json();
        } else {
            throw new Error('API unavailable');
        }
    } catch (error) {
        console.warn('Using fallback questions');
        quizState.questions = QUESTIONS_BANK;
    }
    
    document.getElementById('total-q').textContent = quizState.questions.length;
}

// Afficher question actuelle
function displayQuestion() {
    const question = quizState.questions[quizState.currentQuestionIndex];
    
    // Mise à jour compteur
    document.getElementById('current-q').textContent = quizState.currentQuestionIndex + 1;
    
    // Mise à jour barre progression
    const progress = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;
    document.getElementById('quiz-progress').style.width = `${progress}%`;
    
    // Afficher question
    document.getElementById('question-text').textContent = question.question;
    
    // Générer options
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = option;
        optionDiv.onclick = () => selectAnswer(index);
        container.appendChild(optionDiv);
    });
    
    // Reset timer
    quizState.timeLeft = QUIZ_CONFIG.timePerQuestion;
}

// Timer
function startTimer() {
    clearInterval(quizState.timerInterval);
    
    quizState.timerInterval = setInterval(() => {
        quizState.timeLeft--;
        
        const timerEl = document.getElementById('timer');
        timerEl.textContent = `${quizState.timeLeft}s`;
        
        // Couleur rouge si <5s
        if (quizState.timeLeft <= 5) {
            timerEl.style.background = '#E74C3C';
            timerEl.style.animation = 'pulse 0.5s infinite';
        }
        
        // Timeout
        if (quizState.timeLeft <= 0) {
            clearInterval(quizState.timerInterval);
            selectAnswer(-1); // Mauvaise réponse
        }
    }, 1000);
}

// Sélection réponse
function selectAnswer(selectedIndex) {
    clearInterval(quizState.timerInterval);
    
    const question = quizState.questions[quizState.currentQuestionIndex];
    const options = document.querySelectorAll('.option');
    
    // Désactiver toutes les options
    options.forEach(opt => opt.onclick = null);
    
    const isCorrect = selectedIndex === question.correct;
    
    // Marquer réponse
    if (selectedIndex >= 0) {
        options[selectedIndex].classList.add(isCorrect ? 'correct' : 'wrong');
    }
    
    // Toujours montrer la bonne réponse
    options[question.correct].classList.add('correct');
    
    // Mise à jour score
    if (isCorrect) {
        quizState.score++;
        document.getElementById('score').textContent = quizState.score;
        playSound('correct');
    } else {
        playSound('wrong');
    }
    
    // Sauvegarder réponse
    quizState.answers.push({
        questionId: question.id,
        selected: selectedIndex,
        correct: question.correct,
        isCorrect: isCorrect
    });
    
    // Afficher explication
    showExplanation(isCorrect, question.explanation);
}

// Afficher explication
function showExplanation(isCorrect, text) {
    const panel = document.getElementById('explanation');
    const icon = document.getElementById('result-icon');
    const title = document.getElementById('result-title');
    const explanation = document.getElementById('explanation-text');
    
    icon.textContent = isCorrect ? '✅' : '❌';
    title.textContent = isCorrect ? 'Bonne réponse!' : 'Réponse incorrecte';
    explanation.textContent = text;
    
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
}

// Question suivante
function nextQuestion() {
    document.getElementById('explanation').style.display = 'none';
    
    quizState.currentQuestionIndex++;
    
    if (quizState.currentQuestionIndex < quizState.questions.length) {
        displayQuestion();
        startTimer();
    } else {
        showResults();
    }
}

// Résultats finaux
function showResults() {
    document.querySelector('.quiz-main').style.display = 'none';
    document.getElementById('quiz-results').style.display = 'block';
    
    const score = quizState.score;
    const total = quizState.questions.length;
    const percentage = (score / total) * 100;
    
    // Afficher score
    document.getElementById('final-score').textContent = score;
    
    // Étoiles
    let stars = '';
    if (percentage === 100) {
        stars = '⭐⭐⭐';
    } else if (percentage >= 80) {
        stars = '⭐⭐';
    } else if (percentage >= 60) {
        stars = '⭐';
    } else {
        stars = '❌';
    }
    document.getElementById('stars-display').textContent = stars;
    
    // Calculer bonus
    let bonus = 0;
    let bonusDesc = '';
    
    if (percentage === 100) {
        bonus = 20;
        bonusDesc = '🌟 Parfait! +20% ressources de départ';
    } else if (percentage >= 80) {
        bonus = 10;
        bonusDesc = '✅ Excellent! +10% ressources de départ';
    } else if (percentage >= 60) {
        bonus = 0;
        bonusDesc = '👍 Bien! Ressources normales';
    } else {
        bonus = -25;
        bonusDesc = '⚠️ À améliorer... -25% ressources de départ';
    }
    
    document.getElementById('bonus-description').textContent = bonusDesc;
    
    const waterBonus = bonus > 0 ? `+${Math.floor(1000 * bonus / 100)}` : `${Math.floor(1000 * bonus / 100)}`;
    const moneyBonus = bonus > 0 ? `+${Math.floor(500 * bonus / 100)}` : `${Math.floor(500 * bonus / 100)}`;
    
    document.getElementById('bonus-water').textContent = `${waterBonus} m³`;
    document.getElementById('bonus-money').textContent = `${moneyBonus} €`;
    
    // Sauvegarder pour game.html

}

// Démarrer jeu
function startGame() {
    window.location.href = 'game.html';
}

// Sons (optionnel)
function playSound(type) {
    // Audio basique ou beep navigateur
    if (type === 'correct') {
        // Beep succès
    } else {
        // Beep erreur
    }
}
