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

const guestbookBtn = document.getElementById("guestbookBtn");
const guestbookPopup = document.getElementById("guestbookPopup");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authStatus = document.getElementById("authStatus");
const authBox = document.getElementById("authBox");

const postBox = document.getElementById("postBox");
const textInput = document.getElementById("textInput");
const uploadBtn = document.getElementById("uploadBtn");
const composeAvatar = document.getElementById("composeAvatar");

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

/* AUTH STATE */

onAuthStateChanged(auth, (user) => {
  if (user) {
    authBox.classList.add("hidden");
    postBox.classList.remove("hidden");
    composeAvatar.textContent = user.email.charAt(0).toUpperCase();
    composeAvatar.style.background = avatarColor(user.email);
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

/* POST A MESSAGE */

uploadBtn.addEventListener("click", async () => {
  if (!textInput.value.trim()) return;

  await addDoc(collection(db, "posts"), {
    text: textInput.value.trim(),
    user: auth.currentUser.email,
    likes: [],
    commentCount: 0,
    createdAt: serverTimestamp()
  });

  textInput.value = "";
  loadPosts();
});

/* LOAD + RENDER FEED */

async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  postsList.innerHTML = "";

  snap.docs.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;
    const likes = post.likes || [];
    const liked = auth.currentUser && likes.includes(auth.currentUser.email);

    const tweet = document.createElement("div");
    tweet.className = "tweet";
    tweet.innerHTML = `
      <div class="tweetHeader">
        <div class="avatar" style="background:${avatarColor(post.user)}">${post.user.charAt(0).toUpperCase()}</div>
        <div class="tweetMeta">
          <span class="tweetUser">${post.user}</span>
          <span class="tweetTime">${timeAgo(post.createdAt ? post.createdAt.toDate() : null)}</span>
        </div>
      </div>
      <p class="tweetText"></p>
      <div class="tweetActions">
        <button class="likeBtn ${liked ? "liked" : ""}">${liked ? "♥" : "♡"} <span class="likeCount">${likes.length}</span></button>
        <button class="commentBtn">💬 <span class="commentCount">${post.commentCount || 0}</span></button>
        <button class="shareBtn">⤴ Share</button>
      </div>
      <div class="commentsSection hidden">
        <div class="commentsList"></div>
        <div class="commentCompose">
          <input type="text" class="commentInput" placeholder="Reply...">
          <button class="commentSubmit">Reply</button>
        </div>
      </div>
    `;

    // set text safely (avoids breaking HTML if message contains < >)
    tweet.querySelector(".tweetText").textContent = post.text;

    /* LIKE */
    const likeBtn = tweet.querySelector(".likeBtn");
    likeBtn.addEventListener("click", async () => {
      if (!auth.currentUser) return;
      const postRef = doc(db, "posts", postId);
      if (liked) {
        await updateDoc(postRef, { likes: arrayRemove(auth.currentUser.email) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(auth.currentUser.email) });
      }
      loadPosts();
    });

    /* COMMENTS */
    const commentBtn = tweet.querySelector(".commentBtn");
    const commentsSection = tweet.querySelector(".commentsSection");
    const commentsList = tweet.querySelector(".commentsList");
    const commentCountEl = tweet.querySelector(".commentCount");
    let commentsLoaded = false;

    async function loadComments() {
      const cq = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
      const csnap = await getDocs(cq);
      commentsList.innerHTML = "";
      csnap.docs.forEach(c => {
        const data = c.data();
        const p = document.createElement("p");
        p.className = "commentItem";
        const b = document.createElement("b");
        b.textContent = data.user + ": ";
        p.appendChild(b);
        p.append(data.text);
        commentsList.appendChild(p);
      });
      commentsLoaded = true;
    }

    commentBtn.addEventListener("click", () => {
      commentsSection.classList.toggle("hidden");
      if (!commentsLoaded) loadComments();
    });

    const commentInput = tweet.querySelector(".commentInput");
    const commentSubmit = tweet.querySelector(".commentSubmit");

    commentSubmit.addEventListener("click", async () => {
      if (!auth.currentUser || !commentInput.value.trim()) return;
      await addDoc(collection(db, "posts", postId, "comments"), {
        text: commentInput.value.trim(),
        user: auth.currentUser.email,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });
      commentInput.value = "";
      commentCountEl.textContent = (parseInt(commentCountEl.textContent) || 0) + 1;
      loadComments();
    });

    /* SHARE */
    const shareBtn = tweet.querySelector(".shareBtn");
    shareBtn.addEventListener("click", async () => {
      const shareData = {
        title: "Guestbook message",
        text: post.text,
        url: location.href
      };
      if (navigator.share) {
        try { await navigator.share(shareData); } catch (e) { /* user cancelled */ }
      } else {
        await navigator.clipboard.writeText(`${post.text} — ${location.href}`);
        alert("Copied to clipboard!");
      }
    });

    postsList.appendChild(tweet);
  });
}

loadPosts();
