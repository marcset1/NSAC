// ========== CONFIGURATION ==========
const API_URL = 'http://localhost:5000/api';

// État global du jeu
let gameState = {
    currentDay: 1,
    maxDays: 90,
    season: 'spring',
    region: 'Iowa',
    crop: 'corn',
    
    // Ressources
    water: 1000,
    money: 500,
    points: 0,
    
    // État de la culture
    plot: {
        health: 70,
        ndvi: 0.45,
        soilMoisture: 25,
        temperature: 22,
        daysGrown: 0,
        plantedDate: 1
    },
    
    // Statistiques usage NASA
    stats: {
        smapViews: 0,
        gpmViews: 0,
        modisViews: 0,
        totalActions: 0
    },
    
    // Historique actions
    actions: [],
    
    // Données NASA chargées
    nasaData: null,
    currentDayData: null
};

const quizBonus = parseInt(localStorage.getItem('quizBonus') || '0');

// Configuration actions
const ACTIONS_CONFIG = {
    irrigate: {
        waterCost: 100,
        moneyCost: 50,
        effect: { soilMoisture: +15, health: +5 }
    },
    fertilize: {
        waterCost: 0,
        moneyCost: 100,
        effect: { ndvi: +0.1, health: +10 }
    }
};

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 NASA Farm Navigators - Initialisation...');
    
    // Charger bonus quiz si disponible
    const quizBonus = parseInt(localStorage.getItem('quizBonus') || '0');
    
    await initGame(quizBonus);
});

async function initGame(quizBonus = 0) {
    try {
        showNotification('🛰️ Connexion aux satellites NASA...', 'info');
        
        // Charger données NASA depuis l'API
        const response = await fetch(`${API_URL}/game/data`);
        
        if (!response.ok) {
            throw new Error('Erreur de connexion à l\'API');
        }
        
        const data = await response.json();
        gameState.nasaData = data.data;
        
        // Appliquer bonus quiz
        if (quizBonus !== 0) {
            applyQuizBonus(quizBonus);
        }
        
        // Charger premier jour
        loadDayData(1);
        
        // Initialiser UI
        updateUI();
        initForecast();
        initNASAMap();
        
        showNotification('✅ Connexion établie! Bienvenue fermier!', 'success');
        
        // Afficher tutoriel pour nouveaux joueurs
        if (!localStorage.getItem('tutorialShown')) {
            setTimeout(() => showTutorial(), 1000);
        }
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('❌ Erreur de connexion au serveur', 'error');
        
        // Mode démo avec données simulées
        loadDemoMode();
    }
}

function applyQuizBonus(bonus) {
    if (bonus > 0) {
        gameState.water += Math.floor(gameState.water * bonus / 100);
        gameState.money += Math.floor(gameState.money * bonus / 100);
        showNotification(
            `🌟 Bonus Quiz! +${bonus}% ressources de départ`, 
            'success'
        );
    } else if (bonus < 0) {
        gameState.water = Math.floor(gameState.water * (100 + bonus) / 100);
        gameState.money = Math.floor(gameState.money * (100 + bonus) / 100);
        showNotification(
            `⚠️ Malus Quiz: ${bonus}% ressources`, 
            'warning'
        );
    }
}

// ========== GESTION DES JOURS ==========
function loadDayData(day) {
    if (!gameState.nasaData || day > gameState.nasaData.length) {
        console.error('Données non disponibles pour le jour', day);
        return;
    }
    
    gameState.currentDay = day;
    gameState.currentDayData = gameState.nasaData[day - 1];
    
    // Mettre à jour affichage
    updateDayDisplay();
    updateNASAData();
    updatePlotVisual();
    updateRecommendations();
    
    // Vérifier événements spéciaux
    checkDayEvents();
}

function updateDayDisplay() {
    const day = gameState.currentDay;
    const maxDays = gameState.maxDays;
    
    document.getElementById('current-day').textContent = day;
    document.getElementById('max-days').textContent = maxDays;
    
    // Mise à jour barre progression
    const progress = (day / maxDays) * 100;
    document.getElementById('season-progress').style.width = `${progress}%`;
    
    // Mise à jour saison
    updateSeason(day);
}

function updateSeason(day) {
    let season, seasonEmoji;
    
    if (day <= 30) {
        season = 'Printemps';
        seasonEmoji = '🌱';
    } else if (day <= 60) {
        season = 'Été';
        seasonEmoji = '☀️';
    } else {
        season = 'Automne';
        seasonEmoji = '🍂';
    }
    
    gameState.season = season.toLowerCase();
    document.querySelector('.season').textContent = `${seasonEmoji} ${season}`;
}

function nextDay() {
    if (gameState.currentDay >= gameState.maxDays) {
        endGame();
        return;
    }
    
    // Simuler passage du temps
    simulateDayEffects();
    
    // Passer au jour suivant
    gameState.currentDay++;
    gameState.plot.daysGrown++;
    
    loadDayData(gameState.currentDay);
    updateUI();
    
    showNotification(`📅 Jour ${gameState.currentDay} commence`, 'info');
    
    // Animation de transition
    animateDayTransition();
}

