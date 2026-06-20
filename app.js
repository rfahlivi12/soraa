import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ELEMENTS */
const authBox = document.getElementById("authBox");
const postBox = document.getElementById("postBox");
const composeAvatar = document.getElementById("composeAvatar");
const textInput = document.getElementById("textInput");
const uploadBtn = document.getElementById("uploadBtn");
const postsList = document.getElementById("postsList");

const guestbookDocRef = doc(db, "shared", "guestbook");
let posts = [];
let currentUser = null;
let currentDisplayName = "Someone";
let currentAvatar = "?";

/* TIME FORMAT */
function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* RENDER */
function renderPosts() {
  postsList.innerHTML = "";

  posts
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((post) => {
      const tweet = document.createElement("div");
      tweet.className = "tweet";

      const header = document.createElement("div");
      header.className = "tweetHeader";

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = post.authorAvatar || (post.authorName ? post.authorName.charAt(0).toUpperCase() : "?");

      const meta = document.createElement("div");
      meta.className = "tweetMeta";

      const user = document.createElement("span");
      user.className = "tweetUser";
      user.textContent = post.authorName || "Someone";

      const time = document.createElement("span");
      time.className = "tweetTime";
      time.textContent = timeAgo(post.createdAt);

      meta.appendChild(user);
      meta.appendChild(time);
      header.appendChild(avatar);
      header.appendChild(meta);
      tweet.appendChild(header);

      const text = document.createElement("p");
      text.className = "tweetText";
      text.textContent = post.text;
      tweet.appendChild(text);

      /* ACTIONS — icon-driven like / comment / share */
      const actions = document.createElement("div");
      actions.className = "tweetActions";

      const liked = !!(currentUser && post.likes && post.likes.includes(currentUser.uid));
      const likeBtn = document.createElement("button");
      likeBtn.type = "button";
      likeBtn.className = "likeBtn" + (liked ? " liked" : "");
      likeBtn.innerHTML = `<span class="icon icon-like" aria-hidden="true"></span><span>${(post.likes || []).length || ""}</span>`;
      likeBtn.setAttribute("aria-label", "Like");
      likeBtn.addEventListener("click", () => toggleLike(post.id));

      const commentBtn = document.createElement("button");
      commentBtn.type = "button";
      commentBtn.className = "commentBtn";
      commentBtn.innerHTML = `<span class="icon icon-comment" aria-hidden="true"></span><span>${(post.comments || []).length || ""}</span>`;
      commentBtn.setAttribute("aria-label", "Comments");

      const shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.className = "shareBtn";
      shareBtn.innerHTML = `<span class="icon icon-share" aria-hidden="true"></span>`;
      shareBtn.setAttribute("aria-label", "Share");
      shareBtn.addEventListener("click", () => sharePost(post));

      actions.appendChild(likeBtn);
      actions.appendChild(commentBtn);
      actions.appendChild(shareBtn);
      tweet.appendChild(actions);

      /* COMMENTS (collapsed by default, toggled by commentBtn) */
      const commentsSection = document.createElement("div");
      commentsSection.className = "commentsSection";

      (post.comments || []).forEach((c) => {
        const item = document.createElement("div");
        item.className = "commentItem";
        item.textContent = `${c.authorName}: ${c.text}`;
        commentsSection.appendChild(item);
      });

      const composeRow = document.createElement("div");
      composeRow.className = "commentCompose";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "commentInput";
      input.placeholder = "Write a comment...";

      const submit = document.createElement("button");
      submit.type = "button";
      submit.className = "commentSubmit";
      submit.textContent = "Reply";
      submit.disabled = true;

      input.addEventListener("input", () => {
        submit.disabled = !input.value.trim();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit.click();
      });
      submit.addEventListener("click", () => {
        const value = input.value.trim();
        if (!value) return;
        addComment(post.id, value);
        input.value = "";
        submit.disabled = true;
      });

      composeRow.appendChild(input);
      composeRow.appendChild(submit);
      commentsSection.appendChild(composeRow);
      tweet.appendChild(commentsSection);

      commentBtn.addEventListener("click", () => {
        commentsSection.classList.toggle("open");
      });

      postsList.appendChild(tweet);
    });
}

/* SAVE TO FIRESTORE — shared between both of you */
async function savePosts() {
  try {
    await setDoc(guestbookDocRef, { items: posts });
  } catch (e) {
    console.error(e);
  }
}

function toggleLike(postId) {
  if (!currentUser) return;
  const post = posts.find((p) => p.id === postId);
  if (!post) return;
  post.likes = post.likes || [];
  const idx = post.likes.indexOf(currentUser.uid);
  if (idx >= 0) post.likes.splice(idx, 1);
  else post.likes.push(currentUser.uid);
  renderPosts();
  savePosts();
}

function addComment(postId, value) {
  const post = posts.find((p) => p.id === postId);
  if (!post) return;
  post.comments = post.comments || [];
  post.comments.push({ text: value, authorName: currentDisplayName, createdAt: Date.now() });
  renderPosts();
  savePosts();
}

function sharePost(post) {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: "Guestbook message", text: post.text, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(`"${post.text}" — ${url}`);
  }
}

/* COMPOSE A NEW MESSAGE */
uploadBtn.addEventListener("click", () => {
  const value = textInput.value.trim();
  if (!value || !currentUser) return;

  posts.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: value,
    authorName: currentDisplayName,
    authorAvatar: currentAvatar,
    authorUid: currentUser.uid,
    createdAt: Date.now(),
    likes: [],
    comments: []
  });

  textInput.value = "";
  renderPosts();
  savePosts();
});

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) uploadBtn.click();
});

/* AUTH + LOAD
   guestbook.html already redirects logged-out visitors at the top
   of the page, so by the time this runs the user is confirmed —
   #authBox is just hidden as a safety fallback. */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  authBox.classList.add("hidden");
  postBox.classList.remove("hidden");

  try {
    const profileSnap = await getDoc(doc(db, "users", user.uid));
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      currentDisplayName = data.displayName || user.email;
      currentAvatar = data.avatarEmoji || currentDisplayName.charAt(0).toUpperCase();
    } else {
      currentDisplayName = user.email;
      currentAvatar = user.email.charAt(0).toUpperCase();
    }
  } catch (e) {
    currentDisplayName = user.email;
    currentAvatar = user.email.charAt(0).toUpperCase();
  }

  composeAvatar.textContent = currentAvatar;

  try {
    const snap = await getDoc(guestbookDocRef);
    posts = (snap.exists() && Array.isArray(snap.data().items)) ? snap.data().items : [];
  } catch (e) {
    posts = [];
  }

  renderPosts();
});
