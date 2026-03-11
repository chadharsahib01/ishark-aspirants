/**
 * I-SHARK CORE ENGINE v2.5
 * 2026 Production Build - Debugged & Optimized
 */

const firebaseConfig = {
    apiKey: "AIzaSyC8nptTKV3cJtnkri-hDZNCTidlMeGcCIs",
    authDomain: "i-shark.firebaseapp.com",
    projectId: "i-shark",
    storageBucket: "i-shark.firebasestorage.app",
    messagingSenderId: "304378182943",
    appId: "1:304378182943:web:305b03b013367c8ff1c42a"
};

// 1. INITIALIZATION
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const ADMIN_EMAIL = "makkahmarble3@gmail.com";

// Global State
window.SHARK = {
    user: null,
    mcqs: [],
    notifications: [],
    subjects: [],
    xp: parseInt(localStorage.getItem('user_xp')) || 0
};

let quizState = { active: false, pool: [], index: 0, score: 0, answered: false, results: [] };

// Helper: Fisher-Yates Shuffle
function shuffle(arr) {
    let m = arr.length, t, i;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = arr[m]; arr[m] = arr[i]; arr[i] = t;
    }
    return arr;
}

// 2. BOOT SEQUENCE
async function boot() {
    try {
        const [nSnap, mSnap] = await Promise.all([
            db.collection("notifications").orderBy("timestamp", "desc").limit(10).get(),
            db.collection("mcqs").get()
        ]);

        window.SHARK.notifications = nSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.SHARK.mcqs = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.SHARK.subjects = [...new Set(window.SHARK.mcqs.map(m => m.Subject))].filter(Boolean).sort();

        const loader = document.getElementById("boot-loader");
        if(loader) loader.remove();
        
        window.router("home");
    } catch (e) {
        console.error("Critical Boot Failure:", e);
        document.body.innerHTML = `<div class="h-screen flex items-center justify-center bg-black text-red-500 font-black uppercase tracking-widest">Link Severed. Check Console.</div>`;
    }
}

// 3. ROUTER & NAVIGATION (Linked to Window)
window.router = function(view) {
    const cont = document.getElementById("view-container");
    if(!cont) return;
    window.scrollTo(0,0);
    
    switch(view) {
        case "home": renderHome(cont); break;
        case "vault": renderVault(cont); break;
        case "quiz": renderQuiz(); break;
        case "admin": renderAdmin(cont); break;
        default: renderHome(cont);
    }
};

// 4. IDENTITY MANAGEMENT (Linked to Window)
window.login = function() {
    const btn = document.getElementById("login-btn");
    if(btn) btn.innerText = "Connecting...";
    auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
};

window.logout = function() {
    auth.signOut().then(() => {
        localStorage.clear();
        location.reload();
    });
};

function updateProfileUI() {
    const prof = document.getElementById("user-profile");
    const loginBtn = document.getElementById("login-btn");
    const user = window.SHARK.user;

    if (user && prof) {
        if(loginBtn) loginBtn.classList.add("hidden");
        prof.classList.remove("hidden");
        const initial = document.getElementById("user-initial");
        const xpDisp = document.getElementById("nav-xp");
        if(initial) initial.innerText = user.displayName.charAt(0);
        if(xpDisp) xpDisp.innerText = `${window.SHARK.xp.toLocaleString()} XP`;
        
        if(user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            console.log("SHARK: Admin Mode Active. Access via router('admin')");
        }
    }
}

// --- PHASE 2: STUDENT DASHBOARD UI ---
function renderHome(cont) {
    const alertsHTML = window.SHARK.notifications.length ? 
        window.SHARK.notifications.map(n => `
            <div class="card p-5 flex justify-between items-center glass-panel rounded-xl mb-3 border-white/5">
                <div class="flex flex-col">
                    <a href="${n.Link || '#'}" target="_blank" class="font-bold text-slate-100 hover:text-primary transition-colors text-lg urdu-text italic">
                        ${n.Title || 'New Recruitment Update'}
                    </a>
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Official Notification</span>
                </div>
                <span class="text-[9px] font-black text-slate-700 uppercase">${n.Date || 'Recent'}</span>
            </div>
        `).join('') : `<p class="text-slate-600 italic text-xs uppercase tracking-widest">Scanning Database...</p>`;

    cont.innerHTML = `
        <div class="animate-view space-y-10">
            <header class="space-y-1">
                <h2 class="text-4xl font-black text-white tracking-tighter italic uppercase">Student Dashboard</h2>
                <p class="text-slate-400 font-medium">Your path to excellence starts here.</p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div class="lg:col-span-8 group glass-panel rounded-2xl p-8 border-white/5 overflow-hidden relative">
                    <div class="relative z-10">
                        <div class="flex items-center gap-2 mb-6">
                            <span class="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                            <span class="text-primary text-[10px] font-bold uppercase tracking-widest">Live Recruitment Alerts</span>
                        </div>
                        <div class="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">${alertsHTML}</div>
                    </div>
                </div>

                <div class="lg:col-span-4 glass-panel rounded-2xl p-8 border-white/5 flex flex-col justify-between">
                    <div>
                        <h3 class="text-2xl font-bold text-white mb-2 italic uppercase">Quiz Vault</h3>
                        <p class="text-slate-500 text-sm">Access time-bound mock exams tailored for competitive testing.</p>
                    </div>
                    <button onclick="router('vault')" class="btn-primary w-full mt-8">Enter Vault</button>
                </div>
            </div>
        </div>
    `;
    updateProfileUI();
}