function simulateDayEffects() {
    const data = gameState.currentDayData;
    
    // Effet de la météo
    if (data.precipitation > 0) {
        // Pluie ajoute de l'humidité
        gameState.plot.soilMoisture = Math.min(
            40,
            gameState.plot.soilMoisture + (data.precipitation / 5)
        );
        showNotification(`🌧️ Pluie: +${data.precipitation}mm`, 'info');
    }
    
    // Évaporation naturelle
    const evaporation = data.temperature > 25 ? 3 : 2;
    gameState.plot.soilMoisture = Math.max(
        0,
        gameState.plot.soilMoisture - evaporation
    );
    
    // Croissance basée sur conditions
    if (gameState.plot.soilMoisture > 20 && data.temperature > 15) {
        gameState.plot.ndvi = Math.min(
            0.9,
            gameState.plot.ndvi + 0.01
        );
        gameState.plot.health = Math.min(
            100,
            gameState.plot.health + 1
        );
    } else {
        // Stress si conditions mauvaises
        gameState.plot.health = Math.max(
            0,
            gameState.plot.health - 2
        );
    }
    
    // Mettre à jour température
    gameState.plot.temperature = data.temperature;
}

// ========== ACTIONS DU JOUEUR ==========
function showActionModal(actionType) {
    const modal = document.getElementById('action-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm');
    
    let content = '';
    
    if (actionType === 'irrigate') {
        modalTitle.innerHTML = '💧 Irrigation';
        content = `
            <div class="action-modal-content">
                <h4>Données SMAP actuelles:</h4>
                <div class="modal-data-box">
                    <p>Humidité sol: <strong>${gameState.plot.soilMoisture}%</strong></p>
                    <p>Optimal maïs: <strong>25-35%</strong></p>
                    <p class="status-text ${gameState.plot.soilMoisture < 25 ? 'danger' : 'success'}">
                        ${gameState.plot.soilMoisture < 25 ? '⚠️ Irrigation recommandée' : '✅ Humidité correcte'}
                    </p>
                </div>
                
                <h4>Quantité d'irrigation:</h4>
                <div class="slider-container">
                    <input type="range" id="water-amount" min="50" max="200" step="50" value="100" 
                           oninput="updateIrrigationPreview(this.value)">
                    <div class="slider-labels">
                        <span>50 m³</span>
                        <span>200 m³</span>
                    </div>
                </div>
                
                <div id="irrigation-preview" class="preview-box">
                    <p>Quantité: <strong>100 m³</strong></p>
                    <p>Coût: <strong>50 €</strong></p>
                    <p>Effet: Humidité <strong>${gameState.plot.soilMoisture}% → ${gameState.plot.soilMoisture + 15}%</strong></p>
                </div>
                
                <div class="modal-alert info">
                    <span class="alert-icon">💡</span>
                    <span>GPM prévoit ${gameState.currentDayData.precipitation}mm de pluie aujourd'hui</span>
                </div>
            </div>
        `;
        
        confirmBtn.onclick = () => performIrrigation();
        
    } else if (actionType === 'fertilize') {
        modalTitle.innerHTML = '🌾 Fertilisation';
        content = `
            <div class="action-modal-content">
                <h4>Données MODIS actuelles:</h4>
                <div class="modal-data-box">
                    <p>NDVI: <strong>${gameState.plot.ndvi.toFixed(2)}</strong></p>
                    <p>Optimal: <strong>>0.6</strong></p>
                    <p class="status-text ${gameState.plot.ndvi < 0.6 ? 'warning' : 'success'}">
                        ${gameState.plot.ndvi < 0.6 ? '⚠️ Fertilisation recommandée' : '✅ Végétation saine'}
                    </p>
                </div>
                
                <h4>Type de fertilisant:</h4>
                <div class="fertilizer-options">
                    <label class="radio-option">
                        <input type="radio" name="fertilizer" value="nitrogen" checked>
                        <span class="option-content">
                            <strong>Azote (N)</strong>
                            <small>Croissance foliaire - 100€</small>
                        </span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="fertilizer" value="phosphorus">
                        <span class="option-content">
                            <strong>Phosphore (P)</strong>
                            <small>Développement racines - 90€</small>
                        </span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="fertilizer" value="potassium">
                        <span class="option-content">
                            <strong>Potassium (K)</strong>
                            <small>Résistance stress - 95€</small>
                        </span>
                    </label>
                </div>
                
                <div class="modal-alert warning">
                    <span class="alert-icon">⚠️</span>
                    <span>Fertiliser sur sol sec (${gameState.plot.soilMoisture}%) = efficacité réduite!
                    ${gameState.plot.soilMoisture < 20 ? ' Irriguer d\'abord recommandé.' : ''}</span>
                </div>
            </div>
        `;
        
        confirmBtn.onclick = () => performFertilization();
    }
    modalBody.innerHTML = content;
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('action-modal').classList.remove('active');
}

function updateIrrigationPreview(amount) {
    amount = parseInt(amount);
    const cost = amount * 0.5;
    const moistureIncrease = Math.floor(amount / 10);
    const newMoisture = Math.min(40, gameState.plot.soilMoisture + moistureIncrease);
    
    document.getElementById('irrigation-preview').innerHTML = `
        <p>Quantité: <strong>${amount} m³</strong></p>
        <p>Coût: <strong>${cost} €</strong></p>
        <p>Effet: Humidité <strong>${gameState.plot.soilMoisture}% → ${newMoisture}%</strong></p>
    `;
}

