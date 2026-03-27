/* =============================================
   Daily Fitness Activities - app.js
   100+ Functions | Full PWA Logic
   ============================================= */

'use strict';

// =============================================
// 1. APP STATE & STORAGE
// =============================================

const APP_VERSION = '1.2.0';
const STORAGE_KEY = 'fitdaily_data';

let state = {
  user: { name: 'Athlete', age: 25, weight: 70, height: 170, gender: 'male', goal: 'fitness' },
  today: getTodayKey(),
  exercises: [],
  water: { glasses: 0, goal: 8, glassSize: 250 },
  meals: [],
  sleep: { hours: 0, quality: 0 },
  mood: null,
  streak: 0,
  lastActive: null,
  notificationsEnabled: false,
  reminderInterval: 60,
  theme: 'dark',
  weightLog: [],
  history: {},
  achievements: [],
  settings: {
    sound: true,
    vibration: true,
    waterReminder: true,
    exerciseReminder: true,
    dailySummary: true,
    reminderTime: '08:00'
  }
};

let notificationTimers = {};
let reminderTimer = null;
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;
let currentPage = 'home';
let currentTab = 'exercises';

// =============================================
// 2. STORAGE FUNCTIONS
// =============================================

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save error:', e);
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = deepMerge(state, saved);
    }
    checkDayReset();
  } catch (e) {
    console.error('Load error:', e);
  }
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function resetTodayData() {
  const todayKey = getTodayKey();
  if (state.today !== todayKey) {
    saveHistoryEntry();
    state.today = todayKey;
    state.exercises = getDefaultExercises();
    state.water = { glasses: 0, goal: state.water.goal || 8, glassSize: state.water.glassSize || 250 };
    state.meals = [];
    state.sleep = { hours: 0, quality: 0 };
    state.mood = null;
    updateStreak();
    saveData();
  }
}

function checkDayReset() {
  const todayKey = getTodayKey();
  if (state.today && state.today !== todayKey) {
    resetTodayData();
  } else if (!state.today) {
    state.today = todayKey;
    if (!state.exercises || state.exercises.length === 0) {
      state.exercises = getDefaultExercises();
    }
  }
}

function saveHistoryEntry() {
  const key = state.today;
  state.history[key] = {
    exercises: state.exercises.filter(e => e.completed).length,
    totalExercises: state.exercises.length,
    water: state.water.glasses,
    waterGoal: state.water.goal,
    meals: state.meals.length,
    sleep: state.sleep.hours,
    mood: state.mood,
    calories: calculateTotalCalories(),
    completionPct: getDailyCompletionPercent()
  };
}

function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
  state = getDefaultState();
  state.exercises = getDefaultExercises();
  renderAll();
  showToast('All data cleared', 'info', 'trash');
}

function getDefaultState() {
  return {
    user: { name: 'Athlete', age: 25, weight: 70, height: 170, gender: 'male', goal: 'fitness' },
    today: getTodayKey(),
    exercises: [],
    water: { glasses: 0, goal: 8, glassSize: 250 },
    meals: [],
    sleep: { hours: 0, quality: 0 },
    mood: null,
    streak: 0,
    lastActive: null,
    notificationsEnabled: false,
    reminderInterval: 60,
    theme: 'dark',
    weightLog: [],
    history: {},
    achievements: [],
    settings: {
      sound: true, vibration: true, waterReminder: true,
      exerciseReminder: true, dailySummary: true, reminderTime: '08:00'
    }
  };
}

function exportData() {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fitdaily-backup-${getTodayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported successfully', 'success', 'download');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      state = deepMerge(state, imported);
      saveData();
      renderAll();
      showToast('Data imported successfully', 'success', 'check');
    } catch {
      showToast('Invalid backup file', 'error', 'exclamation-triangle');
    }
  };
  reader.readAsText(file);
}

