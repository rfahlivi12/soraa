import { auth, db } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  addDoc,
  deleteDoc,
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

const addPhotoBtn = document.getElementById("addPhotoBtn");
const imageInput = document.getElementById("imageInput");
const imagePreviewWrap = document.getElementById("imagePreviewWrap");
const imagePreview = document.getElementById("imagePreview");
const removeImageBtn = document.getElementById("removeImageBtn");

const postsList = document.getElementById("postsList");

let currentProfile = null;
let currentUser = null;
let selectedImageFile = null;

/* ICONS — use the project's existing masked-icon system.
   Requires icon/pin.svg and icon/delete.svg to exist in the repo,
   plus the matching .icon-pin / .icon-delete CSS rules. */
const ICON_PIN = `<span class="icon icon-pin" aria-hidden="true"></span>`;
const ICON_DELETE = `<span class="icon icon-delete" aria-hidden="true"></span>`;

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
  currentUser = user;

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

/* PHOTO PICKER */
addPhotoBtn.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    imageInput.value = "";
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    alert("That image is a bit large — please pick one under 8MB.");
    imageInput.value = "";
    return;
  }

  selectedImageFile = file;
  imagePreview.src = URL.createObjectURL(file);
  imagePreviewWrap.classList.remove("hidden");
  addPhotoBtn.classList.add("hasImage");
});

function clearImageSelection() {
  selectedImageFile = null;
  imageInput.value = "";
  imagePreview.src = "";
  imagePreviewWrap.classList.add("hidden");
  addPhotoBtn.classList.remove("hasImage");
}

removeImageBtn.addEventListener("click", clearImageSelection);

/* Compress + shrink the photo in-browser, then return it as a small
   base64 data URL — this avoids needing Firebase Storage (which now
   requires a paid Blaze plan) by storing the photo as text directly
   inside the Firestore message document instead. */
