/**
 * I-SHARK MASTER CORE v2.1
 * 2026 Emergency Recovery Build
 */

const firebaseConfig = {
    apiKey: "AIzaSyC8nptTKV3cJtnkri-hDZNCTidlMeGcCIs",
    authDomain: "i-shark.firebaseapp.com",
    projectId: "i-shark",
    storageBucket: "i-shark.firebasestorage.app",
    messagingSenderId: "304378182943",
    appId: "1:304378182943:web:305b03b013367c8ff1c42a"
};

// 1. HARD INITIALIZATION
try {
    firebase.initializeApp(firebaseConfig);
    console.log("SHARK: Firebase Linked.");
} catch (e) {
    console.error("Firebase Init Error:", e);
}

const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const ADMIN_EMAIL = "makkahmarble3@gmail.com";

window.SHARK = {
    user: null,
    mcqs: [],
    notifications: [],
    subjects: [],
    xp: parseInt(localStorage.getItem('user_xp')) || 0
};

let quizState = { active: false, pool: [], index: 0, score: 0, answered: false, results: [] };

// 2. AUTHENTICATION (Hardened)
window.login = function() {
    console.log("SHARK: Login attempt triggered.");
    const btn = document.getElementById("login-btn");
    if(btn) btn.innerText = "Redirecting...";
    
    auth.signInWithRedirect(provider).catch(err => {
        console.error("Auth Error:", err);
        alert("Login failed to start: " + err.message);
    });
};

window.logout = function() {
    auth.signOut().then(() => {
        localStorage.clear();
        window.location.reload();
    });
};

// 3. BOOT ENGINE
async function boot() {
    console.log("SHARK: Booting Systems...");
    try {
        const [nSnap, mSnap] = await Promise.all([
            db.collection("notifications").orderBy("timestamp", "desc").limit(10).get(),
            db.collection("mcqs").get()
        ]);

        window.SHARK.notifications = nSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.SHARK.mcqs = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.SHARK.subjects = [...new Set(window.SHARK.mcqs.map(m => m.Subject || m.subject))].filter(Boolean).sort();

        const loader = document.getElementById("boot-loader");
        if(loader) loader.remove();
        
        router("home");
        console.log("SHARK: Systems Online.");
    } catch (e) {
        console.error("Boot Failure:", e);
        // Fallback if DB is empty or blocked
        const loader = document.getElementById("boot-loader");
        if(loader) loader.innerHTML = `<p class="text-red-500 font-bold">DATABASE OFFLINE. CHECK FIREBASE RULES.</p>`;
    }
}

// 4. ROUTER (The Switch-Blade)
window.router = function(view) {
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
};

// 5. RENDERING (Dashboard)
function renderHome(cont) {
    const alerts = window.SHARK.notifications.length ? 
        window.SHARK.notifications.map(n => `
            <div class="card p-5 flex justify-between items-center glass-panel rounded-xl mb-3 border-white/5">
                <div class="flex flex-col">
                    <a href="${n.Link || '#'}" target="_blank" class="font-bold text-slate-100 hover:text-primary transition-colors text-lg urdu-text">${n.Title || n.text}</a>
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Govt. Alert</span>
                </div>
            </div>`).join('') : `<p class="text-slate-600 italic">No alerts found.</p>`;

    cont.innerHTML = `
        <div class="animate-view space-y-10">
            <header>
                <h2 class="text-4xl font-black text-white tracking-tight uppercase italic">Student Dashboard</h2>
                <p class="text-slate-500 font-medium">Build your legacy through consistent practice.</p>
            </header>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div class="lg:col-span-8 group glass-panel rounded-2xl p-8 border-white/5">
                    <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <span class="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span> PPSC/FPSC Alerts
                    </h3>
                    ${alerts}
                </div>
                <div class="lg:col-span-4 glass-panel rounded-2xl p-8 border-white/5 flex flex-col justify-between">
                    <div>
                        <h3 class="text-2xl font-bold text-white mb-2">Quiz Vault</h3>
                        <p class="text-slate-500 text-sm">Challenge yourself with mock exams.</p>
                    </div>
                    <button onclick="router('vault')" class="btn-primary w-full mt-8">Enter Vault</button>
                </div>
            </div>
        </div>`;
    updateProfileUI();
}

// 6. ADMIN & UTILS (Hidden until login)
function renderAdmin(cont) {
    if(!window.SHARK.user || window.SHARK.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        cont.innerHTML = `<h2 class="text-red-500 p-20 text-center font-black">403: ACCESS DENIED</h2>`;
        return;
    }
    cont.innerHTML = `<div class="p-10 glass-panel rounded-2xl">
        <h2 class="text-3xl font-black text-primary uppercase mb-8">Command Center</h2>
        <div class="grid gap-8">
            <div class="space-y-4">
                <h3 class="text-white font-bold">Inject MCQ</h3>
                <input id="m-q" placeholder="Question" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg">
                <input id="m-a" placeholder="Opt A" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                <input id="m-b" placeholder="Opt B" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                <input id="m-c" placeholder="Opt C" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                <input id="m-d" placeholder="Opt D" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                <input id="m-correct" placeholder="Correct (A, B, C, or D)" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg">
                <input id="m-sub" placeholder="Subject" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg">
                <button onclick="adminAction('mcq', this)" class="btn-primary w-full">Push MCQ</button>
            </div>
        </div>
    </div>`;
}

async function adminAction(type, btn) {
    btn.disabled = true; btn.innerText = "Syncing...";
    try {
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
        alert("Synced!"); location.reload();
    } catch(e) { alert(e.message); btn.disabled = false; btn.innerText = "Push MCQ"; }
}

function updateProfileUI() {
    const user = window.SHARK.user;
    if (user) {
        const authLayer = document.getElementById("auth-layer");
        authLayer.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="hidden md:flex flex-col items-end leading-none">
                    <span class="text-[9px] uppercase tracking-widest text-primary/60 font-bold">Aspirant</span>
                    <span class="text-xs font-mono text-white">${window.SHARK.xp} XP</span>
                </div>
                <div class="h-9 w-9 rounded-full border border-primary/30 flex items-center justify-center bg-primary/10 text-primary font-bold cursor-pointer" onclick="logout()">
                    <span>${user.displayName.charAt(0)}</span>
                </div>
            </div>`;
    }
}

// Global Shuffle
function shuffle(arr) {
    let m = arr.length, t, i;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = arr[m]; arr[m] = arr[i]; arr[i] = t;
    }
    return arr;
}

// Auth State Monitor
auth.onAuthStateChanged(user => {
    if (user) {
        window.SHARK.user = user;
        updateProfileUI();
        console.log("SHARK: Identity Confirmed -", user.email);
    }
});

document.addEventListener("DOMContentLoaded", boot);