// =============================================
// 3. DATE & TIME UTILITIES
// =============================================

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getDayName(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatSeconds(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

function isWeekend() {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// =============================================
// 4. EXERCISE FUNCTIONS
// =============================================

function getDefaultExercises() {
  return [
    { id: 'ex1', name: 'Push-Ups', sets: 3, reps: 15, duration: 10, calories: 80, completed: false, category: 'strength', icon: 'fas fa-hand-rock', color: 'green' },
    { id: 'ex2', name: 'Squats', sets: 4, reps: 20, duration: 12, calories: 90, completed: false, category: 'strength', icon: 'fas fa-running', color: 'blue' },
    { id: 'ex3', name: 'Plank', sets: 3, reps: 1, duration: 5, calories: 30, completed: false, category: 'core', icon: 'fas fa-arrows-alt-h', color: 'orange' },
    { id: 'ex4', name: 'Jumping Jacks', sets: 3, reps: 30, duration: 8, calories: 60, completed: false, category: 'cardio', icon: 'fas fa-bolt', color: 'red' },
    { id: 'ex5', name: 'Lunges', sets: 3, reps: 12, duration: 10, calories: 70, completed: false, category: 'strength', icon: 'fas fa-shoe-prints', color: 'purple' },
    { id: 'ex6', name: 'Mountain Climbers', sets: 3, reps: 20, duration: 8, calories: 65, completed: false, category: 'cardio', icon: 'fas fa-mountain', color: 'green' },
    { id: 'ex7', name: 'Burpees', sets: 3, reps: 10, duration: 10, calories: 100, completed: false, category: 'cardio', icon: 'fas fa-fire', color: 'red' },
    { id: 'ex8', name: 'Bicep Curls', sets: 3, reps: 15, duration: 8, calories: 40, completed: false, category: 'strength', icon: 'fas fa-dumbbell', color: 'blue' },
  ];
}

function toggleExercise(id) {
  const ex = state.exercises.find(e => e.id === id);
  if (!ex) return;
  ex.completed = !ex.completed;
  ex.completedAt = ex.completed ? new Date().toISOString() : null;
  saveData();
  renderExerciseList();
  renderStats();
  renderProgressRing();
  if (ex.completed) {
    celebrateExercise(ex);
    checkExerciseAchievements();
  }
  scheduleReminderIfNeeded();
}

function addCustomExercise(data) {
  const ex = {
    id: 'cex_' + Date.now(),
    name: data.name,
    sets: parseInt(data.sets) || 3,
    reps: parseInt(data.reps) || 10,
    duration: parseInt(data.duration) || 5,
    calories: parseInt(data.calories) || 50,
    completed: false,
    category: data.category || 'custom',
    icon: getCategoryIcon(data.category),
    color: 'green',
    custom: true
  };
  state.exercises.push(ex);
  saveData();
  renderExerciseList();
  renderStats();
  showToast(`${ex.name} added!`, 'success', 'plus');
}

function removeExercise(id) {
  state.exercises = state.exercises.filter(e => e.id !== id);
  saveData();
  renderExerciseList();
  renderStats();
  showToast('Exercise removed', 'info', 'trash');
}

function editExercise(id, data) {
  const ex = state.exercises.find(e => e.id === id);
  if (!ex) return;
  Object.assign(ex, data);
  saveData();
  renderExerciseList();
  showToast('Exercise updated', 'success', 'check');
}

function markAllExercisesDone() {
  state.exercises.forEach(e => {
    if (!e.completed) { e.completed = true; e.completedAt = new Date().toISOString(); }
  });
  saveData();
  renderExerciseList();
  renderStats();
  renderProgressRing();
  triggerConfetti();
  showToast('All exercises completed! Great job!', 'success', 'trophy');
}

function resetExercises() {
  state.exercises.forEach(e => { e.completed = false; e.completedAt = null; });
  saveData();
  renderExerciseList();
  renderStats();
  renderProgressRing();
  showToast('Exercises reset', 'info', 'undo');
}

function getCompletedExercisesCount() {
  return state.exercises.filter(e => e.completed).length;
}

function getTotalCaloriesBurned() {
  return state.exercises.filter(e => e.completed).reduce((sum, e) => sum + (e.calories || 0), 0);
}

function getCategoryIcon(cat) {
  const icons = {
    strength: 'fas fa-dumbbell',
    cardio: 'fas fa-bolt',
    core: 'fas fa-arrows-alt-h',
    flexibility: 'fas fa-child',
    custom: 'fas fa-star'
  };
  return icons[cat] || 'fas fa-star';
}

function getExercisesByCategory(cat) {
  return state.exercises.filter(e => e.category === cat);
}

function calculateTotalExerciseTime() {
  return state.exercises.filter(e => e.completed).reduce((sum, e) => sum + (e.duration || 0), 0);
}

function getIncompleteExercises() {
  return state.exercises.filter(e => !e.completed);
}

function celebrateExercise(ex) {
  showToast(`${ex.name} done! +${ex.calories} cal burned`, 'success', 'check-circle');
  if (state.settings.vibration && navigator.vibrate) navigator.vibrate([50, 30, 50]);
}

// =============================================
// 5. WATER TRACKING FUNCTIONS
// =============================================

function addWater(amount = 1) {
  if (state.water.glasses >= state.water.goal) {
    showToast('Daily water goal already reached!', 'info', 'info-circle');
    return;
  }
  state.water.glasses = Math.min(state.water.glasses + amount, state.water.goal);
  saveData();
  renderWaterTracker();
  renderStats();
  checkWaterAchievements();
  if (state.water.glasses >= state.water.goal) {
    showToast('Water goal reached! Stay hydrated!', 'success', 'tint');
    triggerConfetti();
  } else {
    const remaining = state.water.goal - state.water.glasses;
    showToast(`${state.water.glasses * state.water.glassSize}ml done. ${remaining} glasses to go!`, 'info', 'tint');
  }
}

function removeWater() {
  if (state.water.glasses <= 0) return;
  state.water.glasses--;
  saveData();
  renderWaterTracker();
  renderStats();
  showToast('Water entry removed', 'info', 'minus');
}

function setWaterGoal(goal) {
  state.water.goal = parseInt(goal) || 8;
  saveData();
  renderWaterTracker();
  showToast(`Water goal set to ${state.water.goal} glasses`, 'success', 'tint');
}

function setGlassSize(size) {
  state.water.glassSize = parseInt(size) || 250;
  saveData();
  renderWaterTracker();
}

function getWaterProgress() {
  return state.water.goal > 0 ? (state.water.glasses / state.water.goal) * 100 : 0;
}

function getTotalWaterMl() {
  return state.water.glasses * state.water.glassSize;
}

function getWaterRemaining() {
  return Math.max(0, state.water.goal - state.water.glasses);
}

function resetWater() {
  state.water.glasses = 0;
  saveData();
  renderWaterTracker();
  renderStats();
  showToast('Water tracking reset', 'info', 'undo');
}

function waterCompletionPercent() {
  return Math.round(getWaterProgress());
}

// =============================================
// 6. MEAL / NUTRITION FUNCTIONS
// =============================================

function addMeal(data) {
  const meal = {
    id: 'meal_' + Date.now(),
    name: data.name,
    calories: parseInt(data.calories) || 0,
    protein: parseInt(data.protein) || 0,
    carbs: parseInt(data.carbs) || 0,
    fat: parseInt(data.fat) || 0,
    type: data.type || 'snack',
    time: data.time || formatTime(new Date()),
    notes: data.notes || ''
  };
  state.meals.push(meal);
  saveData();
  renderMealList();
  renderStats();
  showToast(`${meal.name} logged! ${meal.calories} kcal`, 'success', 'utensils');
  checkNutritionAchievements();
}

function removeMeal(id) {
  state.meals = state.meals.filter(m => m.id !== id);
  saveData();
  renderMealList();
  renderStats();
  showToast('Meal removed', 'info', 'trash');
}

function calculateTotalCalories() {
  return state.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
}

function calculateTotalProtein() {
  return state.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
}

function calculateTotalCarbs() {
  return state.meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
}

function calculateTotalFat() {
  return state.meals.reduce((sum, m) => sum + (m.fat || 0), 0);
}

function getCalorieBalance() {
  const burned = getTotalCaloriesBurned();
  const consumed = calculateTotalCalories();
  return consumed - burned;
}

function getMealsByType(type) {
  return state.meals.filter(m => m.type === type);
}

function getCalorieGoal() {
  const w = state.user.weight || 70;
  const h = state.user.height || 170;
  const a = state.user.age || 25;
  const bmr = state.user.gender === 'male'
    ? 88.36 + (13.4 * w) + (4.8 * h) - (5.7 * a)
    : 447.6 + (9.2 * w) + (3.1 * h) - (4.3 * a);
  return Math.round(bmr * 1.55);
}

// =============================================
// 7. SLEEP TRACKING FUNCTIONS
// =============================================

function logSleep(hours, quality) {
  state.sleep = {
    hours: parseFloat(hours) || 0,
    quality: parseInt(quality) || 0,
    loggedAt: new Date().toISOString()
  };
  saveData();
  renderSleepSection();
  checkSleepAchievements();
  const msg = getSleepMessage(hours);
  showToast(msg, getSleepToastType(hours), 'moon');
}

function getSleepMessage(hours) {
  if (hours >= 8) return `${hours}h sleep. Well-rested!`;
  if (hours >= 6) return `${hours}h sleep. Try for 8h.`;
  return `Only ${hours}h sleep. Rest is crucial for recovery!`;
}

function getSleepToastType(hours) {
  if (hours >= 8) return 'success';
  if (hours >= 6) return 'warning';
  return 'error';
}

function getSleepQualityLabel(q) {
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
  return labels[q] || 'Not logged';
}

function getWeeklySleepAverage() {
  const keys = Object.keys(state.history).slice(-7);
  if (keys.length === 0) return 0;
  const total = keys.reduce((sum, k) => sum + (state.history[k]?.sleep || 0), 0);
  return (total / keys.length).toFixed(1);
}

// =============================================
// 8. MOOD TRACKING FUNCTIONS
// =============================================

function logMood(mood) {
  state.mood = { type: mood, time: new Date().toISOString() };
  saveData();
  renderMoodSection();
  showToast(`Mood logged: ${getMoodLabel(mood)}`, 'success', 'heart');
}

function getMoodLabel(mood) {
  const labels = { great: 'Feeling Great', good: 'Good', okay: 'Okay', bad: 'Not Great', terrible: 'Terrible' };
  return labels[mood] || mood;
}

function getMoodIcon(mood) {
  const icons = {
    great: 'fa-grin-stars',
    good: 'fa-smile',
    okay: 'fa-meh',
    bad: 'fa-frown',
    terrible: 'fa-tired'
  };
  return icons[mood] || 'fa-meh';
}

function getMoodColor(mood) {
  const colors = { great: '#00d4aa', good: '#0084ff', okay: '#f1c40f', bad: '#ff6b35', terrible: '#ff3366' };
  return colors[mood] || '#8899bb';
}

// =============================================
// 9. BMI & HEALTH CALCULATIONS
// =============================================

function calculateBMI(weight, height) {
  const h = height / 100;
  return (weight / (h * h)).toFixed(1);
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#0084ff' };
  if (bmi < 25) return { label: 'Normal Weight', color: '#00d4aa' };
  if (bmi < 30) return { label: 'Overweight', color: '#f1c40f' };
  return { label: 'Obese', color: '#ff3366' };
}

function getIdealWeight(height, gender) {
  const h = height - 100;
  return gender === 'male' ? Math.round(h * 0.9) : Math.round(h * 0.85);
}

function calculateBMR() {
  const { weight, height, age, gender } = state.user;
  if (gender === 'male') return Math.round(88.36 + (13.4 * weight) + (4.8 * height) - (5.7 * age));
  return Math.round(447.6 + (9.2 * weight) + (3.1 * height) - (4.3 * age));
}

function calculateTDEE(activityLevel = 1.55) {
  return Math.round(calculateBMR() * activityLevel);
}

function getDailyWaterNeed() {
  return Math.round((state.user.weight * 35) / 1000 * 10) / 10;
}

function getProteinNeed() {
  return Math.round(state.user.weight * 1.6);
}

function getBodyFatEstimate() {
  const bmi = parseFloat(calculateBMI(state.user.weight, state.user.height));
  const { age, gender } = state.user;
  const bf = gender === 'male'
    ? (1.2 * bmi) + (0.23 * age) - 16.2
    : (1.2 * bmi) + (0.23 * age) - 5.4;
  return Math.max(0, Math.round(bf));
}

// =============================================
// 10. WEIGHT LOG FUNCTIONS
// =============================================

function logWeight(weight, date) {
  state.weightLog.push({
    weight: parseFloat(weight),
    date: date || getTodayKey(),
    time: formatTime(new Date())
  });
  state.user.weight = parseFloat(weight);
  saveData();
  renderWeightChart();
  showToast(`Weight logged: ${weight} kg`, 'success', 'weight');
}

function getWeightChange() {
  if (state.weightLog.length < 2) return 0;
  const first = state.weightLog[0].weight;
  const last = state.weightLog[state.weightLog.length - 1].weight;
  return (last - first).toFixed(1);
}

function getWeightTrend() {
  const change = parseFloat(getWeightChange());
  if (change < -0.5) return { label: 'Losing', color: '#00d4aa', icon: 'arrow-down' };
  if (change > 0.5) return { label: 'Gaining', color: '#ff6b35', icon: 'arrow-up' };
  return { label: 'Stable', color: '#0084ff', icon: 'minus' };
}

function removeWeightEntry(index) {
  state.weightLog.splice(index, 1);
  saveData();
  renderWeightChart();
  showToast('Weight entry removed', 'info', 'trash');
}

// =============================================
// 11. STREAK & ACHIEVEMENT FUNCTIONS
// =============================================

function updateStreak() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().split('T')[0];
  const yesterdayData = state.history[yKey];
  if (yesterdayData && yesterdayData.completionPct >= 50) {
    state.streak++;
  } else if (!yesterdayData) {
    state.streak = 0;
  }
  saveData();
}

function getDailyCompletionPercent() {
  const total = state.exercises.length + state.water.goal;
  const done = getCompletedExercisesCount() + state.water.glasses;
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function checkExerciseAchievements() {
  const done = getCompletedExercisesCount();
  if (done >= 1 && !hasAchievement('first_exercise')) unlockAchievement('first_exercise');
  if (done >= state.exercises.length && !hasAchievement('all_exercises')) unlockAchievement('all_exercises');
  if (getTotalCaloriesBurned() >= 300 && !hasAchievement('300_calories')) unlockAchievement('300_calories');
}

function checkWaterAchievements() {
  if (state.water.glasses >= state.water.goal && !hasAchievement('water_goal')) unlockAchievement('water_goal');
  if (state.water.glasses >= state.water.goal * 1.5 && !hasAchievement('hydration_hero')) unlockAchievement('hydration_hero');
}

function checkSleepAchievements() {
  if (state.sleep.hours >= 8 && !hasAchievement('good_sleep')) unlockAchievement('good_sleep');
}

function checkNutritionAchievements() {
  if (state.meals.length >= 3 && !hasAchievement('three_meals')) unlockAchievement('three_meals');
}

function checkStreakAchievements() {
  if (state.streak >= 7 && !hasAchievement('week_streak')) unlockAchievement('week_streak');
  if (state.streak >= 30 && !hasAchievement('month_streak')) unlockAchievement('month_streak');
}

function hasAchievement(id) {
  return state.achievements.includes(id);
}

function unlockAchievement(id) {
  if (hasAchievement(id)) return;
  state.achievements.push(id);
  saveData();
  const a = ACHIEVEMENTS.find(a => a.id === id);
  if (a) {
    showToast(`Achievement unlocked: ${a.name}`, 'success', 'trophy');
    triggerConfetti();
  }
}

const ACHIEVEMENTS = [
  { id: 'first_exercise', name: 'First Rep', desc: 'Complete your first exercise', icon: 'fa-star' },
  { id: 'all_exercises', name: 'Full Workout', desc: 'Complete all exercises in a day', icon: 'fa-trophy' },
  { id: '300_calories', name: 'Calorie Crusher', desc: 'Burn 300+ calories', icon: 'fa-fire' },
  { id: 'water_goal', name: 'Hydrated', desc: 'Reach daily water goal', icon: 'fa-tint' },
  { id: 'hydration_hero', name: 'Hydration Hero', desc: 'Drink 150% of water goal', icon: 'fa-water' },
  { id: 'good_sleep', name: 'Well Rested', desc: '8+ hours of sleep', icon: 'fa-moon' },
  { id: 'three_meals', name: 'Balanced Diet', desc: 'Log 3 meals in a day', icon: 'fa-utensils' },
  { id: 'week_streak', name: '7-Day Streak', desc: '7 days in a row', icon: 'fa-calendar-check' },
  { id: 'month_streak', name: 'Monthly Champion', desc: '30-day streak', icon: 'fa-crown' },
];

// =============================================
// 12. NOTIFICATION FUNCTIONS
// =============================================

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Notifications not supported in this browser', 'error', 'bell-slash');
    return false;
  }
  const permission = await Notification.requestPermission();
  state.notificationsEnabled = permission === 'granted';
  saveData();
  if (permission === 'granted') {
    showToast('Notifications enabled!', 'success', 'bell');
    hidNotifBanner();
    startReminderSchedule();
    return true;
  } else {
    showToast('Notification permission denied', 'error', 'bell-slash');
    return false;
  }
}

function sendNotification(title, body, tag = 'fitness') {
  if (!state.notificationsEnabled) return;
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SEND_NOTIFICATION',
      payload: { title, body, tag }
    });
  } else if (Notification.permission === 'granted') {
    new Notification(title, { body, tag, icon: './icon-192.png' });
  }
}

