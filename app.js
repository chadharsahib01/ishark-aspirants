/**
 * I-SHARK CORE ENGINE v2.0
 * 2026 Production Build
 */

const firebaseConfig = {
    apiKey: "AIzaSyC8nptTKV3cJtnkri-hDZNCTidlMeGcCIs",
    authDomain: "i-shark.firebaseapp.com",
    projectId: "i-shark",
    storageBucket: "i-shark.firebasestorage.app",
    messagingSenderId: "304378182943",
    appId: "1:304378182943:web:305b03b013367c8ff1c42a"
};

// Initialize Security Gate
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

// 1. BOOT SEQUENCE
async function boot() {
    try {
        // Parallel sync for speed
        const [nSnap, mSnap] = await Promise.all([
            db.collection("notifications").orderBy("timestamp", "desc").limit(10).get(),
            db.collection("mcqs").get()
        ]);

        window.SHARK.notifications = nSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.SHARK.mcqs = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.SHARK.subjects = [...new Set(window.SHARK.mcqs.map(m => m.Subject))].filter(Boolean).sort();

        // Kill loader
        const loader = document.getElementById("boot-loader");
        if(loader) loader.remove();
        
        router("home");
    } catch (e) {
        console.error("Critical Boot Failure:", e);
        document.body.innerHTML = `<div class="h-screen flex items-center justify-center bg-obsidian text-red-400 font-black uppercase">Link Severed. Check Console.</div>`;
    }
}

// 2. SWITCH ROUTER
function router(view) {
    const cont = document.getElementById("view-container");
    window.scrollTo(0,0);
    
    switch(view) {
        case "home": renderHome(cont); break;
        case "vault": renderVault(cont); break;
        case "quiz": renderQuiz(cont); break;
        default: renderHome(cont);
    }
}

// 3. IDENTITY MANAGEMENT
function login() {
    const btn = document.getElementById("login-btn");
    btn.innerText = "Connecting...";
    auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
}

function logout() {
    auth.signOut().then(() => {
        localStorage.clear();
        location.reload();
    });
}

function updateProfileUI() {
    const prof = document.getElementById("user-profile");
    const loginBtn = document.getElementById("login-btn");
    const user = window.SHARK.user;

    if (user && prof) {
        loginBtn.classList.add("hidden");
        prof.classList.remove("hidden");
        document.getElementById("user-initial").innerText = user.displayName.charAt(0);
        document.getElementById("nav-xp").innerText = `${window.SHARK.xp.toLocaleString()} XP`;
        
        // Admin Shortcut
        if(user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            console.log("Command Center Access: Type router('admin')");
        }
    }
}

auth.onAuthStateChanged(user => {
    if (user) {
        window.SHARK.user = user;
        updateProfileUI();
    }
});