// --- PHASE 3: SUBJECT SELECTION VAULT ---
function renderVault(cont) {
    const subjectsHTML = window.SHARK.subjects.map(s => `
        <div onclick="initQuiz('${s}')" class="glass-panel group rounded-xl p-6 flex flex-col justify-between aspect-[4/3] cursor-pointer hover:border-primary transition-all border-white/5">
            <span class="text-[10px] font-black text-primary uppercase tracking-widest">Active</span>
            <h3 class="text-xl font-bold text-white uppercase italic tracking-tighter">${s}</h3>
        </div>`).join('');

    cont.innerHTML = `
        <div class="animate-view space-y-8">
            <div class="flex justify-between items-center border-b border-white/5 pb-6">
                <h1 class="text-3xl font-black text-white italic uppercase tracking-tighter">Subject Vault</h1>
                <button onclick="router('home')" class="text-[10px] font-black text-slate-600 hover:text-white transition-colors uppercase">← Back</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${subjectsHTML || '<p class="text-slate-600 uppercase text-xs font-bold">No modules synced.</p>'}</div>
        </div>`;
}

// --- PHASE 4: THE FOCUS-MODE QUIZ ENGINE ---
window.initQuiz = function(sub) {
    const questions = shuffle(window.SHARK.mcqs.filter(m => m.Subject === sub)).slice(0, 10);
    if (!questions.length) return alert("This vault is currently empty.");

    quizState = { active: true, pool: questions, index: 0, score: 0, answered: false, results: [] };
    window.router("quiz");
};

function renderQuiz() {
    const q = quizState.pool[quizState.index];
    const cont = document.getElementById("view-container");
    const progress = ((quizState.index + 1) / quizState.pool.length) * 100;

    cont.innerHTML = `
        <div class="animate-view flex flex-col items-center">
            <div class="fixed top-0 left-0 w-full h-1 bg-white/5 z-50">
                <div class="h-full bg-primary shadow-[0_0_15px_#0df2f2] transition-all duration-500" style="width: ${progress}%"></div>
            </div>
            <div class="w-full max-w-3xl space-y-8">
                <div class="glass-panel rounded-2xl p-8 md:p-14 border-white/5 shadow-2xl">
                    <h1 class="text-2xl md:text-3xl font-bold text-white mb-10 tracking-tight leading-tight">${q.Question}</h1>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${["A", "B", "C", "D"].map(o => `
                            <button data-option="${o}" onclick="handleAnswer(this, '${o}')" 
                                class="glass-panel p-5 rounded-xl text-left flex items-center gap-4 hover:bg-white/5 transition-all group">
                                <span class="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs font-black group-hover:bg-primary group-hover:text-black transition-colors">${o}</span>
                                <span class="font-bold text-slate-300 group-hover:text-white transition-colors">${q["Option" + o]}</span>
                            </button>`).join('')}
                    </div>
                </div>
                <button id="btn-next" onclick="nextQ()" class="hidden btn-primary mx-auto">Next Question →</button>
            </div>
        </div>`;
}

window.handleAnswer = function(el, choice) {
    if (quizState.answered) return;
    quizState.answered = true;
    const correct = quizState.pool[quizState.index].CorrectOption.trim().toUpperCase();
    
    if (choice === correct) {
        el.style.borderColor = "#22c55e";
        quizState.score++;
    } else {
        el.style.borderColor = "#ef4444";
        document.querySelectorAll("[data-option]").forEach(btn => {
            if(btn.dataset.option === correct) btn.style.borderColor = "#22c55e";
        });
    }
    document.getElementById("btn-next").classList.remove("hidden");
};

