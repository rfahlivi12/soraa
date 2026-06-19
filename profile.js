import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ELEMENTS */
const authBox = document.getElementById("authBox");
const profileBox = document.getElementById("profileBox");
const avatarPreview = document.getElementById("avatarPreview");
const photoInput = document.getElementById("photoInput");
const displayNameInput = document.getElementById("displayNameInput");
const emojiButtons = document.querySelectorAll(".emojiOption");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileStatus = document.getElementById("profileStatus");

let selectedEmoji = null;
let selectedFileBase64 = null;
let currentPhotoURL = null;

/* CLICK ON AVATAR TRIGGERS FILE CHOOSE */
avatarPreview.addEventListener("click", () => photoInput.click());

/* UPDATE LIVE PREVIEW */
function updatePreview() {
  if (selectedFileBase64) {
    avatarPreview.innerHTML = `<img src="${selectedFileBase64}" style="width:100%; height:100%; object-fit:cover;">`;
  } else if (currentPhotoURL) {
    avatarPreview.innerHTML = `<img src="${currentPhotoURL}" style="width:100%; height:100%; object-fit:cover;">`;
  } else {
    const name = displayNameInput.value.trim() || (auth.currentUser ? auth.currentUser.email : "");
    avatarPreview.textContent = selectedEmoji || (name ? name.charAt(0).toUpperCase() : "?");
  }
}

/* CONVERT IMAGE FILE TO BASE64 TEXT STRING */
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

/* LISTENERS */
displayNameInput.addEventListener("input", updatePreview);

photoInput.addEventListener("change", async (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    
    // Tiny safety check to make sure the file isn't massive
    if (file.size > 1024 * 1024) { 
      profileStatus.textContent = "Image is too large! Please pick a photo under 1MB.";
      return;
    }

    selectedFileBase64 = await convertToBase64(file);
    selectedEmoji = null; 
    emojiButtons.forEach(b => b.classList.remove("selected"));
    updatePreview();
  }
});

emojiButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    selectedEmoji = btn.dataset.emoji;
    selectedFileBase64 = null; 
    currentPhotoURL = null;
    photoInput.value = ""; 
    emojiButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    updatePreview();
  });
});

/* RE-LOAD PROFILE INFO */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    authBox.classList.add("hidden");
    profileBox.classList.remove("hidden");

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        displayNameInput.value = data.displayName || "";
        currentPhotoURL = data.photoURL || null;
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
    authBox.classList.remove("hidden");
    profileBox.classList.add("hidden");
  }
});

/* WRITE DIRECTLY TO FIRESTORE */
saveProfileBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return;

  profileStatus.textContent = "Saving...";
  let finalPhotoURL = selectedFileBase64 || currentPhotoURL;

  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), {
      displayName: displayNameInput.value.trim() || auth.currentUser.email,
      avatarEmoji: selectedEmoji || null,
      photoURL: finalPhotoURL || null,
      email: auth.currentUser.email
    }, { merge: true });

    profileStatus.textContent = "Profile Saved Successfully!";
    selectedFileBase64 = null; 
    currentPhotoURL = finalPhotoURL;
    updatePreview();
  } catch (e) {
    profileStatus.textContent = e.message;
  }
});
