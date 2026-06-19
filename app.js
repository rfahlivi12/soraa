import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
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
const postBox = document.getElementById("postBox");
const textInput = document.getElementById("textInput");
const uploadBtn = document.getElementById("uploadBtn");
const composeAvatar = document.getElementById("composeAvatar");
const postsList = document.getElementById("postsList");

let currentProfile = null;

/* AUTH STATE ROUTING GUARD */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    postBox.classList.remove("hidden");

    currentProfile = null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) currentProfile = snap.data();
    } catch (e) {
      console.error(e);
    }

    const name = (currentProfile && currentProfile.displayName) || user.email;
    composeAvatar.textContent = (currentProfile && currentProfile.avatarEmoji) || name.charAt(0).toUpperCase();
    composeAvatar.style.background = avatarColor(user.email);
    
    loadPosts();
  } else {
    // If user tries to load guestbook directly without login, force-redirect back to home gate
    window.location.href = "index.html";
  }
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

  const user = auth.currentUser;
  const displayName = (currentProfile && currentProfile.displayName) || user.email;
  const avatarEmoji = (currentProfile && currentProfile.avatarEmoji) || null;

  await addDoc(collection(db, "posts"), {
    text: textInput.value.trim(),
    user: user.email,
    displayName,
    avatarEmoji,
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

    tweet.querySelector(".tweetUser").textContent = name;
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
        const commentName = data.displayName || data.user;
        const p = document.createElement("p");
        p.className = "commentItem";
        const b = document.createElement("b");
        b.textContent = commentName + ": ";
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

      const user = auth.currentUser;
      const commentDisplayName = (currentProfile && currentProfile.displayName) || user.email;

      await addDoc(collection(db, "posts", postId, "comments"), {
        text: commentInput.value.trim(),
        user: user.email,
        displayName: commentDisplayName,
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