function startReminderSchedule() {
  clearAllTimers();
  const interval = (state.reminderInterval || 60) * 60 * 1000;
  reminderTimer = setInterval(() => {
    checkAndSendReminders();
  }, interval);
  scheduleReminderIfNeeded();
}

function checkAndSendReminders() {
  const incomplete = getIncompleteExercises();
  const waterLeft = getWaterRemaining();
  if (incomplete.length > 0) {
    sendNotification(
      'Daily Fitness Activities',
      `You still have ${incomplete.length} exercise(s) to complete today. Keep going!`,
      'exercise-reminder'
    );
  }
  if (waterLeft > 0) {
    sendNotification(
      'Stay Hydrated!',
      `You need ${waterLeft} more glass(es) of water today. (${getTotalWaterMl()}ml done)`,
      'water-reminder'
    );
  }
}

function scheduleReminderIfNeeded() {
  if (!state.notificationsEnabled) return;
  const incomplete = getIncompleteExercises();
  const waterLeft = getWaterRemaining();
  if (incomplete.length === 0 && waterLeft === 0) {
    clearTimeout(notificationTimers['pending']);
    return;
  }
  clearTimeout(notificationTimers['pending']);
  notificationTimers['pending'] = setTimeout(() => {
    checkAndSendReminders();
  }, (state.reminderInterval || 60) * 60 * 1000);
}

