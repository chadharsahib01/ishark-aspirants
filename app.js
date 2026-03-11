// --- CONFIG & STATE ---
const firebaseConfig = { apiKey: "AIzaSyC8nptTKV3cJtnkri-hDZNCTidlMeGcCIs", authDomain: "i-shark.firebaseapp.com", projectId: "i-shark", storageBucket: "i-shark.firebasestorage.app", messagingSenderId: "304378182943", appId: "1:304378182943:web:305b03b013367c8ff1c42a" };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const ADMIN_EMAIL = "MAKKAHMARBLE3@GMAIL.COM"; // CHANGE THIS

window.SHARK = { mcqs: [], notifications: [], subjects: [], user: null, xp: parseInt(localStorage.getItem('user_xp')) || 0 };
let quiz = { active: false, pool: [], index: 0, score: 0, answered: false };

// --- BOOT ENGINE ---
async function boot() {
    try {
        const [nSnap, mSnap] = await Promise.all([
            db.collection('notifications').orderBy('timestamp', 'desc').limit(20).get(),
            db.collection('mcqs').get()
        ]);
        window.SHARK.notifications = nSnap.docs.map(d => d.data());
        window.SHARK.mcqs = mSnap.docs.map(d => d.data());
        window.SHARK.subjects = [...new Set(window.SHARK.mcqs.map(m => m.Subject))].filter(Boolean).sort();
        router('home');
    } catch (e) { showError("Database Connection Failed."); }
}

// --- ROUTER ---
function router(view) {
    const cont = document.getElementById('view-container');
    window.scrollTo(0,0);
    if(view === 'home') renderHome(cont);
    if(view === 'subjects') renderSubjects(cont);
    if(view === 'admin') renderAdmin(cont);
}

// --- ADMIN PANEL (THE VAULT CONTROL) ---
function renderAdmin(cont) {
    if (!window.SHARK.user || window.SHARK.user.email !== ADMIN_EMAIL) {
        return cont.innerHTML = `<div class="card p-20 text-center"><h2 class="text-red-500 font-black">403: UNAUTHORIZED ACCESS</h2><p class="text-xs text-slate-500 mt-2">This incident has been logged.</p></div>`;
    }

    cont.innerHTML = `
        <div class="animate-view space-y-12">
            <div class="flex justify-between items-center">
                <h2 class="text-3xl font-black text-cyan-400">ADMIN CONTROL PANEL</h2>
                <button onclick="router('home')" class="text-[10px] font-bold opacity-50 uppercase">Exit Admin</button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="card p-8 space-y-4">
                    <h3 class="font-black text-xs uppercase tracking-widest text-slate-500">Add New MCQ</h3>
                    <input id="m-q" placeholder="Question Text" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-sm">
                    <div class="grid grid-cols-2 gap-2">
                        <input id="m-a" placeholder="Option A" class="bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                        <input id="m-b" placeholder="Option B" class="bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                        <input id="m-c" placeholder="Option C" class="bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                        <input id="m-d" placeholder="Option D" class="bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                    </div>
                    <select id="m-correct" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                        <option value="A">Correct: A</option><option value="B">Correct: B</option>
                        <option value="C">Correct: C</option><option value="D">Correct: D</option>
                    </select>
                    <input id="m-sub" placeholder="Subject (e.g. GK, Pak Studies)" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-xs">
                    <button onclick="saveMCQ(this)" class="btn-primary w-full">Inject MCQ into Database</button>
                </div>

                <div class="card p-8 space-y-4 h-fit">
                    <h3 class="font-black text-xs uppercase tracking-widest text-slate-500">Post New Alert</h3>
                    <input id="n-title" placeholder="Notification Title" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-sm">
                    <input id="n-link" placeholder="External Link URL" class="w-full bg-white/5 border border-white/10 p-3 rounded-lg text-sm">
                    <button onclick="saveNotif(this)" class="btn-primary w-full">Broadcast Alert</button>
                </div>
            </div>
        </div>
    `;
}