function performIrrigation() {
    const amount = parseInt(document.getElementById('water-amount').value);
    const cost = amount * 0.5;
    
    // Vérifier ressources
    if (gameState.water < amount) {
        showNotification('❌ Pas assez d\'eau disponible!', 'error');
        return;
    }
    
    if (gameState.money < cost) {
        showNotification('❌ Pas assez d\'argent!', 'error');
        return;
    }
    
    // Appliquer action
    gameState.water -= amount;
    gameState.money -= cost;
    
    const moistureIncrease = Math.floor(amount / 10);
    gameState.plot.soilMoisture = Math.min(40, gameState.plot.soilMoisture + moistureIncrease);
    gameState.plot.health = Math.min(100, gameState.plot.health + 5);
    
    // Statistiques
    gameState.stats.totalActions++;
    gameState.actions.push({
        day: gameState.currentDay,
        type: 'irrigate',
        amount: amount
    });
    
    // Mettre à jour UI
    updateUI();
    closeModal();
    
    showNotification(`💧 Irrigation effectuée: +${moistureIncrease}% humidité`, 'success');
    animateWaterEffect();
}

function performFertilization() {
    const fertilizerType = document.querySelector('input[name="fertilizer"]:checked').value;
    const cost = fertilizerType === 'nitrogen' ? 100 : (fertilizerType === 'phosphorus' ? 90 : 95);
    
    // Vérifier ressources
    if (gameState.money < cost) {
        showNotification('❌ Pas assez d\'argent!', 'error');
        return;
    }
    
    // Appliquer action
    gameState.money -= cost;
    
    // Efficacité réduite si sol sec
    const efficiency = gameState.plot.soilMoisture < 20 ? 0.5 : 1.0;
    const ndviIncrease = 0.1 * efficiency;
    const healthIncrease = 10 * efficiency;
    
    gameState.plot.ndvi = Math.min(0.9, gameState.plot.ndvi + ndviIncrease);
    gameState.plot.health = Math.min(100, gameState.plot.health + healthIncrease);
    
    // Statistiques
    gameState.stats.totalActions++;
    gameState.actions.push({
        day: gameState.currentDay,
        type: 'fertilize',
        fertilizer: fertilizerType
    });
    
    // Mettre à jour UI
    updateUI();
    closeModal();
    
    if (efficiency < 1.0) {
        showNotification('🌾 Fertilisation effectuée (efficacité réduite - sol sec)', 'warning');
    } else {
        showNotification('🌾 Fertilisation effectuée avec succès!', 'success');
    }
    
    animateGrowthEffect();
}

function observeAndWait() {
    showNotification('🔍 Vous observez attentivement votre parcelle...', 'info');
    
    // Augmenter points NASA pour observation
    gameState.points += 5;
    gameState.stats.totalActions++;
    
    // Afficher insight aléatoire
    const insights = [
        `📡 SMAP indique ${gameState.plot.soilMoisture}% d'humidité`,
        `🌿 MODIS montre NDVI de ${gameState.plot.ndvi.toFixed(2)}`,
        `🌡️ Température actuelle: ${gameState.plot.temperature}°C`,
        `🌧️ GPM prévoit ${gameState.currentDayData.precipitation}mm de pluie`,
    ];
    
    const randomInsight = insights[Math.floor(Math.random() * insights.length)];
    
    setTimeout(() => {
        showNotification(`💡 ${randomInsight}`, 'info');
    }, 1000);
    
    updateUI();
}

// ========== MISE À JOUR UI ==========
function updateUI() {
    // Ressources
    document.getElementById('water-value').textContent = gameState.water;
    document.getElementById('money-value').textContent = gameState.money;
    document.getElementById('points-value').textContent = gameState.points;
    
    // Stats parcelle
    updatePlotStats();
    
    // Barres de progression
    updateProgressBars();
}

function updatePlotStats() {
    const plot = gameState.plot;
    
    // Santé
    document.getElementById('health-value').textContent = `${Math.round(plot.health)}%`;
    document.getElementById('health-bar').style.width = `${plot.health}%`;
    
    // NDVI
    document.getElementById('ndvi-value').textContent = plot.ndvi.toFixed(2);
    const ndviPercent = (plot.ndvi / 1.0) * 100;
    document.getElementById('ndvi-bar').style.width = `${ndviPercent}%`;
    
    // Sol
    document.getElementById('soil-value').textContent = `${Math.round(plot.soilMoisture)}%`;
    document.getElementById('soil-bar').style.width = `${plot.soilMoisture}%`;
    
    // Température
    document.getElementById('temp-value').textContent = `${Math.round(plot.temperature)}°C`;
    
    // Couleurs des barres selon valeurs
    updateBarColors();
}

function updateBarColors() {
    const healthBar = document.getElementById('health-bar');
    const soilBar = document.getElementById('soil-bar');
    const ndviBar = document.getElementById('ndvi-bar');
    
    // Santé: vert si >70, orange si 40-70, rouge si <40
    if (gameState.plot.health > 70) {
        healthBar.style.background = 'var(--success-green)';
    } else if (gameState.plot.health > 40) {
        healthBar.style.background = 'var(--warning-orange)';
    } else {
        healthBar.style.background = 'var(--alert-red)';
    }
    
    // Sol: bleu si 25-35, orange si sous-optimal
    if (gameState.plot.soilMoisture >= 25 && gameState.plot.soilMoisture <= 35) {
        soilBar.style.background = 'var(--water-blue)';
    } else if (gameState.plot.soilMoisture < 25) {
        soilBar.style.background = 'var(--alert-red)';
    } else {
        soilBar.style.background = 'var(--warning-orange)';
    }
    
    // NDVI: vert si >0.6, jaune si 0.4-0.6, orange si <0.4
    if (gameState.plot.ndvi > 0.6) {
        ndviBar.style.background = 'var(--success-green)';
    } else if (gameState.plot.ndvi > 0.4) {
        ndviBar.style.background = 'var(--crop-gold)';
    } else {
        ndviBar.style.background = 'var(--warning-orange)';
    }
}