function clearAllTimers() {
  if (reminderTimer) clearInterval(reminderTimer);
  Object.values(notificationTimers).forEach(t => clearTimeout(t));
  notificationTimers = {};
}

function setReminderInterval(minutes) {
  state.reminderInterval = parseInt(minutes) || 60;
  saveData();
  if (state.notificationsEnabled) startReminderSchedule();
  showToast(`Reminder set every ${state.reminderInterval} minutes`, 'success', 'clock');
}

function sendTestNotification() {
  sendNotification('Test Notification', 'Daily Fitness Activities is working!', 'test');
  showToast('Test notification sent', 'info', 'paper-plane');
}

function hidNotifBanner() {
  const banner = document.getElementById('notifBanner');
  if (banner) banner.classList.add('hidden');
}

function showNotifBannerIfNeeded() {
  if (!state.notificationsEnabled && Notification.permission !== 'denied') {
    const banner = document.getElementById('notifBanner');
    if (banner) banner.classList.remove('hidden');
  }
}

// =============================================
// 13. HEALTH TIPS ENGINE
// =============================================

const HEALTH_TIPS = [
  { tip: "Drink a glass of water first thing in the morning to kickstart your metabolism.", cat: "hydration", icon: "tint" },
  { tip: "Take the stairs instead of the elevator to add extra steps to your day.", cat: "activity", icon: "walking" },
  { tip: "Aim for at least 7-9 hours of sleep for optimal muscle recovery and focus.", cat: "sleep", icon: "moon" },
  { tip: "Include protein in every meal to support muscle repair and keep you full longer.", cat: "nutrition", icon: "egg" },
  { tip: "Warm up for 5-10 minutes before any workout to prevent injuries.", cat: "exercise", icon: "fire" },
  { tip: "Stretch for 10 minutes after your workout to improve flexibility.", cat: "flexibility", icon: "child" },
  { tip: "Take a 5-minute walk every hour if you sit for long periods.", cat: "activity", icon: "shoe-prints" },
  { tip: "Eat more colorful vegetables - each color provides different vital nutrients.", cat: "nutrition", icon: "leaf" },
  { tip: "Reduce sugar intake to lower risk of diabetes and maintain energy levels.", cat: "nutrition", icon: "ban" },
  { tip: "Practice deep breathing for 5 minutes daily to reduce cortisol levels.", cat: "mental", icon: "wind" },
  { tip: "Keep healthy snacks ready to avoid reaching for junk food when hungry.", cat: "nutrition", icon: "apple-alt" },
  { tip: "Strength training 2-3x per week boosts metabolism and bone density.", cat: "exercise", icon: "dumbbell" },
  { tip: "Cold showers can improve circulation, alertness, and recovery.", cat: "recovery", icon: "shower" },
  { tip: "Limit alcohol - it disrupts sleep quality and slows muscle recovery.", cat: "lifestyle", icon: "glass-martini-alt" },
  { tip: "Eat slowly and mindfully to improve digestion and prevent overeating.", cat: "nutrition", icon: "utensils" },
  { tip: "Foam rolling before bed can release muscle tension and improve sleep.", cat: "recovery", icon: "circle" },
  { tip: "Staying hydrated improves focus, energy, and skin health.", cat: "hydration", icon: "water" },
  { tip: "Progressive overload: gradually increase weights/reps to keep growing stronger.", cat: "exercise", icon: "chart-line" },
  { tip: "Limit screen time before bed - blue light disrupts melatonin production.", cat: "sleep", icon: "tv" },
  { tip: "Consistency beats intensity. Regular moderate exercise outperforms occasional intense sessions.", cat: "mindset", icon: "calendar-check" },
];

