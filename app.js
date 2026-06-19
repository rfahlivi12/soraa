import { auth, db } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ELEMENTS */

const guestbookBtn = document.getElementById("guestbookBtn");
const guestbookPopup = document.getElementById("guestbookPopup");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authStatus = document.getElementById("authStatus");
const authBox = document.getElementById("authBox");

const postBox = document.getElementById("postBox");
const textInput = document.getElementById("textInput");
const uploadBtn = document.getElementById("uploadBtn");

const postsList = document.getElementById("postsList");

/* OPEN GUESTBOOK */

guestbookBtn.addEventListener("click", () => {
  guestbookPopup.classList.remove("hidden");
});

/* SIGN UP */

document.getElementById("signupBtn").addEventListener("click", async () => {
  authStatus.textContent = "";
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

/* LOG IN */

document.getElementById("loginBtn").addEventListener("click", async () => {
  authStatus.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

/* SHOW POST BOX ONLY WHEN LOGGED IN */

onAuthStateChanged(auth, (user) => {
  if (user) {
    authBox.classList.add("hidden");
    postBox.classList.remove("hidden");
  } else {
    authBox.classList.remove("hidden");
    postBox.classList.add("hidden");
  }
});

/* SUBMIT A MESSAGE */

uploadBtn.addEventListener("click", async () => {
  if (!textInput.value.trim()) return;

  await addDoc(collection(db, "posts"), {
    text: textInput.value.trim(),
    user: auth.currentUser.email,
    createdAt: serverTimestamp()
  });

  textInput.value = "";
  loadPosts();
});

/* LOAD + DISPLAY MESSAGES */

async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  postsList.innerHTML = snap.docs
    .map(doc => {
      const p = doc.data();
      return `<p><b>${p.user}:</b> ${p.text}</p>`;
    })
    .join("");
}

loadPosts();