// Start Engine
document.addEventListener("DOMContentLoaded", boot);
// --- PHASE 2: STUDENT DASHBOARD UI ---
function renderHome(cont) {
    // Generate the Job Alerts HTML from the database
    const alertsHTML = window.SHARK.notifications.length ? 
        window.SHARK.notifications.map(n => `
            <div class="card p-5 flex justify-between items-center group glass-panel rounded-xl mb-3">
                <div class="flex flex-col">
                    <a href="${n.Link || '#'}" target="_blank" class="font-bold text-slate-100 group-hover:text-primary transition-colors text-lg urdu-text">
                        ${n.Title || n.text || 'Latest Update'}
                    </a>
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Government Sector</span>
                </div>
                <span class="text-[10px] font-black text-slate-700 uppercase">${n.Date || 'Just Now'}</span>
            </div>
        `).join('') : `<p class="text-slate-600 italic">Scanning for new recruitment updates...</p>`;

    cont.innerHTML = `
        <div class="animate-view space-y-10">
            <header class="space-y-1">
                <h2 class="text-4xl font-black text-white tracking-tight">Student Dashboard</h2>
                <p class="text-slate-400 font-medium">Welcome back, Scholar. Your path to excellence starts here.</p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div class="lg:col-span-8 group">
                    <div class="glass-panel rounded-xl overflow-hidden h-full flex flex-col md:flex-row glow-subtle transition-all duration-300 hover:border-primary/40">
                        <div class="md:w-2/5 relative h-48 md:h-auto overflow-hidden bg-slate-900">
                            <div class="absolute inset-0 bg-gradient-to-t from-obsidian to-transparent z-10 md:hidden"></div>
                            <img src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1000" 
                                 class="object-cover h-full w-full opacity-40 group-hover:scale-105 transition-transform duration-700">
                        </div>
                        <div class="p-8 flex-1 flex flex-col justify-between space-y-6">
                            <div>
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                                    <span class="text-primary text-[10px] font-bold uppercase tracking-widest">Live Recruitment Updates</span>
                                </div>
                                <h3 class="text-2xl font-bold text-white mb-2">PPSC/FPSC Alerts</h3>
                                <div class="max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    ${alertsHTML}
                                </div>
                            </div>
                            <button onclick="router('alerts')" class="bg-primary hover:bg-primary/80 text-obsidian font-black py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 w-full md:w-fit group/btn text-xs uppercase tracking-widest">
                                View Full Archive
                                <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-4">
                    <div class="glass-panel rounded-xl p-8 h-full flex flex-col justify-between border-primary/10 hover:border-primary/40 transition-all">
                        <div>
                            <div class="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                                <span class="material-symbols-outlined text-primary text-3xl">psychology_alt</span>
                            </div>
                            <h3 class="text-2xl font-bold text-white mb-2">Quiz System</h3>
                            <p class="text-slate-400 text-sm leading-relaxed">Challenge yourself with time-bound mock exams tailored for competitive testing.</p>
                        </div>
                        <div class="mt-8 space-y-4">
                            <div class="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                <span>Session Goal</span>
                                <span class="text-primary">Ready</span>
                            </div>
                            <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div class="h-full bg-primary rounded-full shadow-[0_0_10px_#0df2f2] w-[10%]"></div>
                            </div>
                            <button onclick="router('vault')" class="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4 group">
                                <span class="material-symbols-outlined">play_arrow</span>
                                Start Practice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    updateProfileUI();
}
// --- PHASE 3: SUBJECT SELECTION VAULT ---
function renderVault(cont) {
    // Priority 5 & 11: Generate grid based on subjects found in the MCQs collection
    const subjectsHTML = window.SHARK.subjects.length ? 
        window.SHARK.subjects.map(s => `
            <div onclick="initQuiz('${s}')" class="glass-panel group rounded-xl p-6 flex flex-col justify-between aspect-[4/3] cursor-pointer hover:border-primary/50 transition-all">
                <div class="flex justify-between items-start">
                    <div class="p-3 rounded-lg bg-primary/10 text-primary">
                        <span class="material-symbols-outlined text-3xl">
                            ${getIcon(s)}
                        </span>
                    </div>
                    <span class="text-[10px] font-black px-2 py-1 rounded bg-primary/20 text-primary uppercase tracking-widest">Active</span>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-slate-100 mb-2">${s}</h3>
                    <p class="text-xs text-slate-400 font-medium">Master this category with our curated question banks.</p>
                </div>
            </div>
        `).join('') : `
            <div class="col-span-full card p-20 text-center">
                <p class="text-slate-500 italic uppercase tracking-widest text-xs">No subject modules currently synchronized.</p>
            </div>`;

    cont.innerHTML = `
        <div class="animate-view space-y-12">
            <div class="flex justify-between items-end border-b border-white/5 pb-6">
                <div>
                    <h1 class="text-4xl font-black text-white tracking-tight">Subject Vault</h1>
                    <p class="text-slate-400 font-medium mt-1 text-sm">Choose your field of study to begin your practice.</p>
                </div>
                <button onclick="router('home')" class="text-[10px] font-black text-slate-600 hover:text-white transition-colors uppercase tracking-widest">← Back to HQ</button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                ${subjectsHTML}
            </div>

            <div class="mt-16 glass-panel rounded-2xl p-8 flex flex-wrap gap-8 items-center justify-around border-primary/5 bg-primary/5">
                <div class="text-center">
                    <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Vault MCQs</p>
                    <p class="text-2xl font-black text-primary">${window.SHARK.mcqs.length.toLocaleString()}+</p>
                </div>
                <div class="h-10 w-px bg-white/5 hidden md:block"></div>
                <div class="text-center">
                    <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">System Health</p>
                    <p class="text-2xl font-black text-primary">99.8%</p>
                </div>
                <div class="h-10 w-px bg-white/5 hidden md:block"></div>
                <div class="text-center">
                    <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Success Rate</p>
                    <p class="text-2xl font-black text-primary">94.2%</p>
                </div>
            </div>
        </div>
    `;
}

// Helper: Maps subject names to Material Icons
function getIcon(sub) {
    const s = sub.toLowerCase();
    if (s.includes('knowledge')) return 'public';
    if (s.includes('pakistan')) return 'account_balance';
    if (s.includes('islam')) return 'mosque';
    if (s.includes('science')) return 'biotech';
    if (s.includes('english')) return 'translate';
    return 'menu_book';
}