function getRandomTip() {
  return HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)];
}

function getTipsByCategory(cat) {
  return HEALTH_TIPS.filter(t => t.cat === cat);
}

function getDailyTip() {
  const idx = new Date().getDate() % HEALTH_TIPS.length;
  return HEALTH_TIPS[idx];
}

// =============================================
// 14. WORKOUT TIMER FUNCTIONS
// =============================================

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
  document.getElementById('timerStart').style.display = 'none';
  document.getElementById('timerPause').style.display = 'inline-flex';
}

function pauseTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  document.getElementById('timerStart').style.display = 'inline-flex';
  document.getElementById('timerPause').style.display = 'none';
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 0;
  updateTimerDisplay();
  showToast('Timer reset', 'info', 'undo');
}

function updateTimerDisplay() {
  const el = document.getElementById('timerDisplay');
  if (el) el.textContent = formatSeconds(timerSeconds);
}

function startCountdown(seconds, onComplete) {
  let remaining = seconds;
  const el = document.getElementById('timerDisplay');
  const interval = setInterval(() => {
    remaining--;
    if (el) el.textContent = formatSeconds(remaining);
    if (remaining <= 0) {
      clearInterval(interval);
      if (onComplete) onComplete();
      sendNotification('Rest Time Over!', 'Get ready for the next set!', 'timer');
    }
  }, 1000);
  return interval;
}