function updateProgressBars() {
    // Barre progression saison
    const progress = (gameState.currentDay / gameState.maxDays) * 100;
    document.getElementById('season-progress').style.width = `${progress}%`;
    
    document.querySelector('.progress-label').textContent = 
        `Progression saison: ${gameState.currentDay} / ${gameState.maxDays} jours`;
}

// ========== VISUALISATION PARCELLE ==========
function updatePlotVisual() {
    const cropElement = document.getElementById('crop');
    const day = gameState.plot.daysGrown;
    const health = gameState.plot.health;
    
    // Évolution visuelle du maïs selon jours
    let cropIcon;
    if (day < 15) {
        cropIcon = '🌱'; // Semis
    } else if (day < 30) {
        cropIcon = '🌿'; // Jeune plant
    } else if (day < 60) {
        cropIcon = '🌾'; // Croissance
    } else if (day < 80) {
        cropIcon = '🌽'; // Maturation
    } else {
        cropIcon = '🌽'; // Prêt à récolter
    }
    
    cropElement.textContent = cropIcon;
    
    // Taille selon santé
    const scale = 0.8 + (health / 100) * 0.4; // 0.8 à 1.2
    cropElement.style.transform = `scale(${scale})`;
    
    // Couleur selon santé
    if (health < 40) {
        cropElement.style.filter = 'grayscale(0.5) brightness(0.7)';
    } else if (health < 70) {
        cropElement.style.filter = 'grayscale(0.2) brightness(0.85)';
    } else {
        cropElement.style.filter = 'none';
    }
    
    // Météo visuelle
    updateWeatherVisual();
}

function updateWeatherVisual() {
    const sky = document.getElementById('sky');
    const sun = document.getElementById('sun');
    const clouds = document.getElementById('clouds');
    const precipitation = gameState.currentDayData.precipitation;
    const temp = gameState.plot.temperature;
    
    // Couleur ciel selon météo
    if (precipitation > 15) {
        sky.style.background = 'linear-gradient(to bottom, #778899, #B0C4DE)'; // Gris
        clouds.textContent = '☁️☁️☁️';
        sun.style.opacity = '0.3';
    } else if (precipitation > 5) {
        sky.style.background = 'linear-gradient(to bottom, #87CEEB, #B0E0E6)';
        clouds.textContent = '☁️☁️';
        sun.style.opacity = '0.6';
    } else {
        sky.style.background = 'linear-gradient(to bottom, #87CEEB, #87CEEB)';
        clouds.textContent = '☁️';
        sun.style.opacity = '1';
    }
    
    // Soleil selon température
    if (temp > 30) {
        sun.textContent = '🔥'; // Canicule
    } else if (temp > 25) {
        sun.textContent = '☀️'; // Normal
    } else if (temp > 15) {
        sun.textContent = '🌤️'; // Doux
    } else {
        sun.textContent = '⛅'; // Frais
    }
}

// ========== PRÉVISIONS MÉTÉO ==========
function initForecast() {
    updateForecast();
}

function updateForecast() {
    const container = document.getElementById('forecast-container');
    container.innerHTML = '';
    
    // Afficher 7 prochains jours
    for (let i = 0; i < 7; i++) {
        const dayIndex = gameState.currentDay + i;
        
        if (dayIndex > gameState.nasaData.length) break;
        
        const dayData = gameState.nasaData[dayIndex - 1];
        const dayDiv = document.createElement('div');
        dayDiv.className = 'forecast-day';
        
        // Icône météo selon précipitations
        let weatherIcon;
        if (dayData.precipitation > 15) {
            weatherIcon = '🌧️';
        } else if (dayData.precipitation > 5) {
            weatherIcon = '🌦️';
        } else if (dayData.precipitation > 0) {
            weatherIcon = '🌤️';
        } else {
            weatherIcon = '☀️';
        }
        
        dayDiv.innerHTML = `
            <span class="day-label">J+${i}</span>
            <span class="weather-icon">${weatherIcon}</span>
            <span class="rain-amount">${dayData.precipitation.toFixed(1)}mm</span>
        `;
        
        // Highlight si pluie importante
        if (dayData.precipitation > 10) {
            dayDiv.style.background = '#e3f2fd';
            dayDiv.style.border = '2px solid var(--water-blue)';
        }
        
        container.appendChild(dayDiv);
    }
    
    // Incrémenter stats GPM
    gameState.stats.gpmViews++;
}

// ========== DONNÉES NASA ==========
function updateNASAData() {
    const data = gameState.currentDayData;
    
    // SMAP
    document.getElementById('smap-current').textContent = `${data.soil_moisture}%`;
    updateSMAPStatus(data.soil_moisture);
    
    // Mettre à jour marker NDVI
    const ndviPercent = (data.ndvi / 1.0) * 100;
    document.getElementById('ndvi-marker').style.left = `${ndviPercent}%`;
    document.getElementById('modis-ndvi').textContent = data.ndvi.toFixed(2);
    
    // GPM
    document.getElementById('gpm-24h').textContent = `${data.precipitation}mm`;
    updateGPMForecast();
    
    // Incrémenter stats
    gameState.stats.modisViews++;
}