function compressImage(file, maxDim = 900, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* POST A NEW MESSAGE */
uploadBtn.addEventListener("click", async () => {
  if ((!textInput.value.trim() && !selectedImageFile) || !currentUser) return;

  const displayName = (currentProfile && currentProfile.displayName) || currentUser.email;
  const avatarEmoji = (currentProfile && currentProfile.avatarEmoji) || null;

  uploadBtn.disabled = true;
  addPhotoBtn.disabled = true;

  let imageUrl = null;

  try {
    if (selectedImageFile) {
      uploadBtn.textContent = "Processing photo...";
      imageUrl = await compressImage(selectedImageFile);

      /* Firestore documents are capped at 1MB total, so keep the
         encoded photo well under that to leave room for other fields. */
      if (imageUrl.length > 850000) {
        alert("That photo is too large even after compression. Try a smaller or simpler photo.");
        uploadBtn.textContent = "Post Message";
        uploadBtn.disabled = false;
        addPhotoBtn.disabled = false;
        return;
      }
    }

    uploadBtn.textContent = "Posting...";

    await addDoc(collection(db, "posts"), {
      text: textInput.value.trim(),
      user: currentUser.email,
      uid: currentUser.uid,
      displayName: displayName,
      avatarEmoji: avatarEmoji,
      likes: [],
      commentCount: 0,
      pinned: false,
      imageUrl: imageUrl,
      createdAt: serverTimestamp()
    });

    textInput.value = "";
    clearImageSelection();
    loadPosts();
  } catch (err) {
    console.error("Error creating post:", err);
    alert("Something went wrong posting that. Please try again.");
  } finally {
    uploadBtn.textContent = "Post Message";
    uploadBtn.disabled = false;
    addPhotoBtn.disabled = false;
  }
});

/* LOAD COMMENTS — sorted client-side, no Firestore index needed */
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

/* LIGHTBOX for tapping a photo — markup/positioning lives in
   guestbook-v3-additions.css (.imgLightbox), not inline here. */
function openLightbox(src) {
  const box = document.createElement("div");
  box.className = "imgLightbox";
  box.innerHTML = `<img src="${src}" alt="">`;
  box.addEventListener("click", () => box.remove());
  document.body.appendChild(box);
}

/* FEED LOADER */
async function loadPosts() {
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    /* Pinned messages float to the top; order is otherwise unchanged
       since Array.sort is stable, so newest-first ordering is preserved
       within both the pinned and unpinned groups. */
    const docs = snap.docs.slice().sort((a, b) => {
      return (b.data().pinned ? 1 : 0) - (a.data().pinned ? 1 : 0);
    });

    postsList.innerHTML = "";

    docs.forEach(docSnap => {
      const post = docSnap.data();
      const postId = docSnap.id;
      const likes = post.likes || [];
      const liked = currentUser && likes.includes(currentUser.email);
      const name = post.displayName || post.user || "Anonymous";
      const avatarContent = post.avatarEmoji || name.charAt(0).toUpperCase();
      const isOwner = currentUser && (post.uid === currentUser.uid || post.user === currentUser.email);
      const isPinned = !!post.pinned;

      const tweet = document.createElement("div");
      tweet.className = "tweet" + (isPinned ? " pinned" : "");

      tweet.innerHTML = `
        ${isPinned ? `<div class="pinnedLabel">${ICON_PIN}Pinned</div>` : ""}
        <div class="cardControls">
          <button type="button" class="cardIconBtn pinToggle ${isPinned ? "active" : ""}" aria-label="${isPinned ? "Unpin" : "Pin"} message">${ICON_PIN}</button>
          ${isOwner ? `<button type="button" class="cardIconBtn deleteToggle" aria-label="Delete message">${ICON_DELETE}</button>` : ""}
        </div>
        <div class="tweetHeader">
          <div class="avatar" style="background:${avatarColor(post.user || "anon")}">${avatarContent}</div>
          <div class="tweetMeta">
            <span class="tweetUser"></span>
            <span class="tweetTime">${timeAgo(post.createdAt ? post.createdAt.toDate() : null)}</span>
          </div>
        </div>
        <p class="tweetText"></p>
        ${post.imageUrl ? `<img class="postImage" src="${post.imageUrl}" alt="Attached photo" loading="lazy">` : ""}
        <div class="tweetActions">
          <button type="button" class="likeBtn ${liked ? "liked" : ""}" aria-label="Like">
            <span class="icon icon-like" aria-hidden="true"></span>
            <span class="likeCount">${likes.length || ""}</span>
          </button>
          <button type="button" class="commentBtn" aria-label="Comments">
            <span class="icon icon-comment" aria-hidden="true"></span>
            <span class="commentCount">${post.commentCount || ""}</span>
          </button>
          <button type="button" class="shareBtn" aria-label="Share">
            <span class="icon icon-share" aria-hidden="true"></span>
          </button>
        </div>
        <div class="commentsSection">
          <div class="commentsList"></div>
          <div class="commentCompose">
            <input type="text" class="commentInput" placeholder="Write a comment...">
            <button type="button" class="commentSubmit">Reply</button>
          </div>
        </div>
      `;

      const tweetUserEl = tweet.querySelector(".tweetUser");
      tweetUserEl.textContent = name;
      tweetUserEl.title = name;
      tweet.querySelector(".tweetText").textContent = post.text;

      const commentsList = tweet.querySelector(".commentsList");
      const commentCountEl = tweet.querySelector(".commentCount");
      const commentInput = tweet.querySelector(".commentInput");
      const commentSubmit = tweet.querySelector(".commentSubmit");
      const commentsSection = tweet.querySelector(".commentsSection");

      /* PIN / UNPIN — any signed-in guest can highlight a favorite */
      tweet.querySelector(".pinToggle").addEventListener("click", async () => {
        if (!currentUser) return;
        try {
          await updateDoc(doc(db, "posts", postId), { pinned: !isPinned });
          loadPosts();
        } catch (e) {
          console.error("Error toggling pin:", e);
        }
      });

      /* DELETE — owner only */
      const deleteBtn = tweet.querySelector(".deleteToggle");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (!confirm("Delete this message? This can't be undone.")) return;
          try {
            await deleteDoc(doc(db, "posts", postId));
            loadPosts();
          } catch (e) {
            console.error("Error deleting post:", e);
            alert("Couldn't delete that message. Please try again.");
          }
        });
      }

      /* TAP PHOTO TO EXPAND */
      const img = tweet.querySelector(".postImage");
      if (img) {
        img.addEventListener("click", () => openLightbox(post.imageUrl));
      }

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

      /* COMMENT BUTTON — toggle open/closed, load on first open */
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
        e.stopPropagation();

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

      /* ENTER KEY on comment input */
      commentInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commentSubmit.click();
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
