import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ELEMENTS */
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const thankYouSection = document.getElementById("thankYouSection");

const bucketListEl = document.getElementById("bucketList");
const goalInput = document.getElementById("goalInput");
const addGoalBtn = document.getElementById("addGoalBtn");
const bucketStatus = document.getElementById("bucketStatus");
const progressFill = document.getElementById("progressFill");
const progressLabel = document.getElementById("progressLabel");

/* DEFAULT GOALS — used only the very first time, before anything is saved */
const DEFAULT_GOALS = [
  { text: "Travel to a new country together", done: false },
  { text: "Take a smoke break together", done: false },
  { text: "Cook each other's favorite childhood meal", done: false },
  { text: "Stay up talking until sunrise", done: false },
  { text: "Have a whole night movie marathon", done: false },
  { text: "Write each other a letter to open in 5 years", done: false }
];

const bucketDocRef = doc(db, "shared", "bucketList");
let goals = [];

/* THE QUESTION — same dodging No button as before */
noBtn.addEventListener("mouseover", () => {
  const x = Math.random() * 200 - 100;
  const y = Math.random() * 200 - 100;
  noBtn.style.transform = `translate(${x}px, ${y}px)`;
});

yesBtn.addEventListener("click", () => {
  thankYouSection.classList.remove("hidden");
  thankYouSection.scrollIntoView({ behavior: "smooth", block: "center" });
});

/* RENDER BUCKET LIST */
function renderGoals() {
  bucketListEl.innerHTML = "";

  goals.forEach((goal, index) => {
    const row = document.createElement("div");
    row.className = "bucketItem" + (goal.done ? " done" : "");

    const checkbox = document.createElement("button");
    checkbox.type = "button";
    checkbox.className = "bucketCheckbox" + (goal.done ? " checked" : "");
    checkbox.textContent = goal.done ? "✓" : "";
    checkbox.addEventListener("click", () => toggleGoal(index));

    const text = document.createElement("span");
    text.className = "bucketText";
    text.textContent = goal.text;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "bucketDelete";
    del.textContent = "×";
    del.addEventListener("click", () => deleteGoal(index));

    row.appendChild(checkbox);
    row.appendChild(text);
    row.appendChild(del);
    bucketListEl.appendChild(row);
  });

  const total = goals.length;
  const done = goals.filter(g => g.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressFill.style.width = pct + "%";
  progressLabel.textContent = `${done} of ${total} done`;
}

/* SAVE TO FIRESTORE — shared between both of you */
async function saveGoals() {
  try {
    await setDoc(bucketDocRef, { items: goals });
    bucketStatus.textContent = "";
  } catch (e) {
    bucketStatus.textContent = e.message;
  }
}

function toggleGoal(index) {
  goals[index].done = !goals[index].done;
  renderGoals();
  saveGoals();
}

function deleteGoal(index) {
  goals.splice(index, 1);
  renderGoals();
  saveGoals();
}

addGoalBtn.addEventListener("click", () => {
  const value = goalInput.value.trim();
  if (!value) return;
  goals.push({ text: value, done: false });
  goalInput.value = "";
  renderGoals();
  saveGoals();
});

goalInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addGoalBtn.click();
});

/* AUTH + LOAD */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const snap = await getDoc(bucketDocRef);
    goals = (snap.exists() && Array.isArray(snap.data().items))
      ? snap.data().items
      : DEFAULT_GOALS;
  } catch (e) {
    goals = DEFAULT_GOALS;
    bucketStatus.textContent = e.message;
  }

  renderGoals();
});
