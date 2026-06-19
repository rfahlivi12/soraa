import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ELEMENTS */
const postBox = document.getElementById("postBox");
const textInput = document.getElementById("textInput");
const uploadBtn = document.getElementById("uploadBtn");
const postsList = document.getElementById("postsList");

let currentProfile = null;

/* HELPER: DEFAULT AVATAR COLOR */
function avatarColor(email) {
  if (!email) return "#ff6b6b";
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

/* AUTH MONITOR LOOP */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (postBox) postBox.classList.remove("hidden");
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) currentProfile = snap.data();
    } catch (e) {
      console.error(e);
    }
  } else {
    if (postBox) postBox.classList.add("hidden");
  }
  loadPosts();
});

/* POST ACTION EVENT */
if (uploadBtn) {
  uploadBtn.addEventListener("click", async () => {
    if (!textInput.value.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    const displayName = (currentProfile && currentProfile.displayName) || user.email;
    const avatarEmoji = (currentProfile && currentProfile.avatarEmoji) || null;

    try {
      await addDoc(collection(db, "posts"), {
        text: textInput.value.trim(),
        user: user.email,
        displayName,
        avatarEmoji,
        createdAt: serverTimestamp()
      });
      textInput.value = "";
      loadPosts();
    } catch (e) {
      console.error("Error creating post: ", e);
    }
  });
}

/* READ DATABASE AND RENDER TIMELINE FEED */
async function loadPosts() {
  if (!postsList) return;
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    postsList.innerHTML = "";

    snap.docs.forEach(docSnap => {
      const post = docSnap.data();
      const name = post.displayName || post.user;
      const avatarContent = post.avatarEmoji || name.charAt(0).toUpperCase();

      const tweet = document.createElement("div");
      tweet.className = "tweet";
      tweet.innerHTML = `
        <div class="tweetHeader">
          <div class="avatar" style="background:${avatarColor(post.user)}">${avatarContent}</div>
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
  } catch (e) {
    console.error("Error loading posts: ", e);
  }
}
