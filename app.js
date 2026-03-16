/**
 * I-SHARK MASTER CORE v3.1 
 * Verified: Firebase v10 Compat | Production Ready
 */

const firebaseConfig = {
    apiKey: "AIzaSyC8nptTKV3cJtnkri-hDZNCTidlMeGcCIs",
    authDomain: "i-shark.firebaseapp.com",
    projectId: "i-shark",
    storageBucket: "i-shark.firebasestorage.app",
    messagingSenderId: "304378182943",
    appId: "1:304378182943:web:305b03b013367c8ff1c42a"
};

// Initialize
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const ADMIN_EMAIL = "makkahmarble3@gmail.com";

window.SHARK = { 
    user: null, 
    mcqs: [], 
    notifications: [], 
    subjects: [], 
    xp: parseInt(localStorage.getItem('user_xp')) || 0 
};

let quizState = { active: false, pool: [], index: 0, score: 0 };

// 1. AUTH ACTIONS
window.login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(console.error);
};

window.logout = () => {
    auth.signOut().then(() => { 
        localStorage.clear(); 
        window.location.reload(); 
    });
};

// 2. ROUTER & VIEWS
window.router = function(view) {
    const cont = document.getElementById("view-container");
    if(!cont) return;
    
    // Smooth transition
    cont.classList.remove('animate-view');
    void cont.offsetWidth; // Trigger reflow
    cont.classList.add('animate-view');

    switch(view) {
        case "home": renderHome(cont); break;
        case "vault": renderVault(cont); break;
        case "admin": renderAdmin(cont); break;
        case "quiz": renderQuiz(cont); break;
        default: renderHome(cont);
    }
    window.scrollTo(0,0);
};

// 3. UI RENDERING
function renderHome(cont) {
    const alerts = window.SHARK.notifications.length ? window.SHARK.notifications.map(n => `
        <div class="glass-panel p-5 rounded-2xl mb-4 flex justify-between items-center group hover:border-primary/40 transition-all">
            <div class="flex flex-col">
                <span class="text-[10px] text-primary font-bold uppercase tracking-tighter mb-1">${n.Date || 'Update'}</span>
                <a href="${n.Link || '#'}" target="_blank" class="font-bold text-slate-100 urdu-text text-xl group-hover:text-primary transition-colors">${n.Title}</a>
            </div>
            <span class="material-symbols-outlined text-slate-600 group-hover:text-primary">arrow_outward</span>
        </div>`).join('') : `<div class="p-10 text-center opacity-40 italic">Scanning for new alerts...</div>`;

    cont.innerHTML = `
        <div class="space-y-10">
            <header class="flex justify-between items-end">
                <div>
                    <p class="text-primary font-black uppercase tracking-[0.4em] text-[10px] mb-2">Operational Dashboard</p>
                    <h1 class="text-5xl font-black italic uppercase tracking-tighter">Command Center</h1>
                </div>
                <div class="text-right hidden md:block">
                    <p class="text-slate-500 text-xs font-mono uppercase">System Status</p>
                    <p class="text-green-400 text-xs font-bold uppercase animate-pulse">● All Systems Online</p>
                </div>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div class="lg:col-span-8">
                    <h3 class="text-slate-400 font-bold uppercase text-[10px] mb-6 tracking-widest flex items-center gap-2">
                        <span class="w-8 h-[1px] bg-primary/30"></span> Public Notifications
                    </h3>
                    ${alerts}
                </div>
                <div class="lg:col-span-4 space-y-6">
                    <div class="glass-panel p-8 rounded-3xl border-t-primary/20">
                        <h3 class="text-2xl font-black italic mb-2 tracking-tight">QUIZ VAULT</h3>
                        <p class="text-slate-400 text-sm mb-6">Access encrypted question banks for PPSC/FPSC preparation.</p>
                        <button onclick="window.router('vault')" class="btn-primary w-full py-4 text-sm">Initialize Vault</button>
                    </div>
                </div>
            </div>
        </div>`;
    updateProfileUI();
}

function renderVault(cont) {
    const cards = window.SHARK.subjects.map(s => `
        <div onclick="window.initQuiz('${s}')" class="glass-panel p-10 rounded-3xl cursor-pointer group hover:border-primary transition-all">
            <span class="material-symbols-outlined text-4xl text-primary/40 group-hover:text-primary transition-colors">folder_open</span>
            <h3 class="text-2xl font-black italic uppercase mt-4 group-hover:translate-x-1 transition-transform">${s}</h3>
            <p class="text-slate-500 text-xs mt-2 uppercase tracking-widest">Question Bank Active</p>
        </div>`).join('');
    
    cont.innerHTML = `
        <div class="space-y-8">
            <button onclick="window.router('home')" class="text-slate-500 hover:text-primary flex items-center gap-2 text-xs font-bold uppercase transition-colors">
                <span class="material-symbols-outlined text-sm">arrow_back</span> Return to Base
            </button>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${cards || '<p class="p-20 text-center opacity-50">No Data Modules Found</p>'}</div>
        </div>`;
}

