/**
 * I-SHARK ENTERPRISE CORE
 * Architecture: Serverless SPA via Vanilla ES6 (Hash Routing enabled)
 */

const firebaseConfig = {
    apiKey: "AIzaSyC8nptTKV3cJtnkri-hDZNCTidlMeGcCIs",
    authDomain: "i-shark.firebaseapp.com",
    projectId: "i-shark",
    storageBucket: "i-shark.firebasestorage.app",
    messagingSenderId: "304378182943",
    appId: "1:304378182943:web:305b03b013367c8ff1c42a"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const ADMIN_EMAIL = "makkahmarble3@gmail.com";

db.enablePersistence().catch(err => console.warn("Offline mode limited:", err));

// --- GLOBAL STATE ---
window.SHARK = {
    isBooted: false,
    preventNextRender: false, 
    user: null,
    userData: { xp: 0, level: 1, quizzesTaken: 0, hours: 0, activity: {} },
    mcqs: [],
    alerts: [],
    allUsers: [],
    subjects: ['General Knowledge', 'Pakistan Affairs', 'Islamiyat', 'Everyday Science', 'English', 'Current Affairs'],
    quizSession: { active: false, subject: '', pool: [], index: 0, score: 0, timeStart: null, history: [] }
};

let quizTimer; 

// --- FIX: GLOBAL CLICK LISTENER FOR MOBILE DROPDOWN ---
window.addEventListener('click', (e) => {
    const profileBtn = document.getElementById('user-profile');
    const dropdown = document.getElementById('profile-dropdown');
    if (profileBtn && dropdown && !profileBtn.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// --- ENTERPRISE TOAST SYSTEM ---
window.showToast = (msg, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return; 

    const toast = document.createElement('div');
    const border = type === 'error' ? 'border-rose-500 text-rose-500' : 'border-primary text-primary';
    const icon = type === 'error' ? 'error' : 'check_circle';
    const bg = type === 'error' ? 'bg-rose-500/10' : 'bg-primary/10';

    toast.className = `toast-message glass-panel p-4 rounded-xl border-l-4 ${border} ${bg} flex items-center gap-3 shadow-lg w-max max-w-xs transform translate-y-10 opacity-0`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icon}</span>
        <p class="font-bold text-sm text-white">${msg}</p>
    `;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.transform = 'translateY(20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

window.alert = (msg) => window.showToast(msg, 'error');


// --- AUTHENTICATION ---
window.login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider).catch(e => window.showToast("Login Failed: " + e.message, 'error'));
};

window.logout = () => auth.signOut().then(() => {
    window.location.hash = '';
    window.location.reload();
});

auth.onAuthStateChanged(async (user) => {
    try {
        if (user) {
            window.SHARK.user = user;
            const userRef = db.collection('users').doc(user.uid);
            const doc = await userRef.get();
            if(!doc.exists) {
                await userRef.set({ name: user.displayName, email: user.email, xp: 0, level: 1, quizzesTaken: 0, hours: 0, joinDate: new Date() });
            } else {
                window.SHARK.userData = { ...window.SHARK.userData, ...doc.data() };
            }
        } else {
            window.SHARK.user = null;
        }
        updateNav();
    } catch(error) {
        console.error("Auth Profile Sync Error:", error);
    } finally {
        if (!window.SHARK.isBooted) {
            window.SHARK.isBooted = true;
            initApp();
        }
    }
});

auth.getRedirectResult().then((result) => {
    if (result && result.user) {
        window.showToast(`Welcome back, ${result.user.displayName}!`, 'success');
    }
}).catch((error) => {
    console.error("Auth Redirect Error:", error);
});


// --- BOOTSTRAP ---
async function initApp() {
    try {
        const [mcqSnap, alertSnap] = await Promise.all([
            db.collection("mcqs").limit(2000).get(), 
            db.collection("alerts").orderBy("timestamp", "desc").limit(20).get()
        ]);
        
        window.SHARK.mcqs = mcqSnap.docs.map(d => ({id: d.id, ...d.data()}));
        window.SHARK.alerts = alertSnap.docs.map(d => ({id: d.id, ...d.data()}));
        
        const dynamicSubjects = [...new Set(window.SHARK.mcqs.map(m => m.subject))].filter(Boolean);
        window.SHARK.subjects = [...new Set([...window.SHARK.subjects, ...dynamicSubjects])];
        
        const initialRoute = window.location.hash.substring(1) || 'dashboard';
        window.router(initialRoute, true); 

    } catch(e) {
        console.error("Bootloader Crash:", e);
        document.getElementById("view-container").innerHTML = `
            <div class="text-rose-500 p-10 text-center glass-panel rounded-2xl border border-rose-500/20 max-w-lg mx-auto mt-10">
                <span class="material-symbols-outlined text-5xl mb-2">wifi_off</span>
                <p class="font-bold text-xl mb-2">CRITICAL DB LINK FAILURE</p>
                <p class="text-sm text-slate-400">Failed to connect to Firebase. Using offline cache if available.</p>
                <button onclick="window.location.reload()" class="mt-6 px-6 py-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10">Retry Connection</button>
            </div>`;
    }
}

function updateNav() {
    const u = window.SHARK.user;
    if(!u) return;
    document.getElementById('login-btn').classList.add('hidden');
    document.getElementById('user-profile').classList.remove('hidden');
    document.getElementById('user-initial').innerText = u.displayName ? u.displayName.charAt(0) : 'S';
    document.getElementById('nav-xp').innerText = window.SHARK.userData.xp.toLocaleString();
    document.getElementById('nav-level').innerText = window.SHARK.userData.level || 1;
    
    if(u.email === ADMIN_EMAIL) {
        const adminLnk = document.getElementById('admin-link');
        if(adminLnk) adminLnk.classList.remove('hidden');
    }
}

// --- HASH ROUTING EVENT LISTENER ---
window.addEventListener('hashchange', () => {
    if(!window.SHARK.isBooted) return;
    const view = window.location.hash.substring(1) || 'dashboard';
    window.router(view, true);
});

// --- ENTERPRISE ROUTER WITH STRICT EXAM MODE ---
window.router = (view, fromHash = false) => {
    const cont = document.getElementById("view-container");
    if(!cont) return;

    if (window.SHARK.quizSession && window.SHARK.quizSession.active && view !== 'quiz' && view !== 'analysis') {
        if(!confirm("WARNING: Leaving this tab will abandon your active exam. Proceed?")) {
            window.SHARK.preventNextRender = true; 
            window.location.hash = 'quiz'; 
            return;
        } else {
            clearInterval(quizTimer); 
            window.SHARK.quizSession.active = false;
        }
    }

    if (window.SHARK.preventNextRender && view === 'quiz') {
        window.SHARK.preventNextRender = false;
        return; 
    }

    if(!fromHash) window.location.hash = view;

    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(el => {
        el.classList.remove('text-primary', 'active');
        if(el.dataset.route === view) el.classList.add('text-primary', 'active');
    });

    const dropdown = document.getElementById('profile-dropdown');
    if(dropdown) dropdown.classList.add('hidden');

    cont.classList.remove('animate-fade-in');
    void cont.offsetWidth; 
    cont.classList.add('animate-fade-in');
    window.scrollTo(0,0);

    try {
        switch(view) {
            case 'dashboard': cont.innerHTML = viewDashboard(); break;
            case 'vault': cont.innerHTML = viewVault(); break;
            case 'quiz': cont.innerHTML = viewQuiz(); startTimer(); break;
            case 'analysis': cont.innerHTML = viewAnalysis(); break;
            case 'alerts': cont.innerHTML = viewAlerts(); break;
            case 'leaderboard': cont.innerHTML = viewLeaderboard(); fetchLeaderboard(); break;
            case 'admin': cont.innerHTML = viewAdmin(); break;
            default: cont.innerHTML = viewDashboard();
        }
    } catch (e) {
        console.error("Router UI Crash:", e);
        cont.innerHTML = `<div class="text-center p-10 text-rose-500 glass-panel rounded-2xl max-w-lg mx-auto mt-10">UI Render Error</div>`;
    }
};

// ==========================================
// VIEWS (UI GENERATORS)
// ==========================================

function viewDashboard() {
    const latestAlert = window.SHARK.alerts[0] || { title: "No recent updates", urdu: "کوئی تازہ ترین اپ ڈیٹ نہیں" };
    const rank = window.SHARK.userData.xp > 0 ? Math.max(1, 500 - Math.floor(window.SHARK.userData.xp / 100)) : 'Unranked';

    let chartHTML = '';
    const activity = window.SHARK.userData.activity || {};
    let maxDailyXP = 200; 
    Object.values(activity).forEach(val => { if(val > maxDailyXP) maxDailyXP = val; });
    
    for(let i=9; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA');
        const dayXP = activity[dateStr] || 0;
        let heightPct = dayXP === 0 ? 5 : Math.max(15, Math.floor((dayXP / maxDailyXP) * 100));
        let isActive = (i === 0 && dayXP > 0) ? 'active' : ''; 
        chartHTML += `<div class="w-full rounded-t-sm stat-bar ${isActive}" style="height: ${heightPct}%" title="${dateStr}: ${dayXP} XP"></div>`;
    }

    return `
    <div class="space-y-6">
        <div>
            <h1 class="text-4xl font-black tracking-tight mb-1 text-white">Student Dashboard</h1>
            <p class="text-slate-400">Welcome back, Scholar. Your path to excellence starts here.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 glass-panel rounded-2xl overflow-hidden flex flex-col sm:flex-row relative">
                <div class="w-full sm:w-1/3 bg-cover bg-center h-48 sm:h-auto" style="background-image: url('https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80');"></div>
                <div class="p-8 w-full sm:w-2/3">
                    <span class="text-[10px] font-bold text-primary tracking-widest uppercase mb-2 block flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Live Recruitment Updates
                    </span>
                    <h2 class="text-2xl font-bold mb-4 text-white">PPSC/FPSC Alerts</h2>
                    <p class="urdu-text text-xl text-slate-300 mb-6">${latestAlert.urdu || latestAlert.title}</p>
                    <button onclick="window.router('alerts')" class="btn-primary px-6 py-2 rounded-lg text-sm flex items-center gap-2 w-max text-dark">
                        View All Alerts <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            </div>

            <div class="glass-panel rounded-2xl p-8 flex flex-col justify-between">
                <div>
                    <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                        <span class="material-symbols-outlined text-primary">quiz</span>
                    </div>
                    <h2 class="text-xl font-bold mb-2 text-white">Quiz System</h2>
                    <p class="text-sm text-slate-400 mb-6">Challenge yourself with time-bound mock exams tailored for competitive testing.</p>
                </div>
                <div>
                    <div class="flex justify-between text-xs font-bold mb-2 uppercase tracking-wide">
                        <span class="text-slate-500">Practice Goal</span>
                        <span class="text-primary">${window.SHARK.userData.quizzesTaken > 0 ? 'Active' : 'Pending'}</span>
                    </div>
                    <div class="w-full bg-white/5 rounded-full h-1.5 mb-4"><div class="bg-primary h-1.5 rounded-full" style="width: ${window.SHARK.userData.quizzesTaken > 0 ? '100%' : '5%'}"></div></div>
                    <button onclick="window.router('vault')" class="btn-ghost w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm text-white">
                        <span class="material-symbols-outlined text-lg">play_arrow</span> Start Quiz
                    </button>
                </div>
            </div>
        </div>

        <div class="glass-panel rounded-2xl p-8">
            <div class="flex justify-between items-start mb-8">
                <div>
                    <h2 class="text-xl font-bold text-white">Study Progress</h2>
                    <p class="text-sm text-slate-400">Visualizing your academic journey this month.</p>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-white/5 rounded-xl p-6 text-center border border-white/5">
                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Total XP</p>
                    <p class="text-3xl font-black text-white">${window.SHARK.userData.xp.toLocaleString()}</p>
                </div>
                <div class="bg-white/5 rounded-xl p-6 text-center border border-white/5">
                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Quizzes Taken</p>
                    <p class="text-3xl font-black text-white">${window.SHARK.userData.quizzesTaken || 0}</p>
                </div>
                <div class="bg-white/5 rounded-xl p-6 text-center border border-white/5">
                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Current Level</p>
                    <p class="text-3xl font-black text-white">${window.SHARK.userData.level || Math.floor(window.SHARK.userData.xp/1000)+1}</p>
                </div>
                <div class="bg-white/5 rounded-xl p-6 text-center border border-white/5">
                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Global Rank</p>
                    <p class="text-3xl font-black text-primary">#${rank}</p>
                </div>
            </div>

            <div class="h-24 flex items-end gap-2 px-2 bg-gradient-to-t from-primary/5 to-transparent rounded-lg pt-4">
                ${chartHTML}
            </div>
        </div>
    </div>`;
}

function viewVault() {
    const icons = { 'General Knowledge':'public', 'Pakistan Affairs':'account_balance', 'Islamiyat':'menu_book', 'Everyday Science':'science', 'English':'translate', 'Current Affairs':'newspaper', 'Mass Media': 'live_tv' };
    
    const cards = window.SHARK.subjects.map(s => {
        const count = window.SHARK.mcqs.filter(m => m.subject === s).length;
        if(count === 0) return ''; 
        return `
        <div onclick="window.initQuiz('${s}')" class="glass-panel p-8 rounded-2xl cursor-pointer group relative overflow-hidden">
            <div class="absolute top-6 right-6 px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase">Active</div>
            <div class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-primary text-2xl">${icons[s] || 'folder'}</span>
            </div>
            <h3 class="text-xl font-bold mb-2 group-hover:text-primary transition-colors">${s}</h3>
            <p class="text-sm text-slate-400 mb-6">Contains ${count} questions.</p>
        </div>`;
    }).join('');

    return `
    <div class="space-y-8 max-w-5xl mx-auto">
        <div>
            <h1 class="text-4xl font-black tracking-tight mb-2">Subject Vault</h1>
            <p class="text-slate-400">Choose your field of study to begin practice. Master each category.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${cards || `<p class="text-slate-500 italic col-span-full text-center py-10">No subjects populated yet.</p>`}
        </div>
    </div>`;
}

window.initQuiz = (subject) => {
    let pool = window.SHARK.mcqs.filter(m => m.subject === subject);
    if(pool.length < 5) return window.showToast(`Not enough questions in ${subject} yet. Needs at least 5.`, 'error');
    
    pool = pool.sort(() => 0.5 - Math.random()).slice(0, 10);
    window.SHARK.quizSession = { active: true, subject, pool, index: 0, score: 0, timeStart: Date.now(), history: [] };
    window.router('quiz');
};

function startTimer() {
    let sec = 0;
    if(quizTimer) clearInterval(quizTimer);
    quizTimer = setInterval(() => {
        sec++;
        const el = document.getElementById('q-timer');
        if(el) el.innerText = `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;
    }, 1000);
}

function viewQuiz() {
    const qs = window.SHARK.quizSession;
    const q = qs.pool[qs.index];
    if(!q) return finalizeQuiz();

    return `
    <div class="max-w-3xl mx-auto py-10">
        <div class="flex justify-between items-center mb-8">
            <div>
                <p class="text-[10px] text-primary font-bold uppercase tracking-widest">${qs.subject.toUpperCase()} MASTERY</p>
                <p class="text-sm text-slate-400">Question ${qs.index + 1} of ${qs.pool.length}</p>
            </div>
            <div class="flex items-center gap-2 text-primary font-mono text-lg font-bold">
                <span class="material-symbols-outlined">timer</span> <span id="q-timer">00:00</span>
            </div>
        </div>

        <div class="glass-panel p-10 rounded-3xl relative">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-panel border border-white/10 px-4 py-1 rounded-full text-[10px] text-slate-400 uppercase tracking-widest font-bold">High Stakes</div>
            
            <h2 class="text-2xl md:text-3xl font-bold text-center leading-tight mb-10">${q.question}</h2>
            
            ${q.image ? `<img src="${q.image}" class="w-full max-h-64 object-contain rounded-xl mb-8 border border-white/10">` : ''}

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="options-container">
                ${['A','B','C','D'].map(opt => `
                    <button onclick="window.selectOption('${opt}')" id="opt-btn-${opt}" class="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/10 transition-all flex items-center justify-between group">
                        <div class="flex items-center gap-4">
                            <span class="w-8 h-8 rounded-lg bg-white/10 text-primary font-bold flex items-center justify-center text-sm group-hover:bg-primary/20">${opt}</span>
                            <span class="font-medium">${q['opt'+opt]}</span>
                        </div>
                        <div class="w-4 h-4 rounded-full border-2 border-slate-600"></div>
                    </button>
                `).join('')}
            </div>
            
            <div class="mt-10 text-center">
                <button onclick="window.submitAnswer()" id="submit-ans-btn" class="btn-primary px-8 py-3 rounded-xl flex items-center gap-2 mx-auto disabled:opacity-50" disabled>
                    SUBMIT SELECTION <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            </div>
        </div>
    </div>`;
}

let currentSelection = null;
window.selectOption = (opt) => {
    currentSelection = opt;
    ['A','B','C','D'].forEach(o => {
        const btn = document.getElementById(`opt-btn-${o}`);
        if(btn) {
            btn.classList.remove('border-primary', 'bg-primary/10');
            btn.querySelector('div:last-child').classList.remove('border-primary', 'bg-primary');
        }
    });
    const selected = document.getElementById(`opt-btn-${opt}`);
    if(selected) {
        selected.classList.add('border-primary', 'bg-primary/10');
        selected.querySelector('div:last-child').classList.add('border-primary', 'bg-primary');
        document.getElementById('submit-ans-btn').disabled = false;
    }
};

// FIX 1: REAL-TIME QUIZ FEEDBACK (NO BLIND JUMPS)
window.submitAnswer = () => {
    const qs = window.SHARK.quizSession;
    const q = qs.pool[qs.index];
    const isCorrect = currentSelection === q.correct;
    
    // Disable interactions immediately
    document.getElementById('submit-ans-btn').disabled = true;
    ['A','B','C','D'].forEach(o => document.getElementById(`opt-btn-${o}`).disabled = true);
    
    // Visual Feedback
    const selectedBtn = document.getElementById(`opt-btn-${currentSelection}`);
    const correctBtn = document.getElementById(`opt-btn-${q.correct}`);
    
    if (isCorrect) {
        selectedBtn.classList.replace('bg-primary/10', 'bg-emerald-500/20');
        selectedBtn.classList.replace('border-primary', 'border-emerald-500');
        window.showToast("Correct!", "success");
    } else {
        selectedBtn.classList.replace('bg-primary/10', 'bg-rose-500/20');
        selectedBtn.classList.replace('border-primary', 'border-rose-500');
        if(correctBtn) {
            correctBtn.classList.add('border-emerald-500', 'bg-emerald-500/20');
        }
        window.showToast("Incorrect", "error");
    }

    if(isCorrect) qs.score++;
    qs.history.push({ q, selected: currentSelection, isCorrect });
    
    currentSelection = null;
    qs.index++;
    
    // Pause for 1.2s to let user see feedback before next render
    setTimeout(() => {
        if(qs.index >= qs.pool.length) finalizeQuiz();
        else window.router('quiz'); 
    }, 1200);
};

// FIX 2 & 6: LEVEL UP ENGINE AND TIME TRACKING
function finalizeQuiz() {
    if(quizTimer) clearInterval(quizTimer);
    window.SHARK.quizSession.active = false; 
    
    const qs = window.SHARK.quizSession;
    const timeSpentSec = Math.floor((Date.now() - qs.timeStart) / 1000);
    const xpEarned = qs.score * 50;
    const hoursEarned = timeSpentSec / 3600;
    
    qs.finalTime = `${Math.floor(timeSpentSec/60)}:${(timeSpentSec%60).toString().padStart(2,'0')}`;
    qs.xpEarned = xpEarned;

    if(window.SHARK.user) {
        // Calculate new Level
        const newXp = window.SHARK.userData.xp + xpEarned;
        const newLevel = Math.floor(newXp / 1000) + 1;
        const leveledUp = newLevel > window.SHARK.userData.level;
        
        if (leveledUp) {
            window.showToast(`🎉 LEVEL UP! You are now Level ${newLevel}!`, 'success');
        }

        window.SHARK.userData.xp = newXp;
        window.SHARK.userData.level = newLevel;
        window.SHARK.userData.quizzesTaken += 1;
        window.SHARK.userData.hours = (window.SHARK.userData.hours || 0) + hoursEarned;
        
        const today = new Date().toLocaleDateString('en-CA'); 
        if (!window.SHARK.userData.activity) window.SHARK.userData.activity = {};
        window.SHARK.userData.activity[today] = (window.SHARK.userData.activity[today] || 0) + xpEarned;

        db.collection('users').doc(window.SHARK.user.uid).update({
            xp: firebase.firestore.FieldValue.increment(xpEarned),
            level: newLevel,
            quizzesTaken: firebase.firestore.FieldValue.increment(1),
            hours: firebase.firestore.FieldValue.increment(hoursEarned),
            [`activity.${today}`]: firebase.firestore.FieldValue.increment(xpEarned)
        });
        
        // Update Nav Bar immediately
        updateNav();
    }
    window.router('analysis');
}

function viewAnalysis() {
    const qs = window.SHARK.quizSession;
    const percent = Math.round((qs.score / qs.pool.length) * 100);

    const reviewCards = qs.history.map((h, i) => `
        <div class="glass-panel p-6 rounded-xl border-l-4 ${h.isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'}">
            <div class="flex justify-between items-center mb-4">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Question ${i+1}</span>
                <span class="material-symbols-outlined ${h.isCorrect ? 'text-emerald-500' : 'text-rose-500'}">${h.isCorrect ? 'check_circle' : 'cancel'}</span>
            </div>
            <p class="font-bold mb-4">${h.q.question}</p>
            <div class="bg-white/5 p-4 rounded-lg mb-2 ${h.isCorrect ? '' : 'border border-rose-500/30'}">
                <span class="text-xs text-slate-400 block mb-1">Your Answer:</span>
                <p class="${h.isCorrect ? 'text-emerald-400' : 'text-rose-400'}">${h.q['opt'+h.selected]}</p>
            </div>
            ${!h.isCorrect ? `
            <div class="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <span class="text-xs text-primary block mb-1 font-bold">Correct Answer:</span>
                <p class="text-white">${h.q['opt'+h.q.correct]}</p>
                ${h.q.explanation ? `<p class="text-xs text-slate-400 mt-2">${h.q.explanation}</p>` : ''}
            </div>` : ''}
        </div>
    `).join('');

    return `
    <div class="max-w-4xl mx-auto space-y-8 py-8">
        <div>
            <h1 class="text-4xl font-black tracking-tight mb-2">Quiz Analysis</h1>
            <p class="text-slate-400">Detailed breakdown of your "${qs.subject}" session.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="glass-panel p-6 rounded-2xl">
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Total Score</p>
                <p class="text-4xl font-black mb-1">${qs.score}/${qs.pool.length}</p>
                <p class="text-sm ${percent >= 50 ? 'text-emerald-400' : 'text-rose-400'}">${percent}% Accuracy</p>
            </div>
            <div class="glass-panel p-6 rounded-2xl relative overflow-hidden">
                <span class="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl text-white/5">bolt</span>
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">XP Gained</p>
                <p class="text-4xl font-black text-primary mb-1 neon-text">+${qs.xpEarned} XP</p>
                <p class="text-sm text-primary font-bold">Keep grinding!</p>
            </div>
            <div class="glass-panel p-6 rounded-2xl">
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Time Spent</p>
                <p class="text-4xl font-black mb-4">${qs.finalTime}</p>
                <div class="w-full bg-white/10 h-1.5 rounded-full"><div class="bg-primary h-1.5 rounded-full w-1/2"></div></div>
            </div>
        </div>
        <div class="flex justify-between items-center mt-10 mb-4">
            <h2 class="text-2xl font-bold">Review Questions</h2>
            <div class="flex gap-2 text-xs font-bold">
                <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded">${qs.score} Correct</span>
                <span class="px-3 py-1 bg-rose-500/20 text-rose-400 rounded">${qs.pool.length - qs.score} Incorrect</span>
            </div>
        </div>
        <div class="space-y-4">${reviewCards}</div>
        
        <div class="flex flex-col sm:flex-row gap-4 mt-8">
            <button onclick="window.initQuiz('${qs.subject}')" class="btn-ghost flex-1 py-4 rounded-xl text-lg flex justify-center items-center gap-2">
                <span class="material-symbols-outlined">refresh</span> Practice Again
            </button>
            
            <button onclick="window.shareResult()" class="btn-primary flex-1 py-4 rounded-xl text-lg flex justify-center items-center gap-2">
                <span class="material-symbols-outlined">share</span> Share Achievement
            </button>
        </div>
        <div class="flex gap-4 mt-4">
            <button onclick="window.router('dashboard')" class="bg-white/5 border border-white/10 w-full py-4 rounded-xl text-lg flex justify-center items-center gap-2 hover:bg-white/10 transition-all">
                <span class="material-symbols-outlined">dashboard</span> Back to Dashboard
            </button>
        </div>
    </div>`;
}

window.shareResult = () => {
    const qs = window.SHARK.quizSession;
    const percent = Math.round((qs.score / qs.pool.length) * 100);
    const appUrl = "https://ishark-aspirants.vercel.app";
    
    const shareText = `🔥 I just scored ${qs.score}/${qs.pool.length} (${percent}%) in "${qs.subject}" on I-SHARK! \n\n🚀 Can you beat my score? Challenge yourself here: \n${appUrl}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My I-SHARK Achievement',
            text: shareText,
            url: appUrl,
        }).catch(console.error);
    } else {
        const encodedText = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }
};

// FIX 4: REPAIR BROKEN ALERT BUTTONS
function viewAlerts() {
    const alertHtml = window.SHARK.alerts.map(a => `
        <div class="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
                <div class="flex items-center gap-3 mb-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${a.type === 'NEW' ? 'bg-primary/20 text-primary' : a.type === 'EXPIRED' ? 'bg-slate-800 text-slate-400' : 'bg-rose-500/20 text-rose-400'}">${a.type}</span>
                    <span class="text-xs text-slate-500 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">calendar_today</span> ${a.date}</span>
                </div>
                <h3 class="urdu-text text-2xl font-bold mb-2">${a.urdu}</h3>
                <p class="text-sm text-slate-400">${a.title}</p>
            </div>
            <div class="flex flex-col gap-2 min-w-[120px]">
                <button onclick="window.showToast('Full alert details opening soon...', 'success')" class="btn-ghost px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                    ${a.type === 'EXPIRED' ? 'Closed' : 'View Details'}
                </button>
                <button onclick="window.showToast('Alert Bookmarked!', 'success')" class="text-slate-500 hover:text-primary flex justify-center"><span class="material-symbols-outlined">bookmark</span></button>
            </div>
        </div>
    `).join('');

    return `
    <div class="max-w-4xl mx-auto space-y-6">
        <div>
            <h1 class="text-4xl font-black tracking-tight mb-2">Live Alerts Archive</h1>
            <p class="text-slate-400">Access the historical vault of exam notifications and job alerts.</p>
        </div>
        <div class="relative mb-8">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">search</span>
            <input type="text" placeholder="Search alerts (PPSC, FPSC, NTS...)" class="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-colors">
        </div>
        <div class="flex flex-wrap gap-2 mb-8">
            <button class="px-6 py-2 rounded-full bg-primary text-dark font-bold text-sm">All Sources</button>
            <button class="px-6 py-2 rounded-full bg-white/5 text-slate-300 font-bold text-sm border border-white/5 hover:border-primary/50 transition-colors">PPSC</button>
            <button class="px-6 py-2 rounded-full bg-white/5 text-slate-300 font-bold text-sm border border-white/5 hover:border-primary/50 transition-colors">FPSC</button>
        </div>
        <div class="space-y-4">${alertHtml}</div>
    </div>`;
}

// ==========================================
// ADMIN LOGIC & VIEWS
// ==========================================

function viewAdmin() {
    if(!window.SHARK.user || window.SHARK.user.email !== ADMIN_EMAIL) {
        return `<h1 class="text-center text-rose-500 text-4xl font-black py-20 uppercase">Level 4 Clearance Required</h1>`;
    }

    return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
        <div class="lg:col-span-3 glass-panel p-6 rounded-2xl flex flex-col gap-2 h-max sticky top-32">
            <div class="flex items-center gap-3 mb-8 text-primary">
                <span class="material-symbols-outlined text-3xl">tsunami</span>
                <h2 class="font-black text-xl uppercase tracking-tighter">Command</h2>
            </div>
            <button onclick="document.getElementById('admin-content').innerHTML = window.getAdminDash()" class="text-left px-4 py-3 rounded-lg hover:bg-white/5 text-slate-400 focus:bg-primary/10 focus:text-primary font-bold flex gap-3"><span class="material-symbols-outlined">dashboard</span> Dashboard</button>
            
            <button onclick="document.getElementById('admin-content').innerHTML = window.getAdminMCQs()" class="text-left px-4 py-3 rounded-lg hover:bg-white/5 text-slate-400 focus:bg-primary/10 focus:text-primary font-bold flex gap-3"><span class="material-symbols-outlined">database</span> Database Engine</button>
            
            <button onclick="document.getElementById('admin-content').innerHTML = window.getAdminUsers()" class="text-left px-4 py-3 rounded-lg hover:bg-white/5 text-slate-400 focus:bg-primary/10 focus:text-primary font-bold flex gap-3"><span class="material-symbols-outlined">group</span> Users</button>
            <div class="mt-auto pt-8">
                <button onclick="window.router('dashboard')" class="text-left w-full px-4 py-3 rounded-lg text-rose-400 hover:bg-rose-500/10 font-bold flex gap-3"><span class="material-symbols-outlined">logout</span> Exit Admin</button>
            </div>
        </div>

        <div id="admin-content" class="lg:col-span-9 space-y-6">
            ${window.getAdminDash()} 
        </div>
    </div>`;
}

window.getAdminDash = () => {
    const alertsList = window.SHARK.alerts.slice(0, 8).map(a => `
        <div class="flex justify-between items-center p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
            <div class="truncate pr-4 flex items-center gap-2">
                <span class="px-2 py-0.5 bg-white/10 rounded text-[8px] font-bold uppercase ${a.type==='NEW'?'text-primary':''}">${a.type}</span>
                <span class="text-sm text-slate-300 truncate">${a.title}</span>
            </div>
            <button onclick="window.deleteAlert('${a.id}')" class="text-rose-500 hover:text-rose-400 p-1 bg-rose-500/10 rounded"><span class="material-symbols-outlined text-sm block">delete</span></button>
        </div>
    `).join('') || '<p class="text-slate-500 text-sm p-4 text-center">No alerts to manage.</p>';

    return `
    <div class="grid grid-cols-3 gap-6 mb-8 animate-fade-in">
        <div class="bg-panel border border-white/5 p-6 rounded-xl">
            <p class="text-xs text-slate-400 font-bold uppercase mb-1">Total MCQs</p>
            <p class="text-3xl font-black text-white">${window.SHARK.mcqs.length}</p>
        </div>
        <div class="bg-panel border border-white/5 p-6 rounded-xl">
            <p class="text-xs text-slate-400 font-bold uppercase mb-1">Active Alerts</p>
            <p class="text-3xl font-black text-white">${window.SHARK.alerts.length}</p>
        </div>
        <div class="bg-panel border border-white/5 p-6 rounded-xl">
            <p class="text-xs text-slate-400 font-bold uppercase mb-1">System Health</p>
            <p class="text-3xl font-black text-emerald-400">100%</p>
        </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
        <div class="glass-panel p-8 rounded-2xl flex flex-col h-full">
            <h3 class="text-xl font-bold mb-6 flex items-center gap-2"><span class="material-symbols-outlined text-primary">cloud_upload</span> Bulk Upload (CSV)</h3>
            <div class="border-2 border-dashed border-white/20 rounded-xl flex-grow flex flex-col items-center justify-center p-10 text-center bg-black/20 relative group hover:border-primary transition-colors cursor-pointer min-h-[250px]">
                <span class="material-symbols-outlined text-5xl text-slate-500 mb-4 group-hover:text-primary transition-colors">upload_file</span>
                <p class="font-bold mb-1 text-lg text-white">Drop CSV file here or <span class="text-primary cursor-pointer">browse</span></p>
                <p class="text-sm text-slate-500 mt-2 font-mono">Format: Question, OptA, OptB, OptC, OptD, Correct(A-D), Subject</p>
                <input type="file" id="csv-file" accept=".csv" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="handleCSV(event)">
            </div>
        </div>

        <div class="glass-panel p-8 rounded-2xl flex flex-col h-full">
            <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-white"><span class="material-symbols-outlined text-primary">campaign</span> Alerts Manager</h3>
            
            <div class="flex-grow bg-black/30 border border-white/5 rounded-xl overflow-hidden mb-6 overflow-y-auto max-h-[180px]">
                ${alertsList}
            </div>

            <div class="space-y-4 border-t border-white/10 pt-4">
                <div class="grid grid-cols-2 gap-2">
                    <input id="alert-title" maxlength="100" placeholder="English Title..." class="bg-black/50 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-primary text-white">
                    <select id="alert-type" class="bg-black/50 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-primary text-white">
                        <option value="NEW">NEW</option>
                        <option value="URGENT">URGENT</option>
                        <option value="EXPIRED">EXPIRED</option>
                    </select>
                </div>
                <textarea id="alert-urdu" dir="rtl" maxlength="500" placeholder="Urdu Text..." class="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs h-16 outline-none focus:border-primary urdu-text text-white"></textarea>
                
                <button id="publish-btn" onclick="publishAlert()" class="btn-primary w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <span id="publish-btn-text">Publish Alert</span>
                </button>
            </div>
        </div>
    </div>
`;
}

window.getAdminUsers = () => {
    if(!window.SHARK.allUsers || window.SHARK.allUsers.length === 0) fetchLeaderboard(); 
    const userRows = (window.SHARK.allUsers || []).map(u => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
            <td class="py-4 px-4 flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-800 text-primary flex items-center justify-center font-bold border border-white/10">${u.name ? u.name.charAt(0) : 'U'}</div>
                <div>
                    <p class="font-bold text-slate-200">${u.name || 'Anonymous'}</p>
                    <p class="text-xs text-slate-500">${u.email || 'No email'}</p>
                </div>
            </td>
            <td class="py-4 px-4 text-primary font-mono font-bold">Lvl ${u.level || Math.floor(u.xp/1000)+1}</td>
            <td class="py-4 px-4 font-mono text-white">${(u.xp || 0).toLocaleString()}</td>
            <td class="py-4 px-4 text-slate-400">${u.joinDate && u.joinDate.seconds ? new Date(u.joinDate.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
            <td class="py-4 px-4">
                <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs font-bold border border-emerald-500/20">Active</span>
            </td>
        </tr>
    `).join('');

    return `
    <div class="glass-panel rounded-2xl overflow-hidden animate-fade-in">
        <div class="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 class="text-xl font-bold flex items-center gap-2 text-white"><span class="material-symbols-outlined text-primary">manage_accounts</span> User Management</h3>
            <span class="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-bold">${window.SHARK.allUsers?.length || 0} Total Users</span>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="text-xs text-slate-500 uppercase tracking-widest bg-black/20 border-b border-white/5">
                        <th class="py-3 px-4 font-bold">User</th>
                        <th class="py-3 px-4 font-bold">Level</th>
                        <th class="py-3 px-4 font-bold">Total XP</th>
                        <th class="py-3 px-4 font-bold">Join Date</th>
                        <th class="py-3 px-4 font-bold">Status</th>
                    </tr>
                </thead>
                <tbody id="admin-user-table-body">
                    ${userRows || `<tr><td colspan="5" class="py-10 text-center text-slate-500">Loading user data...</td></tr>`}
                </tbody>
            </table>
        </div>
    </div>`;
};

// --- FIX 3: MCQ MANAGEMENT UI (NOW WITH IMAGE SUPPORT) ---
window.getAdminMCQs = () => {
    setTimeout(() => window.renderMCQTable(), 0);

    return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        <div class="lg:col-span-2 glass-panel rounded-2xl flex flex-col h-[80vh]">
            <div class="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 class="text-xl font-bold flex items-center gap-2 text-white"><span class="material-symbols-outlined text-primary">database</span> Data Viewer</h3>
                <div class="relative">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input type="text" id="mcq-search" onkeyup="window.renderMCQTable(this.value)" placeholder="Search questions..." class="bg-black/50 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-primary text-white w-64 transition-all focus:w-80">
                </div>
            </div>
            <div class="overflow-y-auto flex-grow p-0 relative">
                <table class="w-full text-left border-collapse">
                    <thead class="sticky top-0 bg-panel border-b border-white/5 z-10 shadow-lg">
                        <tr class="text-[10px] text-slate-500 uppercase tracking-widest">
                            <th class="py-3 px-6 font-bold w-1/2">Question</th>
                            <th class="py-3 px-4 font-bold">Subject</th>
                            <th class="py-3 px-6 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="mcq-table-body">
                    </tbody>
                </table>
            </div>
        </div>

        <div class="glass-panel p-6 rounded-2xl flex flex-col h-max sticky top-32 overflow-y-auto max-h-[80vh]">
            <h3 id="mcq-form-title" class="text-xl font-bold mb-6 flex items-center gap-2 text-white"><span class="material-symbols-outlined text-primary" id="form-icon">add_box</span> <span id="form-title-text">Add New MCQ</span></h3>
            <input type="hidden" id="single-id" value="">
            <div class="space-y-4 flex-grow">
                <textarea id="single-q" placeholder="Type the question here..." class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm h-24 outline-none focus:border-primary text-white transition-colors"></textarea>
                <input id="single-img" placeholder="Image URL (Optional)" class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-primary text-primary transition-colors">
                <input id="single-a" placeholder="Option A" class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-primary text-white transition-colors">
                <input id="single-b" placeholder="Option B" class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-primary text-white transition-colors">
                <input id="single-c" placeholder="Option C" class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-primary text-white transition-colors">
                <input id="single-d" placeholder="Option D" class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-primary text-white transition-colors">
                <div class="grid grid-cols-2 gap-3 pt-2">
                    <select id="single-corr" class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-primary text-white transition-colors">
                        <option value="A">Correct: A</option><option value="B">Correct: B</option><option value="C">Correct: C</option><option value="D">Correct: D</option>
                    </select>
                    <input id="single-sub" placeholder="Subject" list="subject-list" class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-primary text-white transition-colors">
                    <datalist id="subject-list">
                        ${window.SHARK.subjects.map(s => `<option value="${s}">`).join('')}
                    </datalist>
                </div>
                <div class="pt-4">
                    <button id="save-mcq-btn" onclick="window.saveSingleMCQ()" class="btn-primary w-full py-4 rounded-lg text-sm font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-all">
                        <span id="save-mcq-text">Save to Database</span>
                    </button>
                    <button onclick="window.resetMCQForm()" class="w-full py-3 mt-2 text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-white transition-colors">Clear Form</button>
                </div>
            </div>
        </div>
    </div>`;
};

// --- DATABASE ENGINE LOGIC (CRUD) ---
window.renderMCQTable = (filterTerm = '') => {
    const tbody = document.getElementById('mcq-table-body');
    if(!tbody) return;
    const term = filterTerm.toLowerCase();
    
    const matching = window.SHARK.mcqs.filter(m => 
        m.question.toLowerCase().includes(term) || 
        m.subject.toLowerCase().includes(term)
    );
    
    const filtered = matching.slice(0, 50);
    
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-10 text-center text-slate-500 italic">No questions found.</td></tr>`;
        return;
    }
    
    let html = filtered.map(m => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors group">
            <td class="py-4 px-6 text-sm font-medium text-slate-200 line-clamp-2">${m.question}</td>
            <td class="py-4 px-4 text-xs font-bold text-primary tracking-wider uppercase">${m.subject}</td>
            <td class="py-4 px-6 text-right space-x-2 opacity-20 group-hover:opacity-100 transition-opacity">
                <button onclick="window.editMCQ('${m.id}')" class="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                <button onclick="window.deleteMCQ('${m.id}')" class="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-colors"><span class="material-symbols-outlined text-[18px]">delete</span></button>
            </td>
        </tr>
    `).join('');
    
    if (matching.length > 50) {
        html += `<tr><td colspan="3" class="py-4 text-center text-xs text-slate-500 bg-white/5 font-bold uppercase tracking-widest">Showing 50 of ${matching.length} records. Use search to find more.</td></tr>`;
    }
    
    tbody.innerHTML = html;
};

window.saveSingleMCQ = async () => {
    if(!window.SHARK.user || window.SHARK.user.email !== ADMIN_EMAIL) return window.showToast("Unauthorized Access", "error");

    const id = document.getElementById('single-id').value;
    const q = document.getElementById('single-q').value.trim();
    const img = document.getElementById('single-img').value.trim(); // NEW Image Input
    const a = document.getElementById('single-a').value.trim();
    const b = document.getElementById('single-b').value.trim();
    const c = document.getElementById('single-c').value.trim();
    const d = document.getElementById('single-d').value.trim();
    const corr = document.getElementById('single-corr').value;
    const sub = document.getElementById('single-sub').value.trim();
    
    if(!q || !a || !b || !c || !d || !sub) return window.showToast("Error: All fields are required.", "error");
    
    const btn = document.getElementById('save-mcq-btn');
    const text = document.getElementById('save-mcq-text');
    btn.disabled = true;
    text.innerText = "Syncing...";
    
    const payload = { question: q, optA: a, optB: b, optC: c, optD: d, correct: corr, subject: sub };
    if(img) payload.image = img;
    
    try {
        if(id) {
            await db.collection('mcqs').doc(id).update(payload);
            const index = window.SHARK.mcqs.findIndex(m => m.id === id);
            if(index !== -1) window.SHARK.mcqs[index] = { id, ...payload };
            window.showToast("MCQ Updated Successfully!");
        } else {
            payload.timestamp = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('mcqs').add(payload);
            window.SHARK.mcqs.unshift({ id: docRef.id, ...payload }); 
            window.showToast("New MCQ Added to Database!");
        }
        window.resetMCQForm();
        window.renderMCQTable(document.getElementById('mcq-search').value); 
    } catch(e) {
        window.showToast("Database Error: " + e.message, "error");
    } finally {
        btn.disabled = false;
        text.innerText = "Save to Database";
    }
};

window.editMCQ = (id) => {
    const mcq = window.SHARK.mcqs.find(m => m.id === id);
    if(!mcq) return;
    document.getElementById('single-id').value = mcq.id;
    document.getElementById('single-q').value = mcq.question;
    document.getElementById('single-img').value = mcq.image || ''; // Populates Image if exists
    document.getElementById('single-a').value = mcq.optA;
    document.getElementById('single-b').value = mcq.optB;
    document.getElementById('single-c').value = mcq.optC;
    document.getElementById('single-d').value = mcq.optD;
    document.getElementById('single-corr').value = mcq.correct;
    document.getElementById('single-sub').value = mcq.subject;
    
    document.getElementById('form-icon').innerText = 'edit';
    document.getElementById('form-title-text').innerText = 'Edit Database Entry';
    document.getElementById('save-mcq-text').innerText = 'Update Record';
    document.getElementById('mcq-form-title').scrollIntoView({ behavior: 'smooth' });
};

window.deleteMCQ = async (id) => {
    if(!window.SHARK.user || window.SHARK.user.email !== ADMIN_EMAIL) return window.showToast("Unauthorized", "error");
    if(!confirm("CRITICAL WARNING: This will permanently delete this question. Proceed?")) return;
    
    try {
        await db.collection('mcqs').doc(id).delete();
        window.SHARK.mcqs = window.SHARK.mcqs.filter(m => m.id !== id);
        window.renderMCQTable(document.getElementById('mcq-search').value);
        window.showToast("Question Eradicated from Database.", "success");
    } catch(e) {
        window.showToast("Delete Failed: " + e.message, "error");
    }
};

window.resetMCQForm = () => {
    document.getElementById('single-id').value = '';
    document.getElementById('single-q').value = '';
    document.getElementById('single-img').value = '';
    document.getElementById('single-a').value = '';
    document.getElementById('single-b').value = '';
    document.getElementById('single-c').value = '';
    document.getElementById('single-d').value = '';
    document.getElementById('single-sub').value = '';
    document.getElementById('form-icon').innerText = 'add_box';
    document.getElementById('form-title-text').innerText = 'Add New MCQ';
    document.getElementById('save-mcq-text').innerText = 'Save to Database';
};

window.deleteAlert = async (id) => {
    if(!window.SHARK.user || window.SHARK.user.email !== ADMIN_EMAIL) return;
    if(!confirm("Delete this alert permanently?")) return;
    
    try {
        await db.collection('alerts').doc(id).delete();
        window.SHARK.alerts = window.SHARK.alerts.filter(a => a.id !== id);
        window.showToast("Alert successfully deleted.");
        document.getElementById('admin-content').innerHTML = window.getAdminDash(); 
    } catch(e) {
        window.showToast("Failed to delete alert: " + e.message, 'error');
    }
};

window.publishAlert = async () => {
    if(!window.SHARK.user || window.SHARK.user.email !== ADMIN_EMAIL) return window.showToast("Unauthorized", "error");

    const title = document.getElementById('alert-title').value.trim();
    const urdu = document.getElementById('alert-urdu').value.trim();
    const type = document.getElementById('alert-type').value;
    const btn = document.getElementById('publish-btn');
    const btnText = document.getElementById('publish-btn-text');
    
    if(!title || !urdu) return window.showToast("Both English and Urdu details are required.", "error");

    btn.disabled = true;
    btnText.innerText = "Broadcasting...";
    
    const dateOpts = { day: 'numeric', month: 'short', year: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('en-GB', dateOpts);
    
    const data = { title: title, urdu: urdu, type: type, date: formattedDate, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
    
    try {
        const docRef = await db.collection('alerts').add(data);
        window.SHARK.alerts.unshift({ id: docRef.id, ...data });
        window.showToast("Alert Broadcasted Successfully!", 'success');
        document.getElementById('admin-content').innerHTML = window.getAdminDash(); 
    } catch(e) {
        window.showToast("Database Error: " + e.message, "error");
        btn.disabled = false;
        btnText.innerText = "Publish Alert";
    }
};

// --- FIX 5: WINDOWS CSV CORRUPTION PROTECTION ---
window.handleCSV = (e) => {
    if(!window.SHARK.user || window.SHARK.user.email !== ADMIN_EMAIL) return window.showToast("Unauthorized", "error");
    
    const file = e.target.files[0];
    if(!file) return;
    
    window.showToast("Encrypting and Syncing CSV...", "success");
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target.result;
        const rows = text.split('\n').slice(1); 
        let count = 0;
        const batch = db.batch(); 
        const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        
        rows.forEach(row => {
            if(!row.trim()) return; 
            // Removes \r \n artifacts from bad Excel saves
            const cols = row.split(csvRegex).map(c => c.replace(/^"|"$/g, '').replace(/[\r\n]+/g, '').trim());
            if(cols.length >= 7 && cols[0]) {
                const ref = db.collection('mcqs').doc();
                batch.set(ref, { question: cols[0], optA: cols[1], optB: cols[2], optC: cols[3], optD: cols[4], correct: cols[5].toUpperCase(), subject: cols[6], timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                count++;
            }
        });
        
        if(count > 0 && count <= 500) {
            try {
                await batch.commit();
                window.showToast(`SUCCESS: Uploaded ${count} MCQs to Vault!`, 'success');
                setTimeout(() => window.location.reload(), 1500);
            } catch(error) {
                window.showToast("Sync Error: " + error.message, 'error');
            }
        } else if (count > 500) {
            window.showToast("Please limit your CSV file to 500 questions per batch.", 'error');
        } else {
            window.showToast("Format Error: Ensure your CSV has 7 valid columns.", 'error');
        }
        e.target.value = ''; 
    };
    reader.readAsText(file);
};

// ==========================================
// LEADERBOARD SYNC
// ==========================================

async function fetchLeaderboard() {
    try {
        const snap = await db.collection('users').orderBy('xp', 'desc').limit(50).get();
        window.SHARK.allUsers = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        const cont = document.getElementById("view-container");
        if(cont && (cont.innerHTML.includes("Loading Leaderboard Data") || cont.innerHTML.includes("The Hall of Fame"))) {
            cont.innerHTML = viewLeaderboard();
        }

        const adminBody = document.getElementById("admin-user-table-body");
        if(adminBody) {
            adminBody.innerHTML = window.SHARK.allUsers.map(u => `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                    <td class="py-4 px-4 flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-800 text-primary flex items-center justify-center font-bold border border-white/10">${u.name ? u.name.charAt(0) : 'U'}</div>
                        <div><p class="font-bold text-slate-200">${u.name || 'Anonymous'}</p><p class="text-xs text-slate-500">${u.email || 'No email'}</p></div>
                    </td>
                    <td class="py-4 px-4 text-primary font-mono font-bold">Lvl ${u.level || Math.floor(u.xp/1000)+1}</td>
                    <td class="py-4 px-4 font-mono text-white">${(u.xp || 0).toLocaleString()}</td>
                    <td class="py-4 px-4 text-slate-400">${u.joinDate && u.joinDate.seconds ? new Date(u.joinDate.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                    <td class="py-4 px-4"><span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs font-bold border border-emerald-500/20">Active</span></td>
                </tr>
            `).join('');
        }
    } catch(e) { console.error("Leaderboard Sync Error:", e); }
}

function viewLeaderboard() {
    if(!window.SHARK.allUsers || window.SHARK.allUsers.length === 0) return `<div class="text-center py-20 animate-pulse text-primary">Loading Leaderboard Data...</div>`;
    const list = window.SHARK.allUsers.map((u, i) => `
        <div class="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${u.id === (window.SHARK.user?.uid) ? 'bg-primary/10 border-primary/30' : ''}">
            <div class="flex items-center gap-6 w-1/2">
                <span class="text-lg font-black ${i < 3 ? 'text-[#ffb703]' : 'text-slate-500'} w-6">${(i+1).toString().padStart(2,'0')} ${i<3?'<span class="material-symbols-outlined text-sm">workspace_premium</span>':''}</span>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-primary">${u.name?u.name.charAt(0):'U'}</div>
                    <span class="font-bold text-slate-200">${u.name || 'Anonymous Shark'}</span>
                </div>
            </div>
            <div class="w-1/4 text-center"><span class="px-3 py-1 bg-white/5 rounded text-xs text-slate-400 font-bold border border-white/10">Lvl ${u.level || Math.floor(u.xp/1000)+1}</span></div>
            <div class="w-1/4 text-right font-mono font-bold text-primary">${u.xp.toLocaleString()}</div>
        </div>
    `).join('');
    return `
    <div class="max-w-4xl mx-auto py-8 relative">
        <div class="text-center mb-10">
            <h1 class="text-5xl font-black tracking-tight mb-2">The Hall of Fame</h1>
            <p class="text-primary font-bold uppercase tracking-widest text-sm">— Top 50 Apex Sharks Ranked by XP —</p>
        </div>
        <div class="glass-panel rounded-3xl overflow-hidden pb-4">
            <div class="flex text-xs font-bold text-slate-500 uppercase tracking-widest p-6 border-b border-white/5">
                <div class="w-1/2 pl-12">Rank & Profile</div>
                <div class="w-1/4 text-center">Level</div>
                <div class="w-1/4 text-right">Total XP</div>
            </div>
            ${list}
        </div>
    </div>`;
}

function populateDummyData() {
    window.SHARK.alerts = [
        { id: 'dummy1', title: "Welcome to I-SHARK. Start your prep today.", urdu: "آئی شارک میں خوش آمدید۔ اپنی تیاری آج ہی شروع کریں۔", date: new Date().toLocaleDateString(), type: "NEW" }
    ];
}