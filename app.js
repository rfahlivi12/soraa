import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  increment
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ELEMENTS */
const postBox = document.getElementById("postBox");
const textInput = document.getElementById("textInput");
const uploadBtn = document.getElementById("uploadBtn");
const postsList = document.getElementById("postsList");
const composeAvatar = document.getElementById("composeAvatar");
const closeBtn = document.querySelector(".closeBtn") || document.getElementById("closeBtn");

let currentProfile = null;

// Handle close "X" click action if it exists in your template
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

/* HELPER: UNIQUE PERSISTENT AVATAR COLOR */
function avatarColor(email) {
  if (!email) return "#8a2be2"; // Default purple matching image_7.png
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#8a2be2", "#b197fc", "#ff6b6b", "#4dadf7", "#51cf66", "#fcc419", "#f06595"];
  return colors[Math.abs(hash) % colors.length];
}

/* TIME AGO TIMESTAMP CALCULATOR */
function timeAgo(date) {
  if (!date) return "now";
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "now";
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m";
  return "now";
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

    // Set composition user avatar profile fallback state
    if (composeAvatar) {
      const name = (currentProfile && currentProfile.displayName) || user.email;
      composeAvatar.textContent = (currentProfile && currentProfile.avatarEmoji) || name.charAt(0).toUpperCase();
      composeAvatar.style.background = avatarColor(user.email);
    }
  } else {
    if (postBox) postBox.classList.add("hidden");
  }
});

/* LIVE REALTIME LISTENER FOR GUESTBOOK TIMELINE RE-RENDERING */
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(postsQuery, async (snapshot) => {
  if (!postsList) return;
  postsList.innerHTML = "";

  // Loop through all posts maps asynchronously to fetch nested comments cleanly
  for (const docSnap of snapshot.docs) {
    const post = docSnap.data();
    const postId = docSnap.id;
    const name = post.displayName || post.user;
    const avatarContent = post.avatarEmoji || name.charAt(0).toUpperCase();
    const likesCount = post.likes ? post.likes.length : 0;
    const userHasLiked = auth.currentUser && post.likes && post.likes.includes(auth.currentUser.uid);

    // Create Base Card Element
    const tweet = document.createElement("div");
    tweet.className = "tweet";
    
    // Fetch the live sub-collection comments for this specific post doc
    const commentsQuery = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    const commentsSnap = await getDocs(commentsQuery);
    const commentCount = commentsSnap.size;

    // Build timeline post layout block matching image_7.png style constraints
    let htmlStructure = `
      <div class="tweetHeader">
        <div class="avatar" style="background:${avatarColor(post.user)}">${avatarContent}</div>
        <div class="tweetMeta">
          <span class="tweetUser">${name}</span>
          <span class="tweetTime">${timeAgo(post.createdAt ? post.createdAt.toDate() : null)}</span>
        </div>
      </div>
      <p class="tweetText">${post.text}</p>
      
      <!-- INTERACTION ACTIONS ROW -->
      <div class="tweetActions" style="display: flex; gap: 20px; margin-top: 10px; font-size: 0.9rem; opacity: 0.8;">
        <span class="likeBtn" style="cursor: pointer; color: ${userHasLiked ? '#ff6584' : 'inherit'}">
          💖 <span class="likeCount">${likesCount}</span>
        </span>
        <span style="cursor: pointer;">
          💬 <span>${commentCount}</span>
        </span>
        <span class="shareBtn" style="cursor: pointer;">
          ↗️ Share
        </span>
      </div>

      <!-- NESTED SUB-COMMENTS THREAD WRAPPER -->
      <div class="commentsContainer" style="border-left: 2px solid #333; padding-left: 12px; margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
    `;

    // Append any individual child comments already created inside database
    commentsSnap.forEach(cSnap => {
      const comment = cSnap.data();
      const cName = comment.displayName || comment.user;
      htmlStructure += `
        <div class="commentItem" style="font-size: 0.9rem; line-height: 1.4;">
          <span style="font-weight: bold; text-decoration: underline;">${cName}</span>: ${comment.text}
        </div>
      `;
    });

    // Append interactive Inline Reply input form line block directly inside the layout string
    htmlStructure += `
        <!-- INLINE ACTION REPLY FORM -->
        <div class="replyForm" style="display: flex; gap: 8px; margin-top: 6px;">
          <input type="text" class="replyInput" placeholder="Reply..." style="flex: 1; padding: 6px 12px; border-radius: 20px; border: 1px solid #333; background: #1a1a1a; color: white; font-size: 0.85rem;">
          <button class="replySubmitBtn" style="padding: 4px 14px; border-radius: 20px; background: #333; color: white; border: none; font-size: 0.85rem; cursor: pointer;">Reply</button>
        </div>
      </div>
    `;

    tweet.innerHTML = htmlStructure;

    /* EVENT ATTACHMENT 1: TOGGLE POST LIKES */
    const likeBtn = tweet.querySelector(".likeBtn");
    likeBtn.addEventListener("click", async () => {
      if (!auth.currentUser) return;
      const postRef = doc(db, "posts", postId);
      if (userHasLiked) {
        await updateDoc(postRef, { likes: arrayRemove(auth.currentUser.uid) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(auth.currentUser.uid) });
      }
    });

    /* EVENT ATTACHMENT 2: SUBMIT NESTED CHILD COMMENT RESPONSE */
    const replyInput = tweet.querySelector(".replyInput");
    const replySubmitBtn = tweet.querySelector(".replySubmitBtn");
    replySubmitBtn.addEventListener("click", async () => {
      const commentText = replyInput.value.trim();
      if (!commentText || !auth.currentUser) return;

      const user = auth.currentUser;
      const cName = (currentProfile && currentProfile.displayName) || user.email;
      const cEmoji = (currentProfile && currentProfile.avatarEmoji) || null;

      replyInput.value = "";
      
      // Save data record deep inside post subcollection
      await addDoc(collection(db, "posts", postId, "comments"), {
        text: commentText,
        user: user.email,
        displayName: cName,
        avatarEmoji: cEmoji,
        createdAt: serverTimestamp()
      });

      // Increment tracker field on root document mapping safely
      await updateDoc(doc(db, "posts", postId), {
        commentCount: increment(1)
      });
    });

    /* EVENT ATTACHMENT 3: SHARE BUTTON POPUP */
    tweet.querySelector(".shareBtn").addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    });

    postsList.appendChild(tweet);
  }
});

/* ROOT LEVEL EVENT: COMPOSING NEW TOP-LEVEL MAIN GUESTBOOK POSTS */
if (uploadBtn) {
  uploadBtn.addEventListener("click", async () => {
    if (!textInput.value.trim() || !auth.currentUser) return;

    const user = auth.currentUser;
    const displayName = (currentProfile && currentProfile.displayName) || user.email;
    const avatarEmoji = (currentProfile && currentProfile.avatarEmoji) || null;

    try {
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
    } catch (e) {
      console.error("Error creating post: ", e);
    }
  });
}
