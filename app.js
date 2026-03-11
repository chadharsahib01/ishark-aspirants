/**
 * I-SHARK CORE ENGINE v2.1
 * Stabilized Production Build
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

let quizState = null;

window.SHARK = {
    user: null,
    mcqs: [],
    notifications: [],
    subjects: [],
    xp: parseInt(localStorage.getItem("user_xp")) || 0
};

function shuffle(arr) {
    let a = [...arr];

    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }

    return a;
}

async function boot() {

    try {

        const [nSnap, mSnap] = await Promise.all([
            db.collection("notifications")
            .orderBy("timestamp", "desc")
            .limit(10)
            .get(),

            db.collection("mcqs").get()
        ]);

        window.SHARK.notifications = nSnap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        window.SHARK.mcqs = mSnap.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        window.SHARK.subjects = [...new Set(
            window.SHARK.mcqs.map(m => m.Subject)
        )]
        .filter(Boolean)
        .sort();

        const loader = document.getElementById("boot-loader");

        if (loader) loader.remove();

        router("home");

    } catch (e) {

        console.error("BOOT FAILURE", e);

        document.body.innerHTML = `
        <div class="h-screen flex items-center justify-center bg-black text-red-400">
        System Boot Failure
        </div>`;
    }
}

function router(view) {

    const cont = document.getElementById("view-container");

    if (!cont) return;

    window.scrollTo(0, 0);

    switch (view) {

        case "home":
        renderHome(cont);
        break;

        case "vault":
        renderVault(cont);
        break;

        case "quiz":
        renderQuiz();
        break;

        case "admin":
        renderAdmin(cont);
        break;

        case "alerts":
        renderHome(cont);
        break;

        default:
        renderHome(cont);
    }
}

function login() {

    const btn = document.getElementById("login-btn");

    if (btn) btn.innerText = "Connecting";

    auth.signInWithRedirect(
        new firebase.auth.GoogleAuthProvider()
    );
}

function logout() {

    auth.signOut()
    .then(() => {

        localStorage.clear();
        location.reload();

    });
}

function updateProfileUI() {

    const prof = document.getElementById("user-profile");
    const loginBtn = document.getElementById("login-btn");

    const user = window.SHARK.user;

    if (user && prof && loginBtn) {

        loginBtn.classList.add("hidden");
        prof.classList.remove("hidden");

        document.getElementById("user-initial").innerText = user.displayName.charAt(0);

        document.getElementById("nav-xp").innerText = window.SHARK.xp.toLocaleString() + " XP";

        if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {

            console.log("Admin Access Enabled. router('admin')");
        }
    }
}

auth.onAuthStateChanged(user => {

    if (user) {

        window.SHARK.user = user;

        updateProfileUI();

    }
});

function renderHome(cont) {

    const alertsHTML = window.SHARK.notifications.length

    ? window.SHARK.notifications.map(n => `

    <div class="card p-5 mb-3">

    <a href="${n.Link || "#"}" target="_blank">

    ${n.Title || "Latest Update"}

    </a>

    <div>${n.Date || "Today"}</div>

    </div>

    `).join("")

    : `<p>No alerts found</p>`;


    cont.innerHTML = `

    <h2>Student Dashboard</h2>

    <div>

    <h3>Recruitment Alerts</h3>

    ${alertsHTML}

    </div>

    <button onclick="router('vault')">

    Start Practice

    </button>

    `;

    updateProfileUI();
}

function renderVault(cont) {

    const subjectsHTML = window.SHARK.subjects.length

    ? window.SHARK.subjects.map(s => `

    <div onclick="initQuiz('${s}')">

    <h3>${s}</h3>

    </div>

    `).join("")

    : `<p>No subjects</p>`;


    cont.innerHTML = `

    <h1>Subject Vault</h1>

    ${subjectsHTML}

    `;
}

function initQuiz(sub) {

    const questions = shuffle(

        window.SHARK.mcqs
        .filter(m => m.Subject === sub)

    ).slice(0, 10);


    if (!questions.length) {

        alert("No questions in this subject");

        return;
    }


    quizState = {

        active: true,

        pool: questions,

        index: 0,

        score: 0,

        answered: false,

        results: []
    };


    renderQuiz();
}

function renderQuiz() {

    const cont = document.getElementById("view-container");

    const q = quizState.pool[quizState.index];


    const progress = ((quizState.index + 1) / quizState.pool.length) * 100;


    cont.innerHTML = `

    <div class="progress">

    <div style="width:${progress}%"></div>

    </div>


    <h2>${q.Question}</h2>


    ${["A", "B", "C", "D"].map(o => `

    <button

    data-option="${o}"

    onclick="handleAnswer(this,'${o}')">

    ${q["Option" + o]}

    </button>

    `).join("")}


    <button id="btn-next" onclick="nextQ()" style="display:none">

    Next

    </button>

    `;
}

function handleAnswer(el, choice) {

    if (!quizState.active || quizState.answered) return;

    quizState.answered = true;


    const correct = quizState.pool[quizState.index].CorrectOption
    .trim()
    .toUpperCase();


    const isCorrect = choice === correct;


    if (isCorrect) {

        quizState.score++;

        el.style.border = "2px solid green";

    } else {

        el.style.border = "2px solid red";
    }


    quizState.results.push({

        question: quizState.pool[quizState.index].Question,

        userChoice: choice,

        correctChoice: correct,

        isCorrect

    });


    document.getElementById("btn-next").style.display = "block";
}

function nextQ() {

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
}

function renderAnalysis() {

    const cont = document.getElementById("view-container");


    cont.innerHTML = `

    <h2>Quiz Complete</h2>

    <p>Score ${quizState.score} / ${quizState.pool.length}</p>

    <button onclick="router('home')">

    Return Home

    </button>

    `;
}

function renderAdmin(cont) {

    if (!window.SHARK.user || window.SHARK.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {

        cont.innerHTML = `<h2>403 Unauthorized</h2>`;

        return;
    }


    cont.innerHTML = `

    <h2>Command Center</h2>

    <input id="m-q" placeholder="Question">

    <input id="m-a" placeholder="A">

    <input id="m-b" placeholder="B">

    <input id="m-c" placeholder="C">

    <input id="m-d" placeholder="D">


    <select id="m-correct">

    <option value="A">A</option>

    <option value="B">B</option>

    <option value="C">C</option>

    <option value="D">D</option>

    </select>


    <input id="m-sub" placeholder="Subject">


    <button onclick="adminAction('mcq',this)">

    Add MCQ

    </button>


    <hr>


    <input id="n-t" placeholder="Alert Title">

    <input id="n-l" placeholder="Link">


    <button onclick="adminAction('notif',this)">

    Publish Alert

    </button>

    `;
}

async function adminAction(type, btn) {

    const original = btn.innerText;

    btn.disabled = true;

    btn.innerText = "Syncing";


    try {

        if (type === "mcq") {

            const data = {

                Question: document.getElementById("m-q").value,

                OptionA: document.getElementById("m-a").value,

                OptionB: document.getElementById("m-b").value,

                OptionC: document.getElementById("m-c").value,

                OptionD: document.getElementById("m-d").value,

                CorrectOption: document.getElementById("m-correct").value,

                Subject: document.getElementById("m-sub").value
            };


            if (!data.Question || !data.Subject)
            throw new Error("Missing fields");


            await db.collection("mcqs").add(data);

        }

        else {

            const title = document.getElementById("n-t").value;

            if (!title)
            throw new Error("Title required");


            await db.collection("notifications").add({

                Title: title,

                Link: document.getElementById("n-l").value || "#",

                Date: new Date().toLocaleDateString("en-GB"),

                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }


        alert("Database Updated");

        location.reload();

    }

    catch (e) {

        alert("Error " + e.message);

        btn.disabled = false;

        btn.innerText = original;
    }
}

document.addEventListener("DOMContentLoaded", boot);
