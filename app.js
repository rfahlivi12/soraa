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
  arrayUnion,
  arrayRemove,
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
let currentUser = null; // Track user in a reliable variable, not auth.currentUser

/* SIGN UP */
document.getElementById("signupBtn").addEventListener("click", async () => {
  authStatus.textContent = "Loading...";
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    authStatus.textContent = "";
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

/* LOG IN */
document.getElementById("loginBtn").addEventListener("click", async () => {
  authStatus.textContent = "Loading...";
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    authStatus.textContent = "";
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

/* AUTH STATE MONITOR */
onAuthStateChanged(auth, async (user) => {
  currentUser = user; // Always keep this in sync

  if (user) {
    authBox.classList.add("hidden");
    postBox.classList.remove("hidden");

    currentProfile = null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) currentProfile = snap.data();
    } catch (e) {
      console.error("Profile load error:", e);
    }

    const name = (currentProfile && currentProfile.displayName) || user.email || "Guest";
    composeAvatar.textContent = (currentProfile && currentProfile.avatarEmoji) || name.charAt(0).toUpperCase();
    composeAvatar.style.background = avatarColor(user.email || "guest");
  } else {
    authBox.classList.remove("hidden");
    postBox.classList.add("hidden");
  }
  loadPosts();
});

/* HELPERS */
function avatarColor(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 42%)`;
}

function timeAgo(date) {
  if (!date) return "now";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

/* POST A NEW MESSAGE */
uploadBtn.addEventListener("click", async () => {
  if (!textInput.value.trim() || !currentUser) return;

  const displayName = (currentProfile && currentProfile.displayName) || currentUser.email;
  const avatarEmoji = (currentProfile && currentProfile.avatarEmoji) || null;

  uploadBtn.textContent = "Posting...";
  uploadBtn.disabled = true;

  try {
    await addDoc(collection(db, "posts"), {
      text: textInput.value.trim(),
      user: currentUser.email,
      displayName: displayName,
      avatarEmoji: avatarEmoji,
      likes: [],
      commentCount: 0,
      createdAt: serverTimestamp()
    });
    textInput.value = "";
    loadPosts();
  } catch (err) {
    console.error("Error creating post:", err);
  } finally {
    uploadBtn.textContent = "Post Message";
    uploadBtn.disabled = false;
  }
});

/* LOAD COMMENTS — no orderBy so no Firestore index needed, sorted client-side */
async function loadComments(postId, commentsList) {
  try {
    const csnap = await getDocs(collection(db, "posts", postId, "comments"));
    const docs = csnap.docs.slice().sort((a, b) => {
      const aTime = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
      const bTime = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
      return aTime - bTime;
    });
    commentsList.innerHTML = "";
    docs.forEach(c => {
      const data = c.data();
      const commentName = data.displayName || data.user || "Anonymous";
      const p = document.createElement("p");
      p.className = "commentItem";
      const b = document.createElement("b");
      b.textContent = commentName + ": ";
      p.appendChild(b);
      p.append(data.text);
      commentsList.appendChild(p);
    });
  } catch (e) {
    console.error("Error loading comments:", e);
  }
}

/* FEED LOADER */
async function loadPosts() {
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    postsList.innerHTML = "";

    snap.docs.forEach(docSnap => {
      const post = docSnap.data();
      const postId = docSnap.id;
      const likes = post.likes || [];
      const liked = currentUser && post.likes && post.likes.includes(currentUser.email);
      const name = post.displayName || post.user || "Anonymous";
      const avatarContent = post.avatarEmoji || name.charAt(0).toUpperCase();

      const tweet = document.createElement("div");
      tweet.className = "tweet";
      tweet.innerHTML = `
        <div class="tweetHeader">
          <div class="avatar" style="background:${avatarColor(post.user || "anon")}">${avatarContent}</div>
          <div class="tweetMeta">
            <span class="tweetUser"></span>
            <span class="tweetTime">${timeAgo(post.createdAt ? post.createdAt.toDate() : null)}</span>
          </div>
        </div>
        <p class="tweetText"></p>
        <div class="tweetActions">
          <button type="button" class="likeBtn ${liked ? "liked" : ""}">${liked ? "♥" : "♡"} <span class="likeCount">${likes.length}</span></button>
          <button type="button" class="commentBtn">💬 <span class="commentCount">${post.commentCount || 0}</span></button>
          <button type="button" class="shareBtn">⤴ Share</button>
        </div>
        <div class="commentsSection">
          <div class="commentsList"></div>
          <div class="commentCompose">
            <input type="text" class="commentInput" placeholder="Reply...">
            <button type="button" class="commentSubmit">Reply</button>
          </div>
        </div>
      `;

      tweet.querySelector(".tweetUser").textContent = name;
      tweet.querySelector(".tweetText").textContent = post.text;

      const commentsList = tweet.querySelector(".commentsList");
      const commentCountEl = tweet.querySelector(".commentCount");
      const commentInput = tweet.querySelector(".commentInput");
      const commentSubmit = tweet.querySelector(".commentSubmit");
      const commentsSection = tweet.querySelector(".commentsSection");

      /* LIKE ACTION */
      tweet.querySelector(".likeBtn").addEventListener("click", async () => {
        if (!currentUser) return;
        const postRef = doc(db, "posts", postId);
        if (liked) {
          await updateDoc(postRef, { likes: arrayRemove(currentUser.email) });
        } else {
          await updateDoc(postRef, { likes: arrayUnion(currentUser.email) });
        }
        loadPosts();
      });

      /* COMMENT BUTTON — toggle section open/closed, load comments on first open */
      let commentsLoaded = false;
      tweet.querySelector(".commentBtn").addEventListener("click", () => {
        const isOpen = commentsSection.classList.toggle("open");
        if (isOpen) {
          if (!commentsLoaded) {
            loadComments(postId, commentsList);
            commentsLoaded = true;
          }
          commentInput.focus();
        }
      });

      /* REPLY SUBMIT */
      commentSubmit.addEventListener("click", async (e) => {
        e.stopPropagation(); // Prevent event bubbling up

        if (!currentUser) {
          alert("You must be logged in to reply.");
          return;
        }
        if (!commentInput.value.trim()) return;

        const commentDisplayName = (currentProfile && currentProfile.displayName) || currentUser.email;
        const commentText = commentInput.value.trim();

        commentSubmit.textContent = "...";
        commentSubmit.disabled = true;
        commentInput.disabled = true;

        try {
          await addDoc(collection(db, "posts", postId, "comments"), {
            text: commentText,
            user: currentUser.email,
            displayName: commentDisplayName,
            createdAt: serverTimestamp()
          });
          await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });
          commentInput.value = "";
          commentCountEl.textContent = (parseInt(commentCountEl.textContent) || 0) + 1;
          await loadComments(postId, commentsList);
        } catch (e) {
          console.error("Error posting reply:", e);
          alert("Failed to post reply. Check console for details.");
        } finally {
          commentSubmit.textContent = "Reply";
          commentSubmit.disabled = false;
          commentInput.disabled = false;
        }
      });

      /* SHARE ACTION */
      tweet.querySelector(".shareBtn").addEventListener("click", async () => {
        const shareData = {
          title: "Guestbook message",
          text: post.text,
          url: location.href
        };
        if (navigator.share) {
          try { await navigator.share(shareData); } catch (e) { /* ignored */ }
        } else {
          await navigator.clipboard.writeText(`${post.text} — ${location.href}`);
          alert("Copied to clipboard!");
        }
      });

      postsList.appendChild(tweet);
    });
  } catch (err) {
    console.error("Error loading timeline:", err);
  }
}