// =============================================
// 15. CHARTS & VISUALIZATION
// =============================================

function renderWeeklyChart() {
  const container = document.getElementById('weeklyChart');
  if (!container) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const h = state.history[key] || {};
    days.push({
      label: getDayName(-i),
      exercises: h.exercises || 0,
      total: h.totalExercises || state.exercises.length || 8,
      water: h.water || 0,
      waterGoal: h.waterGoal || state.water.goal
    });
  }
  const maxEx = Math.max(...days.map(d => d.total), 1);
  const bars = days.map(d => {
    const pct = Math.round((d.exercises / maxEx) * 100);
    return `<div class="bar-col">
      <div class="bar-fill" style="height:${pct}%"></div>
      <div class="bar-label">${d.label}</div>
    </div>`;
  }).join('');
  container.innerHTML = `<div class="bar-chart">${bars}</div>`;
}

function renderWeeklyWaterChart() {
  const container = document.getElementById('weeklyWaterChart');
  if (!container) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const h = state.history[key] || {};
    days.push({ label: getDayName(-i), water: h.water || 0, goal: h.waterGoal || state.water.goal });
  }
  const maxW = Math.max(...days.map(d => d.goal), 1);
  const bars = days.map(d => {
    const pct = Math.round((d.water / maxW) * 100);
    return `<div class="bar-col">
      <div class="bar-fill water" style="height:${pct}%"></div>
      <div class="bar-label">${d.label}</div>
    </div>`;
  }).join('');
  container.innerHTML = `<div class="bar-chart">${bars}</div>`;
}

function renderWeightChart() {
  const container = document.getElementById('weightChartContainer');
  if (!container) return;
  if (state.weightLog.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;font-size:0.8rem">No weight entries yet</p>';
    return;
  }
  const last7 = state.weightLog.slice(-7);
  const min = Math.min(...last7.map(e => e.weight)) - 2;
  const max = Math.max(...last7.map(e => e.weight)) + 2;
  const bars = last7.map(e => {
    const pct = Math.round(((e.weight - min) / (max - min)) * 100);
    return `<div class="bar-col">
      <div class="bar-fill" style="height:${pct}%;background:linear-gradient(180deg,var(--accent-orange),rgba(255,107,53,0.3))"></div>
      <div class="bar-label">${e.weight}</div>
    </div>`;
  }).join('');
  container.innerHTML = `<div class="bar-chart">${bars}</div>`;
}

// =============================================
// 16. RENDER FUNCTIONS
// =============================================

function renderAll() {
  renderStats();
  renderProgressRing();
  renderExerciseList();
  renderWaterTracker();
  renderMealList();
  renderSleepSection();
  renderMoodSection();
  renderWeeklyChart();
  renderWeeklyWaterChart();
  renderAchievements();
  renderHealthTip();
  renderDateStrip();
  renderWeightChart();
  renderBMISection();
  renderProfileSection();
}

function renderStats() {
  const completed = getCompletedExercisesCount();
  const total = state.exercises.length;
  const calories = getTotalCaloriesBurned();
  const waterMl = getTotalWaterMl();
  const exTime = calculateTotalExerciseTime();
  setElText('statExercises', `${completed}/${total}`);
  setElText('statCalories', calories);
  setElText('statWater', waterMl + 'ml');
  setElText('statTime', exTime + 'm');
  setElText('statStreak', state.streak);
  setElText('statMeals', state.meals.length);
}

function renderProgressRing() {
  const pct = getDailyCompletionPercent();
  const circle = document.getElementById('progressRingFill');
  const label = document.getElementById('progressPct');
  if (circle) {
    const circumference = 377;
    circle.style.strokeDashoffset = circumference - (circumference * pct / 100);
  }
  if (label) label.textContent = pct + '%';
  setElText('progressLabel', pct >= 100 ? 'Complete!' : 'Daily Goal');
}

function renderExerciseList() {
  const container = document.getElementById('exerciseList');
  if (!container) return;
  if (state.exercises.length === 0) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:20px;font-size:0.85rem">No exercises. Add some below!</p>';
    return;
  }
  container.innerHTML = state.exercises.map(ex => `
    <div class="exercise-item ${ex.completed ? 'completed' : ''}" style="--accent-color:var(--accent-${ex.color || 'green'})" onclick="toggleExercise('${ex.id}')">
      <div class="ex-icon"><i class="${ex.icon || 'fas fa-dumbbell'}"></i></div>
      <div class="ex-info">
        <div class="ex-name">${escapeHtml(ex.name)}</div>
        <div class="ex-meta">${ex.sets} sets &times; ${ex.reps} reps &bull; ${ex.duration} min</div>
        <div class="ex-calories"><i class="fas fa-fire" style="font-size:0.6rem"></i> ${ex.calories} cal</div>
      </div>
      <div class="ex-check"><i class="fas fa-check"></i></div>
    </div>
  `).join('');
}