function updateSMAPStatus(moisture) {
    const statusEl = document.getElementById('smap-status');
    
    if (moisture >= 25 && moisture <= 35) {
        statusEl.textContent = '✅ Optimal';
        statusEl.className = 'data-status good';
    } else if (moisture < 20) {
        statusEl.textContent = '🚨 Critique';
        statusEl.className = 'data-status danger';
    } else {
        statusEl.textContent = '⚠️ Sous-optimal';
        statusEl.className = 'data-status warning';
    }
}

function updateGPMForecast() {
    let forecastText = '';
    let daysUntilRain = -1;
    
    // Chercher prochaine pluie significative
    for (let i = 1; i < 7; i++) {
        const dayIndex = gameState.currentDay + i;
        if (dayIndex > gameState.nasaData.length) break;
        
        const dayData = gameState.nasaData[dayIndex - 1];
        if (dayData.precipitation > 10) {
            daysUntilRain = i;
            forecastText = `Pluie prévue dans ${i} jour${i > 1 ? 's' : ''} (${dayData.precipitation.toFixed(1)}mm)`;
            break;
        }
    }
    
    if (daysUntilRain === -1) {
        forecastText = 'Pas de pluie significative prévue (7 jours)';
    }
    
    document.getElementById('gpm-forecast').textContent = forecastText;
}

// ========== ONGLETS NASA ==========
function switchTab(tabName) {
    // Désactiver tous les onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activer l'onglet sélectionné
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Incrémenter stats
    if (tabName === 'smap') gameState.stats.smapViews++;
    if (tabName === 'gpm') gameState.stats.gpmViews++;
    if (tabName === 'modis') gameState.stats.modisViews++;
    
    // Initialiser contenu si nécessaire
    if (tabName === 'smap' && !window.smapMapInitialized) {
        initNASAMap();
    }
}

// ========== CARTE LEAFLET (SMAP) ==========
let smapMap = null;

function initNASAMap() {
    if (window.smapMapInitialized) return;
    
    const mapContainer = document.getElementById('smap-map');
    if (!mapContainer) return;
    
    try {
        // Coordonnées Iowa
        const lat = 42.0;
        const lon = -93.5;
        
        smapMap = L.map('smap-map').setView([lat, lon], 8);
        
        // Fond de carte
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(smapMap);
        
        // Marker ferme
        const farmMarker = L.marker([lat, lon]).addTo(smapMap);
        farmMarker.bindPopup(`
            <b>🏠 Votre Ferme</b><br>
            Humidité: ${gameState.plot.soilMoisture}%<br>
            NDVI: ${gameState.plot.ndvi.toFixed(2)}
        `);
        
        // Cercle représentant zone humidité (simulé)
        const moistureColor = gameState.plot.soilMoisture < 25 ? 'red' : 
                             gameState.plot.soilMoisture > 35 ? 'blue' : 'green';
        
        L.circle([lat, lon], {
            color: moistureColor,
            fillColor: moistureColor,
            fillOpacity: 0.3,
            radius: 5000
        }).addTo(smapMap).bindPopup('Zone de mesure SMAP');
        
        window.smapMapInitialized = true;
        
    } catch (error) {
        console.error('Erreur init map:', error);
        mapContainer.innerHTML = '<p style="padding: 20px; text-align: center;">Carte non disponible</p>';
    }
}

// ========== RECOMMANDATIONS ==========
function updateRecommendations() {
    const list = document.getElementById('recommendations-list');
    list.innerHTML = '';
    
    const recommendations = generateRecommendations();
    
    recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.className = `recommendation ${rec.type}`;
        li.innerHTML = `
            <span class="rec-icon">${rec.icon}</span>
            <span class="rec-text">${rec.text}</span>
        `;
        list.appendChild(li);
    });
}

function generateRecommendations() {
    const recs = [];
    const plot = gameState.plot;
    const data = gameState.currentDayData;
    
    // Sol sec
    if (plot.soilMoisture < 20) {
        recs.push({
            type: 'urgent',
            icon: '🚨',
            text: `SMAP détecte humidité critique (${plot.soilMoisture}%). Irrigation urgente recommandée!`
        });
    } else if (plot.soilMoisture < 25) {
        recs.push({
            type: 'warning',
            icon: '⚠️',
            text: `Humidité sous-optimale détectée par SMAP. Envisager irrigation.`
        });
    }
    
    // Pluie prévue
    let rainSoon = false;
    for (let i = 1; i <= 3; i++) {
        const dayIndex = gameState.currentDay + i;
        if (dayIndex <= gameState.nasaData.length) {
            const futureData = gameState.nasaData[dayIndex - 1];
            if (futureData.precipitation > 10) {
                rainSoon = true;
                recs.push({
                    type: 'info',
                    icon: 'ℹ️',
                    text: `GPM prévoit ${futureData.precipitation.toFixed(1)}mm de pluie dans ${i} jour(s). Vous pouvez économiser l'eau.`
                });
                break;
            }
        }
    }
    
    // NDVI faible
    if (plot.ndvi < 0.5) {
        recs.push({
            type: 'warning',
            icon: '🌾',
            text: `MODIS indique NDVI faible (${plot.ndvi.toFixed(2)}). Fertilisation recommandée.`
        });
    } else if (plot.ndvi > 0.7) {
        recs.push({
            type: 'success',
            icon: '✅',
            text: `MODIS confirme excellente santé végétative (NDVI ${plot.ndvi.toFixed(2)}).`
        });
    }
    
    // Température
    if (plot.temperature > 32) {
        recs.push({
            type: 'warning',
            icon: '🌡️',
            text: `Alerte canicule: ${plot.temperature}°C. Augmenter fréquence irrigation.`
        });
    } else if (plot.temperature < 15) {
        recs.push({
            type: 'info',
            icon: '❄️',
            text: `Température fraîche: ${plot.temperature}°C. Croissance ralentie.`
        });
    }
    
    // Santé générale
    if (plot.health > 80) {
        recs.push({
            type: 'success',
            icon: '🏆',
            text: `Excellente gestion! Santé culture: ${plot.health.toFixed(0)}%`
        });
    } else if (plot.health < 50) {
        recs.push({
            type: 'urgent',
            icon: '🚨',
            text: `Culture en stress! Santé: ${plot.health.toFixed(0)}%. Action immédiate nécessaire.`
        });
    }
    
    // Si aucune recommandation
    if (recs.length === 0) {
        recs.push({
            type: 'success',
            icon: '✅',
            text: 'Conditions optimales. Continuez la surveillance avec les données NASA.'
        });
    }
    
    return recs;
}

