/**
 * I-SHARK CORE ENGINE v2.0
 * 2026 Production Build - Master Sync
 */

const firebaseConfig = {
    apiKey: "AIzaSyC8nptTKV3cJtnkri-hDZNCTidlMeGcCIs",
    authDomain: "i-shark.firebaseapp.com",
    projectId: "i-shark",
    storageBucket: "i-shark.firebasestorage.app",
    messagingSenderId: "304378182943",
    appId: "1:304378182943:web:305b03b013367c8ff1c42a"
};

// Initialize Gate
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

// Fisher-Yates Shuffle
function shuffle(arr) {
    let m = arr.length, t, i;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = arr[m]; arr[m] = arr[i]; arr[i] = t;
    }
    return arr;
}

// 1. BOOT SEQUENCE
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
        
        router("home");
    } catch (e) {
        console.error("Critical Failure:", e);
        document.body.innerHTML = `<div class="h-screen flex items-center justify-center bg-obsidian text-red-400 font-black">LINK SEVERED. CHECK CONSOLE.</div>`;
    }
}

// 2. SWITCH ROUTER
function router(view) {
    const cont = document.getElementById("view-container");
    if(!cont) return;
    window.scrollTo(0,0);
    
    switch(view) {
        case "home": renderHome(cont); break;
        case "vault": renderVault(cont); break;
        case "quiz": renderQuiz(cont); break;
        case "admin": renderAdmin(cont); break;
        default: renderHome(cont);
    }
}

// 3. UI RENDERING FUNCTIONS
function renderHome(cont) {
    const alertsHTML = window.SHARK.notifications.length ? 
        window.SHARK.notifications.map(n => `
            <div class="card p-5 flex justify-between items-center glass-panel rounded-xl mb-3">
                <div class="flex flex-col">
                    <a href="${n.Link || '#'}" target="_blank" class="font-bold text-slate-100 hover:text-primary transition-colors text-lg urdu-text">${n.Title || n.text}</a>
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Government Alert</span>
                </div>
                <span class="text-[10px] font-black text-slate-700 uppercase">${n.Date || 'Latest'}</span>
            </div>
        `).join('') : `<p class="text-slate-600 italic">Scanning database...</p>`;

    cont.innerHTML = `
        <div class="animate-view space-y-10">
            <header class="space-y-1">
                <h2 class="text-4xl font-black text-white tracking-tight italic">Student Dashboard</h2>
                <p class="text-slate-400 font-medium">Welcome back, Scholar. Your preparation starts here.</p>
            </header>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div class="lg:col-span-8 group">
                    <div class="glass-panel rounded-xl overflow-hidden h-full flex flex-col md:flex-row hover:border-primary/40 transition-all">
                        <div class="md:w-2/5 bg-slate-900 overflow-hidden"><img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=1000" class="object-cover h-full w-full opacity-40"></div>
                        <div class="p-8 flex-1 flex flex-col justify-between">
                            <div><h3 class="text-2xl font-bold text-white mb-4">PPSC/FPSC Alerts</h3>${alertsHTML}</div>
                        </div>
                    </div>
                </div>
                <div class="lg:col-span-4">
                    <div class="glass-panel rounded-xl p-8 h-full flex flex-col justify-between border-primary/10">
                        <h3 class="text-2xl font-bold text-white mb-2">Quiz Vault</h3>
                        <p class="text-slate-400 text-sm mb-8">Access time-bound mock exams.</p>
                        <button onclick="router('vault')" class="btn-primary w-full flex items-center justify-center gap-2"><span class="material-symbols-outlined">play_arrow</span> Start Practice</button>
                    </div>
                </div>
            </div>
        </div>`;
    updateProfileUI();
}

function renderVault(cont) {
    const subjectsHTML = window.SHARK.subjects.map(s => `
        <div onclick="initQuiz('${s}')" class="glass-panel rounded-xl p-6 flex flex-col justify-between aspect-[4/3] cursor-pointer hover:border-primary transition-all">
            <span class="text-[10px] font-black text-primary uppercase">Active</span>
            <h3 class="text-xl font-bold text-white">${s}</h3>
        </div>`).join('');

    cont.innerHTML = `<div class="animate-view space-y-8">
        <h1 class="text-4xl font-black text-white">Subject Vault</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${subjectsHTML || '<p>No data yet.</p>'}</div>
    </div>`;
}

