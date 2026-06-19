import { auth } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

/* SECURITY ELEMENTS */
const authBox = document.getElementById("authBox");
const mainContent = document.getElementById("mainContent");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const authStatus = document.getElementById("authStatus");

/* TITLE ANIMATION CONFIG */
const title = "Hi Sora";
const titleElement = document.getElementById("title");
let titleIndex = 0;
let typingStarted = false;

function typeTitle() {
  if (titleIndex < title.length) {
    titleElement.innerHTML += title.charAt(titleIndex);
    titleIndex++;
    setTimeout(typeTitle, 100);
  }
}

/* GLOBAL SECURITY CHECK (Gated Entry) */
onAuthStateChanged(auth, (user) => {
  if (user) {
    sessionStorage.setItem("unlocked", "true");
    authBox.classList.add("hidden");
    mainContent.classList.remove("hidden");
    
    // Triggers the typewriter profile animation only after successful entry
    if (!typingStarted) {
      titleElement.innerHTML = "";
      titleIndex = 0;
      typingStarted = true;
      typeTitle();
    }
  } else {
    sessionStorage.removeItem("unlocked");
    authBox.classList.remove("hidden");
    mainContent.classList.add("hidden");
  }
});

/* LANDING PAGE SIGNUP */
signupBtn.addEventListener("click", async () => {
  authStatus.textContent = "";
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

/* LANDING PAGE LOGIN */
loginBtn.addEventListener("click", async () => {
  authStatus.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

/* DISTANCE SELECTION */
const distanceBtn = document.getElementById("distanceBtn");
const distanceSection = document.getElementById("distanceSection");

distanceBtn.addEventListener("click", () => {
  distanceSection.classList.toggle("hidden");
});

/* QR MODAL */
const scanBtn = document.getElementById("scanBtn");
const qrPopup = document.getElementById("qrPopup");

scanBtn.addEventListener("click", () => {
  qrPopup.classList.remove("hidden");
});

/* FUTURE LOGIC BUTTONS */
const futureBtn = document.getElementById("futureBtn");
const futurePopup = document.getElementById("futurePopup");
const successPopup = document.getElementById("successPopup");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");

futureBtn.addEventListener("click", () => {
  futurePopup.classList.remove("hidden");
});

yesBtn.addEventListener("click", () => {
  futurePopup.classList.add("hidden");
  successPopup.classList.remove("hidden");
});

noBtn.addEventListener("mouseover", () => {
  const x = Math.random() * 200 - 100;
  const y = Math.random() * 200 - 100;
  noBtn.style.transform = `translate(${x}px, ${y}px)`;
});

/* CLOSE UTILITIES */
const closeButtons = document.querySelectorAll(".closeBtn");

closeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.close;
    document.getElementById(target).classList.add("hidden");
  });
});

window.addEventListener("click", (event) => {
  if (event.target.classList.contains("popup")) {
    event.target.classList.add("hidden");
  }
});

/* MUSIC TRACKING */
const music = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicBtn");
let isPlaying = false;

musicBtn.addEventListener("click", () => {
  if (!isPlaying) {
    music.play();
    musicBtn.innerHTML = "❚❚";
    isPlaying = true;
  } else {
    music.pause();
    musicBtn.innerHTML = "♫";
    isPlaying = false;
  }
});