// --- DATABASE PUSHERS ---
async function saveMCQ(btn) {
    const data = {
        Question: document.getElementById('m-q').value,
        OptionA: document.getElementById('m-a').value,
        OptionB: document.getElementById('m-b').value,
        OptionC: document.getElementById('m-c').value,
        OptionD: document.getElementById('m-d').value,
        CorrectOption: document.getElementById('m-correct').value,
        Subject: document.getElementById('m-sub').value
    };

    if(!data.Question || !data.Subject) return alert("Fields missing!");
    
    btn.disabled = true; btn.innerText = "Syncing...";
    try {
        await db.collection('mcqs').add(data);
        alert("Success! MCQ added.");
        location.reload();
    } catch(e) { alert("Error: " + e.message); btn.disabled = false; }
}

async function saveNotif(btn) {
    const title = document.getElementById('n-title').value;
    const link = document.getElementById('n-link').value;
    
    if(!title) return alert("Title missing!");
    
    btn.disabled = true;
    try {
        await db.collection('notifications').add({
            Title: title,
            Link: link || "#",
            Date: new Date().toLocaleDateString('en-GB'),
            timestamp: Date.now()
        });
        alert("Success! Alert posted.");
        location.reload();
    } catch(e) { alert("Error: " + e.message); btn.disabled = false; }
}

// --- PREVIOUS RENDERERS (Home, Subjects, etc - Keep your existing ones) ---
function renderHome(cont) {
    cont.innerHTML = `
        <div class="animate-view space-y-12">
            <section class="card p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden relative">
                <div class="relative z-10">
                    <h2 class="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-white">BUILD YOUR<br><span class="text-cyan-400">LEGACY.</span></h2>
                    <p class="mt-6 text-slate-400 max-w-sm font-medium">Pakistan's most advanced Question Bank. Direct Firestore integration.</p>
                    <div class="mt-10 flex gap-4"><button onclick="router('subjects')" class="btn-primary px-10 py-5 text-sm">Open the Vault</button></div>
                </div>
            </section>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 space-y-8">
                    <h3 class="urdu text-3xl font-bold text-cyan-400">تازہ ترین اپڈیٹس</h3>
                    <div class="space-y-4">
                        ${window.SHARK.notifications.map(n => `
                            <div class="card p-6 flex justify-between items-center group">
                                <a href="${n.Link}" target="_blank" class="block font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">${n.Title}</a>
                                <span class="text-[9px] font-black text-slate-700">${n.Date}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <aside class="card p-8 bg-cyan-400/5">
                    <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Candidate XP</h4>
                    <span class="text-5xl font-black text-white">${window.SHARK.xp}</span>
                </aside>
            </div>
        </div>`;
}

function renderSubjects(cont) {
    cont.innerHTML = `<div class="animate-view space-y-10">
        <h2 class="text-4xl font-black uppercase tracking-tighter">Subject Bank</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${window.SHARK.subjects.map(s => `
                <div onclick="initQuiz('${s}')" class="card p-10 cursor-pointer group hover:bg-cyan-400/5 transition-all">
                    <h4 class="text-2xl font-bold group-hover:text-cyan-400">${s}</h4>
                </div>
            `).join('')}
        </div>
    </div>`;
}

// --- QUIZ, AUTH, & BOOT (Keep your existing versions of these) ---
function initQuiz(sub) { /* Same as your current version */ }
function login() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function logout() { auth.signOut().then(() => location.reload()); }
auth.onAuthStateChanged(user => {
    if(user) {
        window.SHARK.user = user;
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-name').innerText = user.displayName.split(' ');
        if(user.email === ADMIN_EMAIL) console.log("ADMIN ACCESS GRANTED. Run router('admin') to manage data.");
    }
});
document.addEventListener('DOMContentLoaded', boot);