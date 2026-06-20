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

let photoBase64 = null;   // base64 string of the new/existing photo
let photoChanged = false; // track if user picked a new photo

/* ── RENDER AVATAR ──
   Shows photo if available, otherwise shows initial letter */
function renderAvatar(base64, name, email) {
  avatarPreview.innerHTML = "";
  avatarPreview.style.backgroundImage = "";

  if (base64) {
    avatarPreview.style.backgroundImage = `url(${base64})`;
    avatarPreview.style.backgroundSize  = "cover";
    avatarPreview.style.backgroundPosition = "center";
    avatarPreview.textContent = "";
  } else {
    const label = name || email || "?";
    avatarPreview.textContent = label.charAt(0).toUpperCase();
    avatarPreview.style.backgroundImage = "";
  }
}

/* ── COMPRESS IMAGE to base64 (max ~150KB output) ── */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const MAX_SIZE = 600; // px — enough for a crisp avatar
    const QUALITY  = 0.75;

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height / width) * MAX_SIZE);
          width  = MAX_SIZE;
        } else {
          width  = Math.round((width / height) * MAX_SIZE);
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      const base64 = canvas.toDataURL("image/jpeg", QUALITY);

      // Safety: Firestore doc limit is 1 MB — base64 of 600px JPEG is ~50-100 KB
      if (base64.length > 900_000) {
        // Re-compress harder if still too big
        resolve(canvas.toDataURL("image/jpeg", 0.45));
      } else {
        resolve(base64);
      }
    };

    img.onerror = () => reject(new Error("Could not load image"));
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
    photoBase64  = await compressImage(file);
    photoChanged = true;
    renderAvatar(photoBase64, displayNameInput.value.trim(), auth.currentUser?.email);
    avatarHint.textContent = "Photo ready — tap Save Profile";
  } catch (e) {
    avatarHint.textContent = "Could not load image, try another.";
    console.error(e);
  }

  photoInput.value = ""; // reset so same file can be re-picked
});

/* ── LIVE NAME PREVIEW (only when no photo) ── */
displayNameInput.addEventListener("input", () => {
  if (!photoBase64) renderAvatar(null, displayNameInput.value.trim(), auth.currentUser?.email);
});

/* ── LOAD EXISTING PROFILE ── */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  profileBox.classList.remove("hidden");

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      displayNameInput.value = data.displayName || "";
      photoBase64 = data.photoBase64 || null;
    }
  } catch (e) {
    console.error(e);
  }

  renderAvatar(photoBase64, displayNameInput.value.trim(), user.email);
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

    // Only write photoBase64 if changed (saves Firestore write size)
    if (photoChanged) {
      payload.photoBase64 = photoBase64;
    }

    await setDoc(doc(db, "users", auth.currentUser.uid), payload, { merge: true });

    photoChanged = false;
    profileStatus.textContent = "✓ Profile saved!";
    avatarHint.textContent = "Tap the pencil to change photo";
  } catch (e) {
    profileStatus.textContent = "Error: " + e.message;
    console.error(e);
  } finally {
    saveProfileBtn.disabled = false;
  }
});