// ========== ÉVÉNEMENTS SPÉCIAUX ==========
function checkDayEvents() {
    const day = gameState.currentDay;
    const data = gameState.currentDayData;
    
    // Sécheresse prolongée
    if (gameState.plot.soilMoisture < 15 && data.precipitation === 0) {
        showEvent({
            title: '⚠️ Alerte Sécheresse',
            message: 'SMAP confirme sécheresse sévère. Vos cultures souffrent!',
            type: 'warning'
        });
    }
    
    // Pluie abondante
    if (data.precipitation > 25) {
        showEvent({
            title: '🌧️ Forte Précipitation',
            message: `GPM mesure ${data.precipitation}mm! Risque d'inondation.`,
            type: 'info'
        });
    }
    
    // Canicule
    if (data.temperature > 35) {
        showEvent({
            title: '🔥 Vague de Chaleur',
            message: `${data.temperature}°C détecté! Stress thermique sur les cultures.`,
            type: 'warning'
        });
    }
    
    // Milestone jours
    if (day === 30) {
        showEvent({
            title: '🎉 1 Mois Complété!',
            message: 'Votre maïs entre en phase de croissance active.',
            type: 'success'
        });
        gameState.points += 50;
    }
    
    if (day === 60) {
        showEvent({
            title: '🌽 Phase de Maturation',
            message: 'Vos cultures approchent de la maturité!',
            type: 'success'
        });
        gameState.points += 75;
    }
}

function showEvent(event) {
    // Modal événement personnalisée
    showNotification(`${event.title}: ${event.message}`, event.type);
}

// ========== NOTIFICATIONS ==========
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-text">${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove après 5 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ========== ANIMATIONS ==========
function animateDayTransition() {
    const plotVisual = document.querySelector('.plot-visual');
    plotVisual.style.animation = 'none';
    setTimeout(() => {
        plotVisual.style.animation = 'fadeIn 0.5s ease';
    }, 10);
}

