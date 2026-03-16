/**
 * I-SHARK ENTERPRISE CORE
 * Architecture: Serverless SPA via Vanilla ES6
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

// --- GLOBAL STATE ---
window.SHARK = {
    user: null,
    userData: { xp: 0, level: 1, quizzesTaken: 0, hours: 0 },
    mcqs: [],
    alerts: [],
    allUsers: [],
    subjects: ['General Knowledge', 'Pakistan Affairs', 'Islamiyat', 'Everyday Science', 'English', 'Current Affairs'],
    quizSession: { active: false, subject: '', pool: [], index: 0, score: 0, timeStart: null, history: [] }
};

// --- AUTHENTICATION ---
window.login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => alert("Login Failed: " + e.message));
};

window.logout = () => auth.signOut().then(() => window.location.reload());

auth.onAuthStateChanged(async (user) => {
    if (user) {
        window.SHARK.user = user;
        // Sync user doc
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        if(!doc.exists) {
            await userRef.set({ name: user.displayName, email: user.email, xp: 0, level: 1, joinDate: new Date() });
        } else {
            window.SHARK.userData = { ...window.SHARK.userData, ...doc.data() };
        }
        updateNav();
        if(document.getElementById('view-container').innerHTML.includes('autorenew')) initApp();
    } else {
        window.SHARK.user = null;
        initApp(); // Boot as guest
    }
});

// --- BOOTSTRAP ---
// --- BOOTSTRAP ---
async function initApp() {
    try {
        const [mcqSnap, alertSnap] = await Promise.all([
            db.collection("mcqs").limit(2000).get(), // Increased limit to fetch all your uploaded MCQs
            db.collection("alerts").orderBy("date", "desc").limit(20).get()
        ]);
        
        window.SHARK.mcqs = mcqSnap.docs.map(d => ({id: d.id, ...d.data()}));
        window.SHARK.alerts = alertSnap.docs.map(d => ({id: d.id, ...d.data()}));
        
        // NEW ENTERPRISE LOGIC: Dynamically extract unique subjects from your database
        const dynamicSubjects = [...new Set(window.SHARK.mcqs.map(m => m.subject))].filter(Boolean);
        
        // Merge the new database subjects with the default ones
        window.SHARK.subjects = [...new Set([...window.SHARK.subjects, ...dynamicSubjects])];
        
        // Populate dummy data if DB is empty to show UI
        if(window.SHARK.mcqs.length === 0) populateDummyData();

        window.router('dashboard');
    } catch(e) {
        console.error(e);
        document.getElementById("view-container").innerHTML = `<div class="text-red-500 p-10 text-center font-mono">CRITICAL DB LINK FAILURE</div>`;
    }
}
        // Populate dummy data if DB is empty to show UI
        if(window.SHARK.mcqs.length === 0) populateDummyData();

        window.router('dashboard');
    } catch(e) {
        console.error(e);
        document.getElementById("view-container").innerHTML = `<div class="text-red-500 p-10 text-center font-mono">CRITICAL DB LINK FAILURE</div>`;
    }
}

function updateNav() {
    const u = window.SHARK.user;
    if(!u) return;
    document.getElementById('login-btn').classList.add('hidden');
    document.getElementById('user-profile').classList.remove('hidden');
    document.getElementById('user-initial').innerText = u.displayName ? u.displayName.charAt(0) : 'S';
    document.getElementById('nav-xp').innerText = window.SHARK.userData.xp.toLocaleString();
    document.getElementById('nav-level').innerText = window.SHARK.userData.level;
    
    if(u.email === ADMIN_EMAIL) {
        document.getElementById('admin-link').classList.remove('hidden');
    }
}

// --- ROUTER ---
window.router = (view) => {
    const cont = document.getElementById("view-container");
    cont.classList.remove('animate-fade-in');
    void cont.offsetWidth; 
    cont.classList.add('animate-fade-in');
    window.scrollTo(0,0);

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
    const icons = { 'General Knowledge':'public', 'Pakistan Affairs':'account_balance', 'Islamiyat':'menu_book', 'Everyday Science':'science', 'English':'translate', 'Current Affairs':'newspaper' };
    
    const cards = window.SHARK.subjects.map(s => {
        const count = window.SHARK.mcqs.filter(m => m.subject === s).length;
        return `
        <div onclick="window.initQuiz('${s}')" class="glass-panel p-8 rounded-2xl cursor-pointer group relative overflow-hidden">
            <div class="absolute top-6 right-6 px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase">Active</div>
            <div class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <span class="material-symbols-outlined text-primary text-2xl">${icons[s] || 'folder'}</span>
            </div>
            <h3 class="text-xl font-bold mb-2 group-hover:text-primary transition-colors">${s}</h3>
            <p class="text-sm text-slate-400 mb-6">Master core concepts and historical data. Contains ${count} questions.</p>
        </div>`;
    }).join('');

    return `
    <div class="space-y-8 max-w-5xl mx-auto">
        <div>
            <h1 class="text-4xl font-black tracking-tight mb-2">Subject Vault</h1>
            <p class="text-slate-400">Choose your field of study to begin practice. Master each category.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${cards}</div>
    </div>`;
}

window.initQuiz = (subject) => {
    let pool = window.SHARK.mcqs.filter(m => m.subject === subject);
    if(pool.length < 5) return alert("Not enough questions in this category yet.");
    
    pool = pool.sort(() => 0.5 - Math.random()).slice(0, 10);
    window.SHARK.quizSession = { active: true, subject, pool, index: 0, score: 0, timeStart: Date.now(), history: [] };
    window.router('quiz');
};

let quizTimer;
function startTimer() {
    let sec = 0;
    clearInterval(quizTimer);
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
            
            <h2 class="text-3xl font-bold text-center leading-tight mb-10">${q.question}</h2>
            ${q.image ? `<img src="${q.image}" class="w-full rounded-xl mb-8 border border-white/10">` : ''}

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
        btn.classList.remove('border-primary', 'bg-primary/10');
        btn.querySelector('div:last-child').classList.remove('border-primary', 'bg-primary');
    });
    const selected = document.getElementById(`opt-btn-${opt}`);
    selected.classList.add('border-primary', 'bg-primary/10');
    selected.querySelector('div:last-child').classList.add('border-primary', 'bg-primary');
    document.getElementById('submit-ans-btn').disabled = false;
};

window.submitAnswer = () => {
    const qs = window.SHARK.quizSession;
    const q = qs.pool[qs.index];
    const isCorrect = currentSelection === q.correct;
    
    if(isCorrect) qs.score++;
    qs.history.push({ q, selected: currentSelection, isCorrect });
    
    currentSelection = null;
    qs.index++;
    
    if(qs.index >= qs.pool.length) finalizeQuiz();
    else window.router('quiz'); 
};

function finalizeQuiz() {
    clearInterval(quizTimer);
    const qs = window.SHARK.quizSession;
    const timeSpent = Math.floor((Date.now() - qs.timeStart) / 1000);
    const xpEarned = qs.score * 50;
    
    qs.finalTime = `${Math.floor(timeSpent/60)}:${(timeSpent%60).toString().padStart(2,'0')}`;
    qs.xpEarned = xpEarned;

    if(window.SHARK.user) {
        window.SHARK.userData.xp += xpEarned;
        window.SHARK.userData.quizzesTaken = (window.SHARK.userData.quizzesTaken || 0) + 1;
        
        const today = new Date().toLocaleDateString('en-CA'); 
        if (!window.SHARK.userData.activity) window.SHARK.userData.activity = {};
        window.SHARK.userData.activity[today] = (window.SHARK.userData.activity[today] || 0) + xpEarned;

        db.collection('users').doc(window.SHARK.user.uid).update({
            xp: firebase.firestore.FieldValue.increment(xpEarned),
            quizzesTaken: firebase.firestore.FieldValue.increment(1),
            [`activity.${today}`]: firebase.firestore.FieldValue.increment(xpEarned)
        });
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
        <div class="flex gap-4 mt-8">
            <button onclick="window.router('dashboard')" class="btn-primary w-full py-4 rounded-xl text-lg flex justify-center items-center gap-2">
                <span class="material-symbols-outlined">dashboard</span> Back to Dashboard
            </button>
        </div>
    </div>`;
}

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
                <button class="btn-ghost px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                    ${a.type === 'EXPIRED' ? 'Closed' : 'View Details'}
                </button>
                <button class="text-slate-500 hover:text-primary flex justify-center"><span class="material-symbols-outlined">bookmark</span></button>
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
// ADMIN LOGIC & VIEWS (Refactored Modularly)
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

window.getAdminDash = () => `
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
            <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-white"><span class="material-symbols-outlined text-primary">campaign</span> Publish New Alert</h3>
            <div class="space-y-4 flex-grow flex flex-col justify-between">
                <div>
                    <label class="text-xs text-slate-400 font-bold mb-1 block">Alert Title (English)</label>
                    <input id="alert-title" maxlength="100" placeholder="e.g., PPSC Lecturer Jobs 2024" class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-primary text-white transition-colors">
                </div>
                <div>
                    <label class="text-xs text-slate-400 font-bold mb-1 block">Urdu Description (اردو متن)</label>
                    <textarea id="alert-urdu" dir="rtl" maxlength="500" placeholder="یہاں تفصیل لکھیں..." class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm h-24 outline-none focus:border-primary urdu-text text-white transition-colors"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs text-slate-400 font-bold mb-1 block">Alert Type</label>
                        <select id="alert-type" class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-primary text-white cursor-pointer transition-colors">
                            <option value="NEW">NEW</option>
                            <option value="URGENT">URGENT</option>
                            <option value="EXPIRED">EXPIRED</option>
                        </select>
                    </div>
                </div>
                
                <div class="pt-2">
                    <p id="alert-status" class="text-xs font-bold mb-2 hidden text-center"></p>
                    <button id="publish-btn" onclick="publishAlert()" class="btn-primary w-full py-4 rounded-lg text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span class="material-symbols-outlined text-lg hidden" id="publish-spinner">sync</span>
                        <span id="publish-btn-text">Broadcast Alert</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
`;

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
                <tbody>
                    ${userRows || `<tr><td colspan="5" class="py-10 text-center text-slate-500">Loading user data...</td></tr>`}
                </tbody>
            </table>
        </div>
    </div>`;
};

window.publishAlert = async () => {
    const title = document.getElementById('alert-title').value.trim();
    const urdu = document.getElementById('alert-urdu').value.trim();
    const type = document.getElementById('alert-type').value;
    const btn = document.getElementById('publish-btn');
    const btnText = document.getElementById('publish-btn-text');
    const spinner = document.getElementById('publish-spinner');
    const statusMsg = document.getElementById('alert-status');
    
    if(!title || !urdu) {
        statusMsg.innerText = "Error: Please fill in both English and Urdu details.";
        statusMsg.className = "text-xs font-bold mb-2 text-rose-500 text-center animate-fade-in block";
        return;
    }

    btn.disabled = true;
    btnText.innerText = "Broadcasting...";
    spinner.classList.add('animate-spin');
    spinner.classList.remove('hidden');
    statusMsg.classList.add('hidden'); 

    const dateOpts = { day: 'numeric', month: 'short', year: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('en-GB', dateOpts);

    const data = {
        title: title,
        urdu: urdu,
        type: type,
        date: formattedDate,
        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    };

    try {
        await db.collection('alerts').add(data);
        btn.classList.replace('btn-primary', 'bg-emerald-500');
        btn.classList.add('text-dark');
        spinner.classList.remove('animate-spin');
        spinner.innerText = 'check_circle';
        btnText.innerText = "Broadcast Successful!";
        
        document.getElementById('alert-title').value = '';
        document.getElementById('alert-urdu').value = '';
        
        setTimeout(() => { window.location.reload(); }, 1500);
    } catch(e) {
        btn.disabled = false;
        btnText.innerText = "Broadcast Alert";
        spinner.classList.remove('animate-spin');
        spinner.classList.add('hidden');
        statusMsg.innerText = "Database Error: " + e.message;
        statusMsg.className = "text-xs font-bold mb-2 text-rose-500 text-center animate-fade-in block";
    }
};

window.handleCSV = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    e.target.parentElement.innerHTML = `<div class="loader-ring mx-auto mb-4"></div><p class="text-primary font-bold">Encrypting & Syncing Data...</p>`;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target.result;
        const rows = text.split('\n').slice(1); 
        let count = 0;
        const batch = db.batch(); 
        const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

        rows.forEach(row => {
            if(!row.trim()) return; 
            const cols = row.split(csvRegex).map(c => c.replace(/^"|"$/g, '').trim());
            
            if(cols.length >= 7 && cols[0]) {
                const ref = db.collection('mcqs').doc();
                batch.set(ref, { 
                    question: cols[0], 
                    optA: cols[1], 
                    optB: cols[2], 
                    optC: cols[3], 
                    optD: cols[4], 
                    correct: cols[5].toUpperCase(), 
                    subject: cols[6],
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                count++;
            }
        });

        if(count > 0 && count <= 500) {
            try {
                await batch.commit();
                alert(`SUCCESS: Uploaded ${count} MCQs to Vault!`);
                window.location.reload();
            } catch(error) {
                alert("Sync Error: " + error.message);
                window.location.reload();
            }
        } else if (count > 500) {
            alert("Please limit your CSV file to 500 questions per upload to respect Firestore Free Tier batch limits.");
            window.location.reload();
        } else {
            alert("Format Error: No valid questions found. Ensure your CSV has 7 columns.");
            window.location.reload();
        }
    };
    reader.readAsText(file);
};

// ==========================================
// LEADERBOARD & UTILITIES
// ==========================================

async function fetchLeaderboard() {
    try {
        const snap = await db.collection('users').orderBy('xp', 'desc').limit(50).get();
        window.SHARK.allUsers = snap.docs.map(d => ({id: d.id, ...d.data()}));
        window.router('leaderboard'); 
    } catch(e) { console.error(e); }
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

        ${window.SHARK.user ? `
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-gradient-to-r from-primary to-[#00f2fe] p-1 rounded-2xl shadow-[0_0_30px_rgba(13,242,242,0.3)] z-50">
            <div class="bg-panel rounded-xl px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-dark border-2 border-primary flex items-center justify-center font-black text-primary text-xl">${window.SHARK.user.displayName?.charAt(0) || 'U'}</div>
                    <div>
                        <p class="font-bold text-lg"><span class="text-slate-400 text-sm mr-2">Your Profile</span> ${window.SHARK.user.displayName}</p>
                        <p class="text-xs text-primary">Level ${window.SHARK.userData.level} • Keep grinding to climb!</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-black text-2xl text-white">${window.SHARK.userData.xp.toLocaleString()} XP</p>
                    <button onclick="window.router('vault')" class="bg-primary text-dark text-[10px] font-black uppercase px-4 py-1 rounded-full mt-1 hover:brightness-110 flex items-center gap-1">Go Practice <span class="material-symbols-outlined text-[12px]">bolt</span></button>
                </div>
            </div>
        </div>
        ` : ''}
    </div>`;
}

function populateDummyData() {
    window.SHARK.alerts = [
        { title: "PPSC officially announced vacancies for Lecturer positions...", urdu: "پنجاب پبلک سروس کمیشن: لیکچرر کی آسامیوں کا اعلان", date: "12 Oct 2024", type: "NEW" },
        { title: "Registration for CSS 2025 has commenced.", urdu: "فیڈرل پبلک سروس کمیشن: سی ایس ایس 2025 رجسٹریشن", date: "10 Oct 2024", type: "URGENT" }
    ];
    window.SHARK.mcqs = [
        { subject: "Geography", question: "Which pass connects Pakistan with Afghanistan?", optA: "Khyber Pass", optB: "Bolan Pass", optC: "Gomal Pass", optD: "Lowari Pass", correct: "A" },
        { subject: "General Knowledge", question: "What is the speed of light in vacuum?", optA: "300,000 km/s", optB: "150,000 km/s", optC: "400,000 km/s", optD: "500,000 km/s", correct: "A" },
        { subject: "Pakistan Affairs", question: "When did Pakistan become a Republic?", optA: "1947", optB: "1956", optC: "1962", optD: "1973", correct: "B" }
    ];
}