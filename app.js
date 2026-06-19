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
  getDoc,
  doc,
  updateDoc,
  increment,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ELEMENTS */
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authStatus = document.getElementById("authStatus");
const authBox = document.getElementById("authBox");

const postBox = document.getElementById("postBox");
const textInput = document.getElementById("textInput");
const uploadBtn = document.getElementById("uploadBtn");
const composeAvatar = document.getElementById("composeAvatar");

const postsList = document.getElementById("postsList");

let currentProfile = null; 

/* HELPER: GENERATE DEFAULT AVATAR BACKGROUND COLOR */
function avatarColor(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#ff6b6b", "#4dadf7", "#51cf66", "#fcc419", "#ff922b", "#b197fc", "#f06595"];
  return colors[Math.abs(hash) % colors.length];
}

/* TIME AGO HELPER */
function timeAgo(date) {
  if (!date) return "Just now";
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  return "Just now";
}

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

/* AUTH MONITOR LOOP */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    authBox.classList.add("hidden");
    postBox.classList.remove("hidden");

    currentProfile = null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) currentProfile = snap.data();
    } catch (e) {
      console.error(e);
    }

    const name = (currentProfile && currentProfile.displayName) || user.email;
    
    // Renders custom profile picture or falls back to emoji/letter in compose area
    if (currentProfile && currentProfile.photoURL) {
      composeAvatar.innerHTML = `<img src="${currentProfile.photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      composeAvatar.textContent = (currentProfile && currentProfile.avatarEmoji) || name.charAt(0).toUpperCase();
      composeAvatar.style.background = avatarColor(user.email);
    }
  } else {
    authBox.classList.remove("hidden");
    postBox.classList.add("hidden");
  }
  loadPosts();
});

/* POST ACTION EVENT */
uploadBtn.addEventListener("click", async () => {
  if (!textInput.value.trim()) return;

  const user = auth.currentUser;
  const displayName = (currentProfile && currentProfile.displayName) || user.email;
  const avatarEmoji = (currentProfile && currentProfile.avatarEmoji) || null;
  const photoURL = (currentProfile && currentProfile.photoURL) || null;

  await addDoc(collection(db, "posts"), {
    text: textInput.value.trim(),
    user: user.email,
    displayName,
    avatarEmoji,
    photoURL,
    likes: [],
    commentCount: 0,
    createdAt: serverTimestamp()
  });

  textInput.value = "";
  loadPosts();
});

/* READ DATABASE AND RENDER TIMELINE FEED */
async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  postsList.innerHTML = "";

  snap.docs.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;
    const name = post.displayName || post.user;

    // Checks photo layout state dynamically per card
    let avatarTemplate = "";
    if (post.photoURL) {
      avatarTemplate = `<div class="avatar" style="overflow:hidden;"><img src="${post.photoURL}" style="width:100%; height:100%; object-fit:cover;"></div>`;
    } else {
      const avatarContent = post.avatarEmoji || name.charAt(0).toUpperCase();
      avatarTemplate = `<div class="avatar" style="background:${avatarColor(post.user)}">${avatarContent}</div>`;
    }

    const tweet = document.createElement("div");
    tweet.className = "tweet";
    tweet.innerHTML = `
      <div class="tweetHeader">
        ${avatarTemplate}
        <div class="tweetMeta">
          <span class="tweetUser"></span>
          <span class="tweetTime">${timeAgo(post.createdAt ? post.createdAt.toDate() : null)}</span>
        </div>
      </div>
      <p class="tweetText"></p>
    `;

    tweet.querySelector(".tweetUser").textContent = name;
    tweet.querySelector(".tweetText").textContent = post.text;

    postsList.appendChild(tweet);
  });
}