window.nextQ = function() {
    quizState.index++;
    quizState.answered = false;
    if (quizState.index >= quizState.pool.length) {
        const earned = quizState.score * 10;
        window.SHARK.xp += earned;
        localStorage.setItem("user_xp", window.SHARK.xp);
        renderAnalysis();
    } else {
        renderQuiz();
    }
};

function renderAnalysis() {
    const cont = document.getElementById("view-container");
    cont.innerHTML = `
        <div class="animate-view glass-panel rounded-2xl p-12 text-center max-w-xl mx-auto border-white/5">
            <h2 class="text-3xl font-black text-white italic uppercase mb-2">Quiz Complete</h2>
            <p class="text-primary text-5xl font-black mb-6">${quizState.score} / 10</p>
            <p class="text-slate-500 text-sm mb-10 font-bold uppercase tracking-widest">+${quizState.score * 10} XP Earned</p>
            <button onclick="router('home')" class="btn-primary w-full">Return to Dashboard</button>
        </div>`;
}

// --- PHASE 5: ADMIN COMMAND CENTER ---
function renderAdmin(cont) {
    if (!window.SHARK.user || window.SHARK.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        cont.innerHTML = `<div class="p-20 text-center"><h2 class="text-red-500 font-black text-3xl italic uppercase">403 Access Denied</h2></div>`;
        return;
    }
    cont.innerHTML = `
        <div class="animate-view space-y-12">
            <h2 class="text-3xl font-black text-primary uppercase italic">Command Center</h2>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="glass-panel p-8 rounded-2xl space-y-4 border-white/5">
                    <h3 class="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Inject MCQ</h3>
                    <input id="m-q" placeholder="Question" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-slate-100">
                    <div class="grid grid-cols-2 gap-2">
                        <input id="m-a" placeholder="Option A" class="bg-white/5 border border-white/10 p-2 rounded-lg text-xs">
                        <input id="m-b" placeholder="Option B" class="bg-white/5 border border-white/10 p-2 rounded-lg text-xs">
                        <input id="m-c" placeholder="Option C" class="bg-white/5 border border-white/10 p-2 rounded-lg text-xs">
                        <input id="m-d" placeholder="Option D" class="bg-white/5 border border-white/10 p-2 rounded-lg text-xs">
                    </div>
                    <select id="m-correct" class="w-full bg-black border border-white/10 p-3 rounded-lg text-xs text-slate-400">
                        <option value="A">Answer: A</option><option value="B">Answer: B</option>
                        <option value="C">Answer: C</option><option value="D">Answer: D</option>
                    </select>
                    <input id="m-sub" placeholder="Subject Category" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                    <button onclick="adminAction('mcq', this)" class="btn-primary w-full py-4">Push MCQ</button>
                </div>
                <div class="glass-panel p-8 rounded-2xl space-y-4 border-white/5 h-fit">
                    <h3 class="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Post Alert</h3>
                    <input id="n-t" placeholder="Alert Title" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-slate-100">
                    <input id="n-l" placeholder="URL Link" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-slate-100 text-xs">
                    <button onclick="adminAction('notif', this)" class="btn-primary w-full py-4">Broadcast</button>
                </div>
            </div>
        </div>`;
}

window.adminAction = async function(type, btn) {
    const originalText = btn.innerText;
    btn.disabled = true; btn.innerText = "Syncing...";
    try {
        if (type === 'mcq') {
            const data = {
                Question: document.getElementById('m-q').value,
                OptionA: document.getElementById('m-a').value,
                OptionB: document.getElementById('m-b').value,
                OptionC: document.getElementById('m-c').value,
                OptionD: document.getElementById('m-d').value,
                CorrectOption: document.getElementById('m-correct').value.toUpperCase(),
                Subject: document.getElementById('m-sub').value
            };
            if(!data.Question || !data.Subject) throw new Error("Missing Fields");
            await db.collection('mcqs').add(data);
        } else {
            const title = document.getElementById('n-t').value;
            if(!title) throw new Error("Title Required");
            await db.collection('notifications').add({
                Title: title,
                Link: document.getElementById('n-l').value || "#",
                Date: new Date().toLocaleDateString('en-GB'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        alert("Success: Link Established.");
        location.reload();
    } catch (e) { alert("Error: " + e.message); btn.disabled = false; btn.innerText = originalText; }
};

// Start Monitoring
auth.onAuthStateChanged(user => { 
    if (user) { 
        window.SHARK.user = user; 
        updateProfileUI(); 
    } 
});

document.addEventListener("DOMContentLoaded", boot);