function animateWaterEffect() {
    const cropEl = document.getElementById('crop');
    cropEl.classList.add('pulse-animation');
    
    // Effet de pluie temporaire
    const sky = document.getElementById('sky');
    const rainEffect = document.createElement('div');
    rainEffect.className = 'rain-effect';
    rainEffect.textContent = '💧💧💧';
    rainEffect.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translateX(-50%);
        font-size: 2rem;
        animation: fall 1s ease-out;
    `;
    sky.appendChild(rainEffect);
    
    setTimeout(() => {
        cropEl.classList.remove('pulse-animation');
        rainEffect.remove();
    }, 1000);
}

function animateGrowthEffect() {
    const cropEl = document.getElementById('crop');
    cropEl.style.animation = 'grow 0.5s ease';
    
    setTimeout(() => {
        cropEl.style.animation = 'grow 3s ease-in-out infinite alternate';
    }, 500);
}

// ========== FIN DE JEU ==========
function endGame() {
    // Calculer résultats finaux
    const results = calculateFinalResults();
    
    // Sauvegarder dans localStorage
    localStorage.setItem('gameResults', JSON.stringify(results));
    
    // Rediriger vers écran résultats
    window.location.href = 'results.html';
}

function calculateFinalResults() {
    const plot = gameState.plot;
    
    // Calcul rendement basé sur santé et NDVI
    const baseYield = 5.0; // tonnes/hectare
    const healthFactor = plot.health / 100;
    const ndviFactor = Math.min(plot.ndvi / 0.7, 1.2);
    
    const finalYield = baseYield * healthFactor * ndviFactor;
    
    // Déterminer étoiles
    let stars = 0;
    if (finalYield >= 6.0 && plot.health >= 80 && gameState.water >= 200) {
        stars = 3;
    } else if (finalYield >= 5.0 && plot.health >= 70) {
        stars = 2;
    } else if (finalYield >= 4.0) {
        stars = 1;
    }
    
    return {
        yield: finalYield.toFixed(2),
        health: plot.health.toFixed(0),
        waterUsed: 1000 - gameState.water,
        moneyEarned: gameState.money - 500,
        nasaPoints: gameState.points,
        stars: stars,
        stats: gameState.stats,
        actions: gameState.actions
    };
}

// ========== TUTORIEL ==========
function showTutorial() {
    // Tutoriel simple pour première utilisation
    showNotification('👋 Bienvenue! Consultez les données NASA pour prendre vos décisions.', 'info');
    
    setTimeout(() => {
        showNotification('📡 Onglet SMAP = Humidité du sol', 'info');
    }, 2000);
    
    setTimeout(() => {
        showNotification('🌧️ Onglet GPM = Prévisions pluie', 'info');
    }, 4000);
    
    setTimeout(() => {
        showNotification('🌿 Onglet MODIS = Santé végétation', 'info');
    }, 6000);
    
    localStorage.setItem('tutorialShown', 'true');
}

function showNASAHelp() {
    alert(`📡 AIDE NASA DATA CENTER

🗺️ SMAP (Soil Moisture Active Passive):
Mesure l'humidité du sol depuis l'espace.
Optimal pour maïs: 25-35%

🌧️ GPM (Global Precipitation Measurement):
Mesure les précipitations globales.
Aide à planifier l'irrigation.

🌿 MODIS (Moderate Resolution Imaging Spectroradiometer):
Analyse la santé des cultures via l'indice NDVI.
NDVI > 0.6 = végétation saine

💡 Utilisez ces données pour optimiser vos décisions!`);
}

function showPlotInfo() {
    alert(`🌾 INFORMATIONS PARCELLE

Culture: Maïs 🌽
Jours de croissance: ${gameState.plot.daysGrown}
Santé: ${gameState.plot.health.toFixed(0)}%

Conditions optimales maïs:
- Humidité sol: 25-35%
- Température: 20-28°C
- NDVI: >0.6

État actuel:
- Humidité: ${gameState.plot.soilMoisture}%
- Température: ${gameState.plot.temperature}°C
- NDVI: ${gameState.plot.ndvi.toFixed(2)}

${gameState.plot.health > 70 ? '✅ Culture en bonne santé!' : '⚠️ Culture en stress, action nécessaire!'}`);
}

// ========== MODE DÉMO (Fallback si API offline) ==========
function loadDemoMode() {
    console.warn('⚠️ Mode démo activé - Données simulées');
    
    // Générer données synthétiques
    gameState.nasaData = generateDemoData();
    loadDayData(1);
    updateUI();
    initForecast();
    
    showNotification('⚠️ Mode démo: Données simulées (API offline)', 'warning');
}

function generateDemoData() {
    const data = [];
    
    for (let i = 0; i < 90; i++) {
        // Simuler cycle réaliste
        const dayOfYear = 60 + i; // Commence en mars
        
        // NDVI augmente puis stagne
        let ndvi;
        if (i < 30) {
            ndvi = 0.3 + (i / 30) * 0.3; // 0.3 → 0.6
        } else if (i < 70) {
            ndvi = 0.6 + ((i - 30) / 40) * 0.2; // 0.6 → 0.8
        } else {
            ndvi = 0.8; // Maturation
        }
        
        // Humidité sol varie
        const soilMoisture = 20 + Math.random() * 20; // 20-40%
        
        // Précipitations aléatoires mais réalistes
        const rainProb = Math.random();
        let precipitation;
        if (rainProb < 0.6) {
            precipitation = 0; // 60% pas de pluie
        } else if (rainProb < 0.85) {
            precipitation = 2 + Math.random() * 8; // 25% pluie légère
        } else {
            precipitation = 10 + Math.random() * 20; // 15% pluie forte
        }
        
        // Température saisonnière
        const tempBase = 15 + (i / 90) * 15; // 15°C → 30°C
        const temperature = tempBase + (Math.random() * 6 - 3); // +/- 3°C
        
        data.push({
            day: i + 1,
            date: new Date(2024, 2, 1 + i).toISOString().split('T')[0],
            soil_moisture: parseFloat(soilMoisture.toFixed(2)),
            precipitation: parseFloat(precipitation.toFixed(1)),
            ndvi: parseFloat(ndvi.toFixed(2)),
            temperature: parseFloat(temperature.toFixed(1))
        });
    }
    
    return data;
}

// ========== GRAPHIQUES (Canvas simple) ==========
function initCharts() {
    // Graphique GPM (prévisions)
    drawGPMChart();
    
    // Graphique NDVI historique
    drawNDVIChart();
}

function drawGPMChart() {
    const canvas = document.getElementById('gpm-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 180;
    
    ctx.clearRect(0, 0, width, height);
    
    // Données 7 prochains jours
    const days = [];
    const values = [];
    
    for (let i = 0; i < 7; i++) {
        const dayIndex = gameState.currentDay + i;
        if (dayIndex > gameState.nasaData.length) break;
        
        days.push(`J+${i}`);
        values.push(gameState.nasaData[dayIndex - 1].precipitation);
    }
    
    // Dessiner barres
    const barWidth = width / (days.length * 1.5);
    const maxValue = Math.max(...values, 20);
    
    ctx.fillStyle = '#3498DB';
    
    days.forEach((day, i) => {
        const x = (i + 0.5) * (width / days.length);
        const barHeight = (values[i] / maxValue) * (height - 40);
        const y = height - barHeight - 20;
        
        // Barre
        ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
        
        // Label jour
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(day, x, height - 5);
        
        // Valeur
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${values[i].toFixed(0)}mm`, x, y - 5);
        
        ctx.fillStyle = '#3498DB';
    });
}

