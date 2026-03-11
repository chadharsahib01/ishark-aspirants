const firebaseConfig = { apiKey: "AIzaSyC8nptTKV3cJtnkri-hDZNCTidlMeGcCIs", authDomain: "i-shark.firebaseapp.com", projectId: "i-shark", storageBucket: "i-shark.firebasestorage.app", messagingSenderId: "304378182943", appId: "1:304378182943:web:305b03b013367c8ff1c42a" };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

window.SHARK = { mcqs: [], notifications: [], subjects: [], user: null };

async function boot() {
    try {
        const [nSnap, mSnap] = await Promise.all([
            db.collection('notifications').orderBy('timestamp', 'desc').limit(20).get(),
            db.collection('mcqs').get()
        ]);
        window.SHARK.notifications = nSnap.docs.map(d => d.data());
        window.SHARK.mcqs = mSnap.docs.map(d => d.data());
        window.SHARK.subjects = [...new Set(window.SHARK.mcqs.map(m => m.Subject))].filter(Boolean);
        router('home');
    } catch (e) {
        console.error(e);
        document.getElementById('view-container').innerHTML = `<p class="text-red-400">Database Connection Failed.</p>`;
    }
}

function router(view) {
    const cont = document.getElementById('view-container');
    if(view === 'home') {
        cont.innerHTML = `
            <div class="space-y-8 animate-in fade-in duration-500">
                <section class="card p-10 bg-cyan-500/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 class="text-4xl font-extrabold tracking-tight">Access the <span class="text-cyan-400">Vault.</span></h2>
                        <p class="text-slate-400 mt-2">Premium PPSC & CSS Preparation.</p>
                    </div>
                    <button onclick="router('subjects')" class="btn-primary">Browse Subjects</button>
                </section>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2 space-y-4">
                        <h3 class="urdu text-2xl text-cyan-400">تازہ ترین اپڈیٹس</h3>
                        ${window.SHARK.notifications.map(n => `<div class="card p-4 flex justify-between items-center">
                            <a href="${n.Link}" target="_blank" class="font-bold hover:text-cyan-400">${n.Title}</a>
                            <span class="text-[10px] opacity-40">${n.Date}</span>
                        </div>`).join('')}
                    </div>
                </div>
            </div>`;
    }
    if(view === 'subjects') {
        cont.innerHTML = `
            <div class="space-y-6">
                <h2 class="text-2xl font-bold uppercase tracking-widest">Subject Bank</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    ${window.SHARK.subjects.map(s => `<div class="card p-6 cursor-pointer hover:bg-cyan-500/5 group">
                        <h4 class="text-lg font-bold group-hover:text-cyan-400">${s}</h4>
                    </div>`).join('')}
                </div>
            </div>`;
    }
}

function login() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function logout() { auth.signOut().then(() => location.reload()); }

auth.onAuthStateChanged(user => {
    if(user) {
        window.SHARK.user = user;
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-name').innerText = user.displayName.split(' ');
    }
});

document.addEventListener('DOMContentLoaded', boot);