function renderWaterTracker() {
  const glasses = document.getElementById('waterGlasses');
  const amountEl = document.getElementById('waterAmount');
  const goalEl = document.getElementById('waterGoalDisplay');
  const bar = document.getElementById('waterBar');
  if (glasses) {
    glasses.innerHTML = Array.from({ length: state.water.goal }, (_, i) => `
      <div class="water-glass ${i < state.water.glasses ? 'filled' : ''}" onclick="addWater(1)" title="Click to add">
        <i class="fas fa-tint water-glass-icon"></i>
      </div>
    `).join('');
  }
  if (amountEl) amountEl.textContent = getTotalWaterMl() + 'ml';
  if (goalEl) goalEl.textContent = `Goal: ${state.water.goal * state.water.glassSize}ml`;
  if (bar) bar.style.width = waterCompletionPercent() + '%';
}

function renderMealList() {
  const container = document.getElementById('mealList');
  if (!container) return;
  if (state.meals.length === 0) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:20px;font-size:0.85rem">No meals logged today</p>';
    return;
  }
  container.innerHTML = state.meals.map(m => `
    <div class="meal-item">
      <div class="meal-dot"></div>
      <div class="meal-info">
        <div class="meal-name">${escapeHtml(m.name)}</div>
        <div class="meal-time">${m.type} &bull; ${m.time}</div>
      </div>
      <div class="meal-kcal">${m.calories} kcal</div>
      <div class="meal-delete" onclick="removeMeal('${m.id}')"><i class="fas fa-times"></i></div>
    </div>
  `).join('');
  const total = calculateTotalCalories();
  setElText('totalCaloriesDisplay', total + ' kcal');
  const goal = getCalorieGoal();
  const pct = Math.min(100, Math.round((total / goal) * 100));
  const bar = document.getElementById('calorieBar');
  if (bar) bar.style.width = pct + '%';
  setElText('calorieGoalDisplay', `Goal: ${goal} kcal`);
}

function renderSleepSection() {
  const hoursEl = document.getElementById('sleepHoursDisplay');
  const qualEl = document.getElementById('sleepQualityDisplay');
  if (hoursEl) hoursEl.textContent = state.sleep.hours ? state.sleep.hours + 'h' : '--';
  if (qualEl) qualEl.textContent = getSleepQualityLabel(state.sleep.quality);
  const avgEl = document.getElementById('sleepAvgDisplay');
  if (avgEl) avgEl.textContent = getWeeklySleepAverage() + 'h avg (7d)';
}

function renderMoodSection() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    const m = btn.dataset.mood;
    btn.classList.toggle('selected', state.mood && state.mood.type === m);
  });
  const moodDisplay = document.getElementById('currentMoodDisplay');
  if (moodDisplay && state.mood) {
    moodDisplay.textContent = getMoodLabel(state.mood.type);
    moodDisplay.style.color = getMoodColor(state.mood.type);
  }
}

function renderAchievements() {
  const container = document.getElementById('achievementGrid');
  if (!container) return;
  container.innerHTML = ACHIEVEMENTS.map(a => `
    <div class="achievement-item ${hasAchievement(a.id) ? 'unlocked' : ''}">
      <div class="achievement-icon"><i class="fas ${a.icon}"></i></div>
      <div class="achievement-name">${a.name}</div>
    </div>
  `).join('');
}

function renderHealthTip() {
  const tip = getDailyTip();
  const tipText = document.getElementById('healthTipText');
  const tipIcon = document.getElementById('healthTipIcon');
  if (tipText) tipText.textContent = tip.tip;
  if (tipIcon) tipIcon.className = `fas fa-${tip.icon}`;
}

function renderDateStrip() {
  const el = document.getElementById('dateDisplay');
  if (el) el.innerHTML = `<span>${getGreeting()}</span>, ${formatDate(getTodayKey())}`;
  const streakEl = document.getElementById('streakDisplay');
  if (streakEl) streakEl.textContent = `${state.streak} Day Streak`;
}

function renderBMISection() {
  const w = state.user.weight;
  const h = state.user.height;
  if (!w || !h) return;
  const bmi = calculateBMI(w, h);
  const cat = getBMICategory(bmi);
  setElText('bmiValue', bmi);
  const catEl = document.getElementById('bmiCategory');
  if (catEl) { catEl.textContent = cat.label; catEl.style.color = cat.color; }
}

function renderProfileSection() {
  const fields = ['userName', 'userAge', 'userWeight', 'userHeight'];
  const stateKeys = ['name', 'age', 'weight', 'height'];
  fields.forEach((f, i) => {
    const el = document.getElementById(f);
    if (el && el.tagName === 'INPUT') el.value = state.user[stateKeys[i]] || '';
  });
}

// =============================================
// 17. UI HELPER FUNCTIONS
// =============================================

