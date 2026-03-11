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