// 4. QUIZ ENGINE (FIXED)
window.initQuiz = function(subject) {
    const pool = window.SHARK.mcqs.filter(m => m.Subject === subject);
    if(pool.length === 0) return alert("Empty Module");
    
    quizState = {
        active: true,
        pool: pool.sort(() => 0.5 - Math.random()), // Shuffle
        index: 0,
        score: 0,
        subject: subject
    };
    window.router('quiz');
};

function renderQuiz(cont) {
    const q = quizState.pool[quizState.index];
    if(!q) {
        renderResults(cont);
        return;
    }

    cont.innerHTML = `
        <div class="max-w-2xl mx-auto">
            <div class="flex justify-between items-center mb-10">
                <span class="text-xs font-mono text-primary uppercase">${quizState.subject} // Module</span>
                <span class="text-xs font-mono text-slate-500">${quizState.index + 1} / ${quizState.pool.length}</span>
            </div>
            <div class="glass-panel p-10 rounded-3xl">
                <h2 class="text-2xl font-bold leading-relaxed mb-8">${q.Question}</h2>
                <div class="space-y-3">
                    ${['A','B','C','D'].map(opt => `
                        <button onclick="window.submitAnswer('${opt}')" class="quiz-option">
                            <span class="text-primary font-bold mr-3">${opt}.</span> ${q['Option'+opt]}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>`;
}

window.submitAnswer = function(choice) {
    const q = quizState.pool[quizState.index];
    if(choice === q.CorrectOption) {
        quizState.score++;
        window.SHARK.xp += 10;
        localStorage.setItem('user_xp', window.SHARK.xp);
    }
    quizState.index++;
    updateProfileUI();
    renderQuiz(document.getElementById("view-container"));
};

function renderResults(cont) {
    cont.innerHTML = `
        <div class="text-center py-20 animate-view">
            <h2 class="text-6xl font-black italic text-primary mb-4">COMPLETE</h2>
            <p class="text-xl text-slate-400 mb-8">Accuracy: ${((quizState.score/quizState.pool.length)*100).toFixed(0)}%</p>
            <button onclick="window.router('vault')" class="btn-primary">Back to Vault</button>
        </div>`;
}

// 5. ADMIN ACTIONS
function renderAdmin(cont) {
    if(!window.SHARK.user || window.SHARK.user.email !== ADMIN_EMAIL) {
        cont.innerHTML = `<h1 class="text-red-500 font-black py-20 text-center uppercase tracking-widest">Access Denied: Level 4 Security Required</h1>`;
        return;
    }
    cont.innerHTML = `<div class="glass-panel p-10 rounded-3xl space-y-6 max-w-2xl mx-auto">
        <h2 class="text-3xl font-black text-primary italic uppercase tracking-tighter">Push Data Module</h2>
        <div class="space-y-4">
            <input id="m-q" placeholder="The Question..." class="w-full bg-black/40 p-4 rounded-xl border border-white/10 focus:border-primary outline-none">
            <div class="grid grid-cols-2 gap-4">
                <input id="m-a" placeholder="Option A" class="bg-black/40 p-3 rounded-xl border border-white/10 outline-none focus:border-primary">
                <input id="m-b" placeholder="Option B" class="bg-black/40 p-3 rounded-xl border border-white/10 outline-none focus:border-primary">
                <input id="m-c" placeholder="Option C" class="bg-black/40 p-3 rounded-xl border border-white/10 outline-none focus:border-primary">
                <input id="m-d" placeholder="Option D" class="bg-black/40 p-3 rounded-xl border border-white/10 outline-none focus:border-primary">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <input id="m-correct" placeholder="Correct Key (A,B,C, or D)" class="bg-black/40 p-4 rounded-xl border border-white/10 outline-none focus:border-primary">
                <input id="m-sub" placeholder="Module Subject" class="bg-black/40 p-4 rounded-xl border border-white/10 outline-none focus:border-primary">
            </div>
            <button onclick="window.adminPush()" class="btn-primary w-full py-5 mt-4">Broadcast to Firestore</button>
        </div>
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
        Subject: document.getElementById('m-sub').value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        await db.collection('mcqs').add(data);
        alert("Encrypted & Synced!"); window.location.reload();
    } catch(e) { alert("Sync Error: " + e.message); }
};

// 6. SYSTEM BOOT
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
    } catch(e) { 
        console.error("BOOT CRITICAL ERR", e);
        document.getElementById("boot-loader").innerHTML = `<p class="text-red-500 font-mono">CONNECTION FAILED: OFFLINE</p>`;
    }
}

function updateProfileUI() {
    const user = window.SHARK.user;
    if(user) {
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-initial').innerText = user.displayName ? user.displayName.charAt(0) : 'U';
        document.getElementById('nav-xp').innerText = window.SHARK.xp + " XP";
        
        if(user.email === ADMIN_EMAIL) {
            document.getElementById('admin-link').classList.remove('hidden');
        }
    }
}

// Event Listeners
auth.onAuthStateChanged(user => { 
    if(user) { 
        window.SHARK.user = user; 
        updateProfileUI(); 
    } 
});

document.addEventListener("DOMContentLoaded", boot);