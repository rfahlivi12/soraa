import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ELEMENTS */
const titleInput = document.getElementById("songTitle");
const artistInput = document.getElementById("songArtist");
const noteInput = document.getElementById("songNote");
const linkInput = document.getElementById("songLink");
const addBtn = document.getElementById("addSongBtn");
const songListEl = document.getElementById("songList");
const playlistStatus = document.getElementById("playlistStatus");
const shuffleBtn = document.getElementById("shuffleBtn");

const playlistDocRef = doc(db, "shared", "playlist");
let songs = [];
let currentDisplayName = "Someone";

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/* EMBED DETECTION — returns an embeddable iframe src for YouTube/Spotify links, or null */
function getEmbedSrc(link) {
  if (!link) return null;
  let url;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");

  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
  if (host === "youtube.com" || host === "m.youtube.com") {
    const videoId = url.searchParams.get("v") || (url.pathname.includes("/shorts/") ? url.pathname.split("/shorts/")[1] : null);
    if (videoId) return { type: "youtube", src: `https://www.youtube.com/embed/${videoId.split("/")[0]}?autoplay=1` };
  }
  if (host === "youtu.be") {
    const videoId = url.pathname.slice(1);
    if (videoId) return { type: "youtube", src: `https://www.youtube.com/embed/${videoId}?autoplay=1` };
  }

  // Spotify: open.spotify.com/track|album|playlist|episode/ID
  if (host === "open.spotify.com") {
    const match = url.pathname.match(/^\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
    if (match) return { type: "spotify", src: `https://open.spotify.com/embed/${match[1]}/${match[2]}?autoplay=1` };
  }

  return null;
}

/* RENDER */
function renderSongs() {
  songListEl.innerHTML = "";

  songs.forEach((song, index) => {
    const card = document.createElement("div");
    card.className = "songCard";

    const del = document.createElement("button");
    del.type = "button";
    del.className = "songDelete";
    del.textContent = "×";
    del.addEventListener("click", () => deleteSong(index));
    card.appendChild(del);

    const title = document.createElement("div");
    title.className = "songTitle";
    title.textContent = song.title;
    card.appendChild(title);

    if (song.artist) {
      const artist = document.createElement("div");
      artist.className = "songArtist";
      artist.textContent = song.artist;
      card.appendChild(artist);
    }

    if (song.note) {
      const note = document.createElement("p");
      note.className = "songNote";
      note.textContent = `"${song.note}"`;
      card.appendChild(note);
    }

    const meta = document.createElement("div");
    meta.className = "songMeta";

    const addedBy = document.createElement("span");
    addedBy.className = "songAddedBy";
    addedBy.textContent = song.addedBy ? `added by ${song.addedBy}` : "";
    meta.appendChild(addedBy);

    const embed = song.link ? getEmbedSrc(song.link) : null;

    if (song.link) {
      if (embed) {
        const playToggle = document.createElement("button");
        playToggle.type = "button";
        playToggle.className = "songPlayToggle";
        playToggle.textContent = "▶ Play here";
        meta.appendChild(playToggle);

        const externalLink = document.createElement("a");
        externalLink.className = "songLink";
        externalLink.href = song.link;
        externalLink.target = "_blank";
        externalLink.rel = "noopener";
        externalLink.textContent = "Open ↗";
        meta.appendChild(externalLink);

        card.appendChild(meta);

        const embedWrap = document.createElement("div");
        embedWrap.className = `songEmbed songEmbed-${embed.type}`;
        card.appendChild(embedWrap);

        let expanded = false;
        playToggle.addEventListener("click", () => {
          expanded = !expanded;
          if (expanded) {
            const iframe = document.createElement("iframe");
            iframe.src = embed.src;
            iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
            iframe.loading = "lazy";
            iframe.frameBorder = "0";
            if (embed.type === "spotify") {
              iframe.allow += "; clipboard-write";
            } else {
              iframe.allowFullscreen = true;
            }
            embedWrap.innerHTML = "";
            embedWrap.appendChild(iframe);
            embedWrap.classList.add("open");
            playToggle.textContent = "✕ Close player";
          } else {
            embedWrap.classList.remove("open");
            embedWrap.innerHTML = "";
            playToggle.textContent = "Play here";
          }
        });
      } else {
        const link = document.createElement("a");
        link.className = "songLink";
        link.href = song.link;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Listen";
        meta.appendChild(link);
        card.appendChild(meta);
      }
    } else {
      card.appendChild(meta);
    }

    songListEl.appendChild(card);
  });
}

/* SAVE TO FIRESTORE — shared between both of you */
async function saveSongs() {
  try {
    await setDoc(playlistDocRef, { items: songs });
    playlistStatus.textContent = "";
  } catch (e) {
    playlistStatus.textContent = e.message;
  }
}

function deleteSong(index) {
  songs.splice(index, 1);
  renderSongs();
  saveSongs();
}

/* ADD SONG */
addBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  if (!title) return;

  const link = linkInput.value.trim();

  songs.push({
    title,
    artist: artistInput.value.trim(),
    note: noteInput.value.trim(),
    link: link && isValidUrl(link) ? link : "",
    addedBy: currentDisplayName
  });

  titleInput.value = "";
  artistInput.value = "";
  noteInput.value = "";
  linkInput.value = "";

  renderSongs();
  saveSongs();
});

/* SHUFFLE PLAY */
shuffleBtn.addEventListener("click", () => {
  if (!songs.length) {
    playlistStatus.textContent = "Add a song first!";
    return;
  }
  const pick = songs[Math.floor(Math.random() * songs.length)];
  if (pick.link) {
    window.open(pick.link, "_blank", "noopener");
  } else {
    alert(`🎵 ${pick.title}${pick.artist ? " — " + pick.artist : ""}`);
  }
});

/* AUTH + LOAD */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const profileSnap = await getDoc(doc(db, "users", user.uid));
    currentDisplayName = (profileSnap.exists() && profileSnap.data().displayName)
      ? profileSnap.data().displayName
      : user.email;
  } catch (e) {
    currentDisplayName = user.email;
  }

  try {
    const snap = await getDoc(playlistDocRef);
    songs = (snap.exists() && Array.isArray(snap.data().items)) ? snap.data().items : [];
  } catch (e) {
    songs = [];
    playlistStatus.textContent = e.message;
  }

  renderSongs();
});
