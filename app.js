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

window.SHARK = { mcqs: [], notifications: [], subjects: [], user: null, xp: parseInt(localStorage.getItem('user_xp')) || 0 };
let quizState = { active: false, pool: [], index: 0, score: 0, answered: false };

// --- BOOT ENGINE ---
async function boot() {
    try {
        const [nSnap, mSnap] = await Promise.all([
            db.collection('notifications').orderBy('timestamp', 'desc').limit(20).get(),
            db.collection('mcqs').get()
        ]);
        window.SHARK.notifications = nSnap.docs.map(d => ({id: d.id, ...d.data()}));
        window.SHARK.mcqs = mSnap.docs.map(d => ({id: d.id, ...d.data()}));
        window.SHARK.subjects = [...new Set(window.SHARK.mcqs.map(m => m.Subject))].filter(Boolean).sort();
        
        router('home');
    } catch (e) {
        console.error(e);
        document.getElementById('view-container').innerHTML = `<div class="card p-10 border-red-500/50 text-center"><p class="text-red-400 font-bold uppercase tracking-widest text-[10px]">Database Offline</p></div>`;
    }
}

// --- ROUTER ---
function router(view) {
    const cont = document.getElementById('view-container');
    window.scrollTo(0,0);
    if(view === 'home') renderHome(cont);
    if(view === 'subjects') renderSubjects(cont);
    if(view === 'admin') renderAdmin(cont);
}

