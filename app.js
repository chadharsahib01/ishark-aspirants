/**
 * I-SHARK MASTER CORE v3.0 
 * Final Sync: Logic + Auth + Router
 */

const firebaseConfig = {
    apiKey: "AIzaSyC8nptTKV3cJtnkri-hDZNCTidlMeGcCIs",
    authDomain: "i-shark.firebaseapp.com",
    projectId: "i-shark",
    storageBucket: "i-shark.firebasestorage.app",
    messagingSenderId: "304378182943",
    appId: "1:304378182943:web:305b03b013367c8ff1c42a"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const ADMIN_EMAIL = "makkahmarble3@gmail.com";

window.SHARK = { user: null, mcqs: [], notifications: [], subjects: [], xp: parseInt(localStorage.getItem('user_xp')) || 0 };
let quizState = { active: false, pool: [], index: 0, score: 0 };

// 1. GLOBAL CORE ACTIONS
window.login = function() {
    console.log("LOGIN: Click Detected");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
};

window.logout = function() {
    auth.signOut().then(() => { localStorage.clear(); window.location.reload(); });
};

window.router = function(view) {
    const cont = document.getElementById("view-container");
    if(!cont) return;
    switch(view) {
        case "home": renderHome(cont); break;
        case "vault": renderVault(cont); break;
        case "admin": renderAdmin(cont); break;
        default: renderHome(cont);
    }
};

// 2. BOOT SEQUENCE
async function boot() {
    try {
        const [nSnap, mSnap] = await Promise.all([
            db.collection("notifications").orderBy("timestamp", "desc").limit(5).get(),
            db.collection("mcqs").get()
        ]);
        window.SHARK.notifications = nSnap.docs.map(d => d.data());
        window.SHARK.mcqs = mSnap.docs.map(d => d.data());
        window.SHARK.subjects = [...new Set(window.SHARK.mcqs.map(m => m.Subject))].filter(Boolean);
        
        const loader = document.getElementById("boot-loader");
        if(loader) loader.remove();
        window.router("home");
    } catch(e) { console.error("BOOT ERR", e); }
}

// 3. UI RENDERING
function renderHome(cont) {
    const alerts = window.SHARK.notifications.length ? window.SHARK.notifications.map(n => `
        <div class="glass-panel p-4 rounded-xl mb-3 flex justify-between items-center">
            <a href="${n.Link || '#'}" class="font-bold text-slate-100 urdu-text text-lg">${n.Title}</a>
            <span class="text-[10px] text-slate-500 uppercase">${n.Date || 'NOW'}</span>
        </div>`).join('') : `<p class="text-slate-600 text-xs italic">Awaiting fresh alerts...</p>`;

    cont.innerHTML = `
        <div class="space-y-8 animate-view">
            <header><h1 class="text-4xl font-black italic uppercase">Dashboard</h1></header>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div class="lg:col-span-8 glass-panel p-8 rounded-2xl">
                    <h3 class="text-primary font-black uppercase text-xs mb-6">PPSC/FPSC Alerts</h3>
                    ${alerts}
                </div>
                <div class="lg:col-span-4 glass-panel p-8 rounded-2xl flex flex-col justify-between">
                    <h3 class="text-xl font-bold italic mb-4">Quiz Vault</h3>
                    <button onclick="window.router('vault')" class="btn-primary py-3 w-full">START PRACTICE</button>
                </div>
            </div>
        </div>`;
    updateProfileUI();
}

function renderVault(cont) {
    const cards = window.SHARK.subjects.map(s => `
        <div onclick="window.initQuiz('${s}')" class="glass-panel p-8 rounded-2xl cursor-pointer hover:border-primary transition-all">
            <h3 class="text-2xl font-black italic uppercase">${s}</h3>
        </div>`).join('');
    cont.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-6">${cards || '<p>No Subjects Found</p>'}</div>`;
}

function renderAdmin(cont) {
    if(!window.SHARK.user || window.SHARK.user.email !== ADMIN_EMAIL) {
        cont.innerHTML = `<h1 class="text-red-500 font-black py-20 text-center">ACCESS DENIED</h1>`;
        return;
    }
    cont.innerHTML = `<div class="glass-panel p-10 rounded-2xl space-y-4">
        <h2 class="text-3xl font-black text-primary italic uppercase">Admin Command</h2>
        <input id="m-q" placeholder="Question" class="w-full bg-white/5 p-3 rounded-lg border border-white/10">
        <div class="grid grid-cols-2 gap-2">
            <input id="m-a" placeholder="A" class="bg-white/5 p-2 rounded-lg border border-white/10">
            <input id="m-b" placeholder="B" class="bg-white/5 p-2 rounded-lg border border-white/10">
            <input id="m-c" placeholder="C" class="bg-white/5 p-2 rounded-lg border border-white/10">
            <input id="m-d" placeholder="D" class="bg-white/5 p-2 rounded-lg border border-white/10">
        </div>
        <input id="m-correct" placeholder="Correct (A,B,C,D)" class="w-full bg-white/5 p-3 rounded-lg border border-white/10">
        <input id="m-sub" placeholder="Subject" class="w-full bg-white/5 p-3 rounded-lg border border-white/10">
        <button onclick="window.adminPush()" class="btn-primary w-full py-4">PUSH MCQ</button>
    </div>`;
}

window.adminPush = async function() {
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
    alert("MCQ Synced!"); window.location.reload();
};

function updateProfileUI() {
    const user = window.SHARK.user;
    if(user) {
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-initial').innerText = user.displayName.charAt(0);
        document.getElementById('nav-xp').innerText = window.SHARK.xp + " XP";
        if(user.email === ADMIN_EMAIL) console.log("ADMIN ACTIVE: router('admin')");
    }
}

auth.onAuthStateChanged(user => { if(user) { window.SHARK.user = user; updateProfileUI(); } });
document.addEventListener("DOMContentLoaded", boot);