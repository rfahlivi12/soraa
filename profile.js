import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ELEMENTS */
const profileBox = document.getElementById("profileBox");
const avatarPreview = document.getElementById("avatarPreview");
const displayNameInput = document.getElementById("displayNameInput");
const emojiButtons = document.querySelectorAll(".emojiOption");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileStatus = document.getElementById("profileStatus");

let selectedEmoji = null;

/* UPDATE LIVE PREVIEW */
function updatePreview() {
  if (selectedEmoji) {
    avatarPreview.textContent = selectedEmoji;
  } else {
    const name = displayNameInput.value.trim() || (auth.currentUser ? auth.currentUser.email : "");
    avatarPreview.textContent = name ? name.charAt(0).toUpperCase() : "?";
  }
}

/* LISTENERS */
displayNameInput.addEventListener("input", updatePreview);

emojiButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    selectedEmoji = btn.dataset.emoji;
    emojiButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    updatePreview();
  });
});

/* RE-LOAD PROFILE INFO */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (profileBox) profileBox.classList.remove("hidden");

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        displayNameInput.value = data.displayName || "";
        selectedEmoji = data.avatarEmoji || null;

        if (selectedEmoji) {
          emojiButtons.forEach(b => {
            b.classList.toggle("selected", b.dataset.emoji === selectedEmoji);
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    updatePreview();
  } else {
    // Safety redirect if someone stumbles onto profile without logging in
    window.location.href = "index.html";
  }
});

/* SAVE ACTION */
saveProfileBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return;

  profileStatus.textContent = "Saving...";

  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), {
      displayName: displayNameInput.value.trim() || auth.currentUser.email,
      avatarEmoji: selectedEmoji || null,
      email: auth.currentUser.email
    }, { merge: true });

    profileStatus.textContent = "Profile Saved Successfully!";
  } catch (e) {
    profileStatus.textContent = e.message;
  }
});
