import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ── ELEMENTS ── */
const profileBox       = document.getElementById("profileBox");
const avatarPreview    = document.getElementById("avatarPreview");
const avatarEditBtn    = document.getElementById("avatarEditBtn");
const photoInput       = document.getElementById("photoInput");
const displayNameInput = document.getElementById("displayNameInput");
const saveProfileBtn   = document.getElementById("saveProfileBtn");
const profileStatus    = document.getElementById("profileStatus");
const avatarHint       = document.getElementById("avatarHint");

let currentPhoto = null;  // base64 loaded from Firestore
let newPhoto     = null;  // base64 of newly picked image

/* ── RENDER AVATAR ── */
function renderAvatar(base64, name, email) {
  const label = (name || email || "?").charAt(0).toUpperCase();
  if (base64) {
    avatarPreview.textContent = "";
    avatarPreview.style.backgroundImage = `url(${base64})`;
  } else {
    avatarPreview.style.backgroundImage = "";
    avatarPreview.textContent = label;
  }
}

/* ── COMPRESS IMAGE → base64 ── */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const MAX_PX  = 600;
    const QUALITY = 0.78;
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) { height = Math.round(height / width * MAX_PX); width = MAX_PX; }
        else                 { width  = Math.round(width / height * MAX_PX); height = MAX_PX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const b64 = canvas.toDataURL("image/jpeg", QUALITY);
      // If still huge, compress harder
      resolve(b64.length > 900_000 ? canvas.toDataURL("image/jpeg", 0.45) : b64);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

/* ── PHOTO PICK ── */
avatarEditBtn.addEventListener("click", () => photoInput.click());

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) return;
  avatarHint.textContent = "Processing…";
  try {
    newPhoto = await compressImage(file);
    renderAvatar(newPhoto, displayNameInput.value.trim(), auth.currentUser?.email);
    avatarHint.textContent = "Photo ready — tap Save Profile ✓";
  } catch (e) {
    avatarHint.textContent = "Could not load image, try another.";
    console.error(e);
  }
  photoInput.value = "";
});

/* ── NAME PREVIEW (only when no photo selected yet) ── */
displayNameInput.addEventListener("input", () => {
  if (!newPhoto && !currentPhoto) {
    renderAvatar(null, displayNameInput.value.trim(), auth.currentUser?.email);
  }
});

/* ── LOAD EXISTING PROFILE ── */
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }

  profileBox.classList.remove("hidden");

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      displayNameInput.value = data.displayName || "";
      currentPhoto = data.photoBase64 || null;
    }
  } catch (e) { console.error(e); }

  renderAvatar(currentPhoto, displayNameInput.value.trim(), user.email);
});

/* ── SAVE ── */
saveProfileBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return;

  saveProfileBtn.disabled = true;
  profileStatus.textContent = "Saving…";

  try {
    const payload = {
      displayName: displayNameInput.value.trim() || auth.currentUser.email,
      email: auth.currentUser.email,
    };

    if (newPhoto) {
      payload.photoBase64 = newPhoto;
      currentPhoto = newPhoto;  // update local state
      newPhoto = null;
    }

    await setDoc(doc(db, "users", auth.currentUser.uid), payload, { merge: true });

    // Re-render to confirm photo is set
    renderAvatar(currentPhoto, displayNameInput.value.trim(), auth.currentUser.email);
    avatarHint.textContent = "Tap the pencil to change photo";
    profileStatus.textContent = "✓ Profile saved!";
  } catch (e) {
    profileStatus.textContent = "Error: " + e.message;
    console.error(e);
  } finally {
    saveProfileBtn.disabled = false;
  }
});