function drawNDVIChart() {
    const canvas = document.getElementById('ndvi-history-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 180;
    
    ctx.clearRect(0, 0, width, height);
    
    // Historique NDVI (30 derniers jours)
    const startDay = Math.max(0, gameState.currentDay - 30);
    const endDay = gameState.currentDay;
    
    const values = [];
    for (let i = startDay; i < endDay; i++) {
        if (i < gameState.nasaData.length) {
            values.push(gameState.nasaData[i].ndvi);
        }
    }
    
    if (values.length < 2) return;
    
    // Axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(40, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.stroke();
    
    // Labels Y
    ctx.fillStyle = '#666';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('1.0', 35, 25);
    ctx.fillText('0.5', 35, height / 2);
    ctx.fillText('0.0', 35, height - 25);
    
    // Ligne NDVI
    ctx.strokeStyle = '#27AE60';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const xStep = (width - 60) / (values.length - 1);
    const yScale = (height - 50);
    
    values.forEach((value, i) => {
        const x = 40 + i * xStep;
        const y = height - 30 - (value * yScale);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Points
    ctx.fillStyle = '#27AE60';
    values.forEach((value, i) => {
        const x = 40 + i * xStep;
        const y = height - 30 - (value * yScale);
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Ligne optimale (0.6)
    ctx.strokeStyle = '#F39C12';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    const optimalY = height - 30 - (0.6 * yScale);
    ctx.moveTo(40, optimalY);
    ctx.lineTo(width - 20, optimalY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Label optimal
    ctx.fillStyle = '#F39C12';
    ctx.textAlign = 'left';
    ctx.fillText('Optimal (0.6)', width - 80, optimalY - 5);
}

// Redessiner graphiques à chaque changement de jour
function updateCharts() {
    if (document.getElementById('tab-gpm').classList.contains('active')) {
        drawGPMChart();
    }
    if (document.getElementById('tab-modis').classList.contains('active')) {
        drawNDVIChart();
    }
}

// ========== SAUVEGARDE / CHARGEMENT ==========
function saveGame() {
    try {
        const saveData = {
            gameState: gameState,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('farmNavigatorsSave', JSON.stringify(saveData));
        showNotification('💾 Partie sauvegardée', 'success');
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showNotification('❌ Erreur de sauvegarde', 'error');
    }
}

function loadGame() {
    try {
        const saveData = JSON.parse(localStorage.getItem('farmNavigatorsSave'));
        
        if (saveData && saveData.gameState) {
            gameState = saveData.gameState;
            loadDayData(gameState.currentDay);
            updateUI();
            showNotification('✅ Partie chargée', 'success');
            return true;
        }
    } catch (error) {
        console.error('Erreur chargement:', error);
    }
    
    return false;
}

// Sauvegarde automatique toutes les 5 actions
let actionCounter = 0;
function autoSave() {
    actionCounter++;
    if (actionCounter >= 5) {
        saveGame();
        actionCounter = 0;
    }
}

// ========== RACCOURCIS CLAVIER ==========
document.addEventListener('keydown', (e) => {
    // Espace = jour suivant
    if (e.code === 'Space' && !document.querySelector('.modal.active')) {
        e.preventDefault();
        nextDay();
    }
    
    // W = Irriguer
    if (e.key === 'w' || e.key === 'W') {
        showActionModal('irrigate');
    }
    
    // F = Fertiliser
    if (e.key === 'f' || e.key === 'F') {
        showActionModal('fertilize');
    }
    
    // O = Observer
    if (e.key === 'o' || e.key === 'O') {
        observeAndWait();
    }
    
    // ESC = Fermer modal
    if (e.key === 'Escape') {
        closeModal();
    }
    
    // S = Sauvegarder
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveGame();
    }
});

// ========== GESTION VISIBILITÉ TAB ==========
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page cachée, sauvegarder
        saveGame();
    } else {
        // Page visible, rafraîchir si nécessaire
        updateUI();
    }
});

// ========== RESPONSIVE ==========
window.addEventListener('resize', () => {
    // Redimensionner carte si existe
    if (smapMap) {
        smapMap.invalidateSize();
    }
    
    // Redessiner graphiques
    updateCharts();
});

// ========== EASTER EGGS ==========
let clickCount = 0;
document.getElementById('crop')?.addEventListener('click', () => {
    clickCount++;
    
    if (clickCount === 5) {
        showNotification('🎉 Tu m\'as découvert! +50 points bonus!', 'success');
        gameState.points += 50;
        updateUI();
        clickCount = 0;
    }
});

// ========== PERFORMANCE ==========
// Throttle pour animations lourdes
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = new Date().getTime();
        if (now - lastCall < delay) return;
        lastCall = now;
        return func(...args);
    };
}

// Debounce pour inputs
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// ========== ANALYTICS (Optionnel) ==========
function trackEvent(category, action, label) {
    console.log(`📊 Event: ${category} - ${action} - ${label}`);
    // Intégration Google Analytics ou autre si nécessaire
}

// ========== EXPORT ==========
// Rendre fonctions accessibles globalement pour onclick HTML
window.showActionModal = showActionModal;
window.closeModal = closeModal;
window.confirmAction = function() {
    // Géré par les fonctions spécifiques
};
window.updateIrrigationPreview = updateIrrigationPreview;
window.irrigate = () => showActionModal('irrigate');
window.fertilize = () => showActionModal('fertilize');
window.observeAndWait = observeAndWait;
window.nextDay = nextDay;
window.switchTab = switchTab;
window.showNASAHelp = showNASAHelp;
window.showPlotInfo = showPlotInfo;

// ========== INITIALISATION AU CHARGEMENT ==========
console.log('🎮 Game.js chargé avec succès!');
console.log(localStorage.getItem('quizScore'));      // "4"
console.log(localStorage.getItem('quizTotal'));      // "5"
console.log(localStorage.getItem('quizBonus'));      // "10"
console.log(localStorage.getItem('quizAnswers'));    // "[...]"