function setElText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setElHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function showToast(message, type = 'info', icon = 'info-circle') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const colors = { success: '#00d4aa', error: '#ff3366', warning: '#f1c40f', info: '#0084ff' };
  const color = colors[type] || colors.info;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.setProperty('--toast-color', color);
  toast.innerHTML = `
    <i class="fas fa-${icon} toast-icon"></i>
    <div class="toast-text">${escapeHtml(message)}</div>
    <i class="fas fa-times toast-close" onclick="this.parentElement.classList.add('hide')"></i>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

function openPopup(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closePopup(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
}

function closeAllPopups() {
  document.querySelectorAll('.popup-overlay.open').forEach(p => p.classList.remove('open'));
  document.body.style.overflow = '';
}

function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');
  currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchTab(tab, groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  group.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
}

function triggerConfetti() {
  const colors = ['#00d4aa', '#0084ff', '#ff6b35', '#f1c40f', '#ff3366'];
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        top: -10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        width: ${6 + Math.random() * 8}px;
        height: ${6 + Math.random() * 8}px;
        animation-delay: ${Math.random() * 0.5}s;
        animation-duration: ${1.5 + Math.random()}s;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    }, i * 40);
  }
}

function animateElement(el, animation) {
  el.classList.add(`animate-${animation}`);
  el.addEventListener('animationend', () => el.classList.remove(`animate-${animation}`), { once: true });
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
// 18. SETTINGS FUNCTIONS
// =============================================

function updateUserProfile(data) {
  state.user = { ...state.user, ...data };
  saveData();
  renderBMISection();
  renderStats();
  showToast('Profile updated', 'success', 'user');
}

function toggleSetting(key) {
  state.settings[key] = !state.settings[key];
  saveData();
  const toggle = document.getElementById('toggle_' + key);
  if (toggle) toggle.classList.toggle('on', state.settings[key]);
}

function setDarkTheme() {
  state.theme = 'dark';
  document.documentElement.setAttribute('data-theme', 'dark');
  saveData();
}

function setLightTheme() {
  state.theme = 'light';
  document.documentElement.setAttribute('data-theme', 'light');
  saveData();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('SW registered:', reg.scope);
        if (state.notificationsEnabled) startReminderSchedule();
      })
      .catch(err => console.error('SW registration failed:', err));
  }
}

// =============================================
// 19. FORM HANDLERS
// =============================================

function handleAddExerciseForm() {
  const name = document.getElementById('exName').value.trim();
  if (!name) { showToast('Please enter exercise name', 'error', 'exclamation'); return; }
  addCustomExercise({
    name,
    sets: document.getElementById('exSets').value,
    reps: document.getElementById('exReps').value,
    duration: document.getElementById('exDuration').value,
    calories: document.getElementById('exCalories').value,
    category: document.getElementById('exCategory').value
  });
  document.getElementById('exName').value = '';
  document.getElementById('exSets').value = '';
  document.getElementById('exReps').value = '';
  closePopup('addExercisePopup');
}

function handleAddMealForm() {
  const name = document.getElementById('mealName').value.trim();
  if (!name) { showToast('Please enter meal name', 'error', 'exclamation'); return; }
  addMeal({
    name,
    calories: document.getElementById('mealCalories').value,
    protein: document.getElementById('mealProtein').value,
    carbs: document.getElementById('mealCarbs').value,
    fat: document.getElementById('mealFat').value,
    type: document.getElementById('mealType').value,
    time: formatTime(new Date())
  });
  ['mealName','mealCalories','mealProtein','mealCarbs','mealFat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  closePopup('addMealPopup');
}

function handleLogSleep() {
  const hours = document.getElementById('sleepHours').value;
  const quality = document.getElementById('sleepQuality').value;
  if (!hours) { showToast('Please enter sleep hours', 'error', 'exclamation'); return; }
  logSleep(hours, quality);
  closePopup('sleepPopup');
}

function handleLogWeight() {
  const weight = document.getElementById('weightInput').value;
  if (!weight) { showToast('Please enter weight', 'error', 'exclamation'); return; }
  logWeight(weight);
  document.getElementById('weightInput').value = '';
  closePopup('weightPopup');
}

function handleUpdateProfile() {
  updateUserProfile({
    name: document.getElementById('userName').value,
    age: parseInt(document.getElementById('userAge').value),
    weight: parseFloat(document.getElementById('userWeight').value),
    height: parseInt(document.getElementById('userHeight').value),
    gender: document.getElementById('userGender').value,
    goal: document.getElementById('userGoal').value
  });
  closePopup('profilePopup');
}

function handleWaterGoalUpdate() {
  const goal = document.getElementById('waterGoalInput').value;
  const size = document.getElementById('glassSizeInput').value;
  if (goal) setWaterGoal(goal);
  if (size) setGlassSize(size);
  closePopup('waterSettingsPopup');
}

// =============================================
// 20. PWA INSTALL
// =============================================

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'inline-flex';
});

function installPWA() {
  if (!deferredPrompt) {
    showToast('Already installed or not supported', 'info', 'info-circle');
    return;
  }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') showToast('App installed successfully!', 'success', 'check');
    deferredPrompt = null;
    const btn = document.getElementById('installBtn');
    if (btn) btn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  showToast('App installed!', 'success', 'mobile');
});

// =============================================
// 21. INITIALIZE APP
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  registerServiceWorker();

  // Hide loading screen
  setTimeout(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) loader.classList.add('hidden');
  }, 1500);

  // Render everything
  renderAll();
  showNotifBannerIfNeeded();

  // Switch to home
  switchPage('home');

  // Setup nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });

  // Popup close on overlay click
  document.querySelectorAll('.popup-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closePopup(overlay.id);
    });
  });

  // Online/Offline listeners
  window.addEventListener('online', () => showToast('Back online', 'success', 'wifi'));
  window.addEventListener('offline', () => showToast('You are offline', 'warning', 'wifi'));

  // Visibility change - check day reset
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkDayReset();
      renderAll();
    }
  });

  // Daily reminder on load
  if (state.notificationsEnabled) {
    startReminderSchedule();
  }

  console.log(`Daily Fitness Activities v${APP_VERSION} initialized`);
});