function renderQuiz() {
    const q = quizState.pool[quizState.index];
    const cont = document.getElementById("view-container");
    const progress = ((quizState.index + 1) / quizState.pool.length) * 100;

    cont.innerHTML = `
        <div class="animate-view flex flex-col items-center">
            <div class="fixed top-0 left-0 w-full h-1 bg-white/5 z-"><div class="h-full bg-primary shadow-[0_0_15px_#0df2f2]" style="width: ${progress}%"></div></div>
            <div class="w-full max-w-3xl space-y-8">
                <div class="glass-panel rounded-2xl p-8 md:p-14 border-white/5">
                    <h1 class="text-2xl md:text-3xl font-bold text-white mb-10">${q.Question}</h1>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${["A", "B", "C", "D"].map(o => `<button data-option="${o}" onclick="handleAnswer(this, '${o}')" class="glass-panel p-5 rounded-xl text-left flex items-center gap-4 hover:bg-white/5 transition-all">
                            <span class="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs font-black">${o}</span>
                            <span class="font-bold text-slate-300">${q["Option" + o]}</span>
                        </button>`).join('')}
                    </div>
                </div>
                <button id="btn-next" onclick="nextQ()" class="hidden btn-primary mx-auto">Next Question →</button>
            </div>
        </div>`;
}

function handleAnswer(el, choice) {
    if (quizState.answered) return;
    quizState.answered = true;
    const correct = quizState.pool[quizState.index].CorrectOption.trim().toUpperCase();
    if (choice === correct) { el.style.borderColor = "#22c55e"; quizState.score++; }
    else { el.style.borderColor = "#ef4444"; }
    document.getElementById("btn-next").classList.remove("hidden");
}

function nextQ() {
    quizState.index++; quizState.answered = false;
    if (quizState.index >= quizState.pool.length) { 
        window.SHARK.xp += (quizState.score * 10); 
        localStorage.setItem("user_xp", window.SHARK.xp);
        router('home'); 
    } else { renderQuiz(); }
}

function initQuiz(sub) {
    const questions = shuffle(window.SHARK.mcqs.filter(m => m.Subject === sub)).slice(0, 10);
    if (!questions.length) return alert("Empty Subject");
    quizState = { active: true, pool: questions, index: 0, score: 0, answered: false };
    renderQuiz();
}

// 4. ADMIN LOGIC
function renderAdmin(cont) {
    if (!window.SHARK.user || window.SHARK.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        cont.innerHTML = `<h2 class="text-red-500 font-black p-20 text-center">403: DENIED</h2>`;
        return;
    }
    cont.innerHTML = `
        <div class="animate-view space-y-12">
            <h2 class="text-3xl font-black text-primary uppercase">Command Center</h2>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="glass-panel p-8 rounded-2xl space-y-4">
                    <h3 class="text-xs font-black text-slate-500 uppercase tracking-widest">Inject MCQ</h3>
                    <input id="m-q" placeholder="Question" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg">
                    <div class="grid grid-cols-2 gap-2">
                        <input id="m-a" placeholder="A" class="bg-white/5 border border-white/10 p-2 rounded-lg">
                        <input id="m-b" placeholder="B" class="bg-white/5 border border-white/10 p-2 rounded-lg">
                        <input id="m-c" placeholder="C" class="bg-white/5 border border-white/10 p-2 rounded-lg">
                        <input id="m-d" placeholder="D" class="bg-white/5 border border-white/10 p-2 rounded-lg">
                    </div>
                    <input id="m-correct" placeholder="Correct (A, B, C, or D)" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg">
                    <input id="m-sub" placeholder="Subject" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg">
                    <button onclick="adminAction('mcq', this)" class="btn-primary w-full">Push MCQ</button>
                </div>
                <div class="glass-panel p-8 rounded-2xl space-y-4">
                    <h3 class="text-xs font-black text-slate-500 uppercase tracking-widest">Post Alert</h3>
                    <input id="n-t" placeholder="Alert Title" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg">
                    <input id="n-l" placeholder="URL Link" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg">
                    <button onclick="adminAction('notif', this)" class="btn-primary w-full">Broadcast</button>
                </div>
            </div>
        </div>`;
}

async function adminAction(type, btn) {
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
            await db.collection('mcqs').add(data);
        } else {
            await db.collection('notifications').add({
                Title: document.getElementById('n-t').value,
                Link: document.getElementById('n-l').value || "#",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        alert("Synced!"); location.reload();
    } catch (e) { alert(e.message); btn.disabled = false; btn.innerText = originalText; }
}

// 5. IDENTITY & LOGIN
function login() {
    document.getElementById("login-btn").innerText = "Connecting...";
    auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
}

function logout() {
    auth.signOut().then(() => { localStorage.clear(); location.reload(); });
}

function updateProfileUI() {
    const prof = document.getElementById("user-profile");
    const loginBtn = document.getElementById("login-btn");
    const user = window.SHARK.user;
    if (user && prof) {
        loginBtn.classList.add("hidden");
        prof.classList.remove("hidden");
        document.getElementById("user-initial").innerText = user.displayName.charAt(0);
        document.getElementById("nav-xp").innerText = `${window.SHARK.xp} XP`;
    }
}

auth.onAuthStateChanged(user => { if (user) { window.SHARK.user = user; updateProfileUI(); } });
document.addEventListener("DOMContentLoaded", boot);