function renderHome(cont) {
    cont.innerHTML = `
        <div class="animate-view space-y-12">
            <header class="card p-10 bg-gradient-to-br from-cyan-500/10 to-transparent flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                    <h2 class="text-5xl font-black tracking-tighter leading-tight text-white">BUILD YOUR<br><span class="text-cyan-400">LEGACY.</span></h2>
                    <p class="text-slate-400 mt-4 max-w-sm font-medium">Your current progress: <span id="home-xp" class="text-white font-bold">${window.SHARK.xp} XP</span></p>
                </div>
                <button onclick="router('subjects')" class="btn-primary scale-110">Enter the Vault</button>
            </header>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 space-y-6">
                    <h3 class="urdu text-3xl text-cyan-400 font-bold">تازہ ترین اپڈیٹس</h3>
                    <div class="space-y-3">
                        ${window.SHARK.notifications.map(n => `
                            <div class="card p-5 flex justify-between items-center group">
                                <a href="${n.Link}" target="_blank" class="font-bold text-slate-300 group-hover:text-cyan-400 transition-colors">${n.Title}</a>
                                <span class="text-[10px] font-black text-slate-700">${n.Date || 'Latest'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    updateProfileUI();
}

function renderSubjects(cont) {
    cont.innerHTML = `
        <div class="animate-view space-y-8">
            <div class="flex justify-between items-end">
                <h2 class="text-3xl font-black uppercase tracking-tighter">Subject Bank</h2>
                <button onclick="router('home')" class="text-[10px] font-black text-slate-600 hover:text-white transition-colors">← RETURN</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                ${window.SHARK.subjects.map(s => `
                    <div onclick="initQuiz('${s}')" class="card p-8 cursor-pointer group hover:bg-cyan-500/5">
                        <h4 class="text-xl font-bold mt-2 group-hover:text-cyan-400">${s}</h4>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function renderAdmin(cont) {
    if(!window.SHARK.user || window.SHARK.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        return cont.innerHTML = `<div class="card p-20 text-center"><h2 class="text-red-500 font-black">403: UNAUTHORIZED ACCESS</h2></div>`;
    }
    cont.innerHTML = `
        <div class="animate-view space-y-12">
            <h2 class="text-3xl font-black text-cyan-400 uppercase">Vault Management</h2>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="card p-8 space-y-4">
                    <h3 class="text-xs font-black uppercase text-slate-500 tracking-widest">New MCQ</h3>
                    <input id="m-q" placeholder="Question" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-sm">
                    <div class="grid grid-cols-2 gap-2">
                        <input id="m-a" placeholder="Opt A" class="bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                        <input id="m-b" placeholder="Opt B" class="bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                        <input id="m-c" placeholder="Opt C" class="bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                        <input id="m-d" placeholder="Opt D" class="bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                    </div>
                    <select id="m-correct" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                        <option value="A">Answer: A</option><option value="B">Answer: B</option>
                        <option value="C">Answer: C</option><option value="D">Answer: D</option>
                    </select>
                    <input id="m-sub" placeholder="Subject" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                    <button onclick="adminAction('mcq', this)" class="btn-primary w-full">Push to Vault</button>
                </div>
                <div class="card p-8 space-y-4 h-fit">
                    <h3 class="text-xs font-black uppercase text-slate-500 tracking-widest">New Alert</h3>
                    <input id="n-t" placeholder="Title" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-sm">
                    <input id="n-l" placeholder="URL Link" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-sm">
                    <button onclick="adminAction('notif', this)" class="btn-primary w-full">Broadcast Alert</button>
                </div>
            </div>
        </div>`;
}

async function adminAction(type, btn) {
    btn.disabled = true;
    try {
        if(type === 'mcq') {
            await db.collection('mcqs').add({
                Question: document.getElementById('m-q').value,
                OptionA: document.getElementById('m-a').value,
                OptionB: document.getElementById('m-b').value,
                OptionC: document.getElementById('m-c').value,
                OptionD: document.getElementById('m-d').value,
                CorrectOption: document.getElementById('m-correct').value,
                Subject: document.getElementById('m-sub').value
            });
        } else {
            await db.collection('notifications').add({
                Title: document.getElementById('n-t').value,
                Link: document.getElementById('n-l').value || "#",
                Date: new Date().toLocaleDateString('en-GB'),
                timestamp: Date.now()
            });
        }
        alert("Database Updated!"); location.reload();
    } catch(e) { alert(e.message); btn.disabled = false; }
}

function initQuiz(sub) {
    const questions = window.SHARK.mcqs.filter(m => m.Subject === sub).sort(() => 0.5 - Math.random()).slice(0, 10);
    quizState = { pool: questions, index: 0, score: 0, active: true, answered: false };
    renderQuiz();
}

function renderQuiz() {
    const q = quizState.pool[quizState.index];
    const cont = document.getElementById('view-container');
    cont.innerHTML = `
        <div class="animate-view max-w-2xl mx-auto space-y-6">
            <div class="card p-10">
                <h3 class="text-2xl font-bold leading-relaxed mb-10 text-white">${q.Question}</h3>
                <div class="grid gap-4">
                    ${['A','B','C','D'].map(o => `
                        <button onclick="handleAnswer(this, '${o}')" class="quiz-opt card p-6 text-left flex items-center gap-4 transition-all group">
                            <span class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black group-hover:bg-cyan-500 group-hover:text-black">${o}</span>
                            <span class="font-bold text-slate-300 group-hover:text-white">${q['Option'+o]}</span>
                        </button>`).join('')}
                </div>
            </div>
            <div class="flex justify-between items-center">
                <button onclick="if(confirm('Quit?')) router('home')" class="text-[10px] font-black text-slate-700 hover:text-red-400 uppercase tracking-widest">Abandon Session</button>
                <button id="btn-next" onclick="nextQ()" class="hidden btn-primary">Continue →</button>
            </div>
        </div>`;
}

function handleAnswer(el, choice) {
    if(!quizState.active || quizState.answered) return;
    quizState.answered = true;
    const correct = quizState.pool[quizState.index].CorrectOption.trim().toUpperCase();
    if(choice === correct) {
        el.style.borderColor = "#22c55e"; quizState.score++;
    } else {
        el.style.borderColor = "#ef4444";
        document.querySelectorAll('.quiz-opt').forEach(b => {
            if(b.innerText.includes(correct + "\n")) b.style.borderColor = "#22c55e";
        });
    }
    document.getElementById('btn-next').classList.remove('hidden');
}

function nextQ() {
    quizState.index++; quizState.answered = false;
    if(quizState.index >= quizState.pool.length) {
        const earned = quizState.score * 10;
        window.SHARK.xp += earned;
        localStorage.setItem('user_xp', window.SHARK.xp);
        document.getElementById('view-container').innerHTML = `
            <div class="card p-20 text-center animate-view max-w-lg mx-auto space-y-6">
                <h2 class="text-6xl">🎯</h2>
                <h3 class="text-3xl font-black">MOCK COMPLETE</h3>
                <p class="text-5xl font-black text-cyan-400">${quizState.score} / 10</p>
                <button onclick="router('home')" class="btn-primary w-full mt-4">Return to HQ</button>
            </div>`;
    } else { renderQuiz(); }
}

// --- AUTH (REDIRECT VERSION) ---
function login() { auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider()); }
function logout() { auth.signOut().then(() => { localStorage.clear(); location.reload(); }); }

auth.getRedirectResult().catch(e => console.error(e));

function updateProfileUI() {
    const prof = document.getElementById('user-profile');
    const loginBtn = document.getElementById('login-btn');
    if(window.SHARK.user) {
        loginBtn.classList.add('hidden');
        prof.classList.remove('hidden');
        document.getElementById('user-name').innerText = window.SHARK.user.displayName.split(' ');
        document.getElementById('nav-xp').innerText = `${window.SHARK.xp} XP`;
    }
}

auth.onAuthStateChanged(user => {
    if(user) {
        window.SHARK.user = user;
        updateProfileUI();
    }
});

document.addEventListener('DOMContentLoaded', boot);