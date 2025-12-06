// script.js - Main Application Logic
import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from './firebase-config.js';

// DOM Elements
const appLoading = document.getElementById('app-loading-overlay');
const welcomePage = document.getElementById('welcome-page');
const mainContent = document.getElementById('main-content');
const loadingMessage = document.getElementById('loading-message');

// Global Variables
let currentUser = null;
let userData = null;
let isTelegramApp = false;
let currentTelegramId = null;

// Telegram Detection
function detectTelegramEnvironment() {
    if (window.Telegram && Telegram.WebApp) {
        isTelegramApp = true;
        const user = Telegram.WebApp.initDataUnsafe?.user;
        
        if (user && user.id) {
            currentTelegramId = user.id.toString();
            console.log('📱 Telegram ID detected:', currentTelegramId);
        }
        
        // Initialize Telegram WebApp
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        
        return true;
    }
    return false;
}

// Update Loading Message
function updateLoading(message) {
    if (loadingMessage) {
        loadingMessage.textContent = message;
    }
    console.log('📊', message);
}

// Initialize App
async function initApp() {
    console.log('🚀 Starting University Exam Prep...');
    
    // Detect Telegram
    detectTelegramEnvironment();
    
    // Initialize Firebase Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        updateLoading('Checking authentication...');
        
        if (user) {
            currentUser = user;
            await loadUserData(user);
        } else {
            showAuthUI();
        }
    });
}

// Load User Data from Firestore
async function loadUserData(user) {
    try {
        updateLoading('Loading user data...');
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            
            // Check if user has paid access
            if (userData.isPaid !== true) {
                showPaymentRequired();
                return;
            }
            
            // User has access - show main app
            showMainApp(user, userData);
        } else {
            // First time user - create user document
            updateLoading('Creating user profile...');
            
            userData = {
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                telegramId: currentTelegramId,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                isPaid: false, // Will be true after payment
                stats: {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    quizzesTaken: 0
                }
            };
            
            await setDoc(doc(db, 'users', user.uid), userData);
            
            showPaymentRequired();
        }
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        showError('Failed to load user data. Please try again.');
    }
}

// Show Authentication UI
function showAuthUI() {
    updateLoading('Showing login screen...');
    
    appLoading.classList.add('hidden');
    welcomePage.classList.remove('hidden');
    mainContent.classList.add('hidden');
    
    showMethods();
}

// Show Method Selection
function showMethods() {
    document.getElementById('method-selection').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('forgot-password').classList.add('hidden');
}

// Show Login Form
function showLogin() {
    document.getElementById('method-selection').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

// Show Signup Form
function showSignup() {
    document.getElementById('method-selection').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
}

// Show Forgot Password
function showForgotPassword() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('forgot-password').classList.remove('hidden');
}

// Handle Login
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!email || !password) {
        showError('Please enter email and password');
        return;
    }
    
    const btn = document.querySelector('#login-form .btn.primary');
    const originalText = btn.textContent;
    btn.textContent = 'Logging in...';
    btn.disabled = true;
    
    try {
        updateLoading('Authenticating...');
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the rest
    } catch (error) {
        console.error('Login error:', error);
        showError(getAuthErrorMessage(error));
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Handle Signup
async function handleSignup() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const confirm = document.getElementById('signup-confirm').value.trim();
    
    if (!name || !email || !password || !confirm) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password !== confirm) {
        showError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    const btn = document.querySelector('#signup-form .btn.primary');
    const originalText = btn.textContent;
    btn.textContent = 'Creating account...';
    btn.disabled = true;
    
    try {
        updateLoading('Creating account...');
        
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            name: name,
            email: email,
            telegramId: currentTelegramId,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            isPaid: false, // Will be true after payment
            stats: {
                totalQuestions: 0,
                correctAnswers: 0,
                quizzesTaken: 0
            }
        });
        
        showSuccess('Account created successfully!');
        // onAuthStateChanged will handle the rest
    } catch (error) {
        console.error('Signup error:', error);
        showError(getAuthErrorMessage(error));
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Handle Google Login
async function loginWithGoogle() {
    try {
        updateLoading('Connecting to Google...');
        
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        showSuccess('Google login successful!');
        // onAuthStateChanged will handle the rest
    } catch (error) {
        console.error('Google login error:', error);
        showError('Google login failed: ' + error.message);
    }
}

// Handle Password Reset
async function handlePasswordReset() {
    const email = document.getElementById('reset-email').value.trim();
    
    if (!email) {
        showError('Please enter your email address');
        return;
    }
    
    const btn = document.querySelector('#forgot-password .btn.primary');
    const originalText = btn.textContent;
    btn.textContent = 'Sending...';
    btn.disabled = true;
    
    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess('Password reset email sent! Check your inbox.');
        showLogin();
    } catch (error) {
        console.error('Password reset error:', error);
        showError('Failed to send reset email: ' + error.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Show Payment Required Screen
function showPaymentRequired() {
    appLoading.classList.add('hidden');
    welcomePage.classList.remove('hidden');
    mainContent.classList.add('hidden');
    
    welcomePage.innerHTML = `
        <div class="card">
            <h1 class="title">🎓 Account Setup Required</h1>
            <p class="subtitle">Complete your registration to access all features</p>
            
            <div class="payment-info">
                <h3>💰 Payment Required</h3>
                <p>One-time payment: <strong>200 ETB</strong></p>
                
                <div class="payment-methods">
                    <h4>Payment Accounts:</h4>
                    <p><strong>CBE:</strong> 1000293836648</p>
                    <p><strong>Telebirr:</strong> 0907667755</p>
                    <p><em>Account holder: Admassu Yano</em></p>
                </div>
                
                <p>After payment, contact support with your receipt:</p>
                <a href="https://t.me/Kyullc" target="_blank" class="btn primary">
                    📱 Contact Support
                </a>
                
                <button class="btn secondary" onclick="handleLogout()">
                    🚪 Logout
                </button>
            </div>
        </div>
    `;
}

// Show Main Application
function showMainApp(user, data) {
    updateLoading('Loading main application...');
    
    appLoading.classList.add('hidden');
    welcomePage.classList.add('hidden');
    mainContent.classList.remove('hidden');
    
    // Update user info
    document.getElementById('welcome-message').textContent = `Welcome, ${data.name || 'Student'}!`;
    document.getElementById('menu-user-email').textContent = data.email;
    document.getElementById('user-email-display').textContent = data.email;
    
    // Update stats
    if (data.stats) {
        document.getElementById('total-questions').textContent = data.stats.totalQuestions || 0;
        document.getElementById('completed-questions').textContent = data.stats.quizzesTaken || 0;
        
        if (data.stats.totalQuestions > 0) {
            const accuracy = Math.round((data.stats.correctAnswers / data.stats.totalQuestions) * 100);
            document.getElementById('accuracy-rate').textContent = `${accuracy}%`;
        }
    }
    
    // Load subjects
    loadSubjects();
    
    // Show dashboard by default
    showDashboard();
    
    // Hide loading after a delay
    setTimeout(() => {
        updateLoading('Ready!');
    }, 500);
}

// Load Subjects
async function loadSubjects() {
    try {
        // For now, use hardcoded subjects
        // Later, we'll load from Firestore
        const subjects = [
            { id: 'math', name: 'Mathematics', icon: '📐' },
            { id: 'physics', name: 'Physics', icon: '🧪' },
            { id: 'english', name: 'English', icon: '📘' },
            { id: 'chemistry', name: 'Chemistry', icon: '⚗️' },
            { id: 'biology', name: 'Biology', icon: '🧬' },
            { id: 'history', name: 'History', icon: '📜' },
            { id: 'geography', name: 'Geography', icon: '🗺️' },
            { id: 'economics', name: 'Economics', icon: '💰' }
        ];
        
        const subjectGrid = document.getElementById('subject-grid');
        subjectGrid.innerHTML = '';
        
        subjects.forEach(subject => {
            const subjectCard = document.createElement('div');
            subjectCard.className = 'subject-card fade-in';
            subjectCard.innerHTML = `
                <h3>${subject.icon} ${subject.name}</h3>
                <p>Start practicing</p>
            `;
            subjectCard.onclick = () => startSubjectQuiz(subject.id);
            subjectGrid.appendChild(subjectCard);
        });
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

// Start Subject Quiz
function startSubjectQuiz(subjectId) {
    // For now, show a placeholder
    showQuiz();
    document.getElementById('quiz-container').innerHTML = `
        <div class="question">
            <h3>Sample Question</h3>
            <p>What is 2 + 2?</p>
            <div class="answer-option" onclick="selectAnswer(this)">3</div>
            <div class="answer-option" onclick="selectAnswer(this)">4</div>
            <div class="answer-option" onclick="selectAnswer(this)">5</div>
            <div class="answer-option" onclick="selectAnswer(this)">6</div>
        </div>
        <button class="btn primary" onclick="submitQuiz()">Submit Answer</button>
    `;
}

// Select Answer
function selectAnswer(element) {
    // Remove selected class from all options
    document.querySelectorAll('.answer-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    element.classList.add('selected');
}

// Submit Quiz
function submitQuiz() {
    const selected = document.querySelector('.answer-option.selected');
    if (!selected) {
        showError('Please select an answer');
        return;
    }
    
    // For demo, mark 4 as correct
    if (selected.textContent === '4') {
        selected.classList.add('correct');
        showSuccess('Correct! 🎉');
    } else {
        selected.classList.add('incorrect');
        showError('Incorrect. The correct answer is 4.');
    }
}

// Show Dashboard
function showDashboard() {
    showSection('dashboard');
}

// Show Subjects
function showSubjects() {
    showSection('subjects');
}

// Show Quiz
function showQuiz() {
    showSection('quiz');
}

// Show Bookmarks
function showBookmarks() {
    showSection('bookmarks');
}

// Show Settings
function showSettings() {
    showSection('settings');
}

// Show Section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    
    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        section.classList.remove('hidden');
    }
    
    // Close menu if open
    closeMenu();
}

// Toggle Menu
function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Close Menu
function closeMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    
    menu.classList.remove('active');
    overlay.classList.remove('active');
}

// Handle Logout
async function handleLogout() {
    try {
        updateLoading('Logging out...');
        await signOut(auth);
        showSuccess('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed: ' + error.message);
    }
}

// Show Error Message
function showError(message) {
    alert(`❌ ${message}`);
}

// Show Success Message
function showSuccess(message) {
    alert(`✅ ${message}`);
}

// Get Auth Error Message
function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-credential':
            return 'Invalid email or password';
        case 'auth/user-not-found':
            return 'No account found with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        case 'auth/email-already-in-use':
            return 'Email already in use';
        case 'auth/weak-password':
            return 'Password is too weak';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/too-many-requests':
            return 'Too many attempts. Try again later';
        default:
            return error.message;
    }
}

// Make Functions Globally Available
window.showLogin = showLogin;
window.showSignup = showSignup;
window.showForgotPassword = showForgotPassword;
window.showMethods = showMethods;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.loginWithGoogle = loginWithGoogle;
window.handlePasswordReset = handlePasswordReset;
window.handleLogout = handleLogout;
window.toggleMenu = toggleMenu;
window.showDashboard = showDashboard;
window.showSubjects = showSubjects;
window.showQuiz = showQuiz;
window.showBookmarks = showBookmarks;
window.showSettings = showSettings;
window.selectAnswer = selectAnswer;
window.submitQuiz = submitQuiz;
window.startSubjectQuiz = startSubjectQuiz;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);