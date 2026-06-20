import { auth } from "./firebase-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

/* THEME CYCLE
   Click order: Rose Gold (default) → Lavender → Ocean → Gold → Mint → back to Rose
   Stored in localStorage so it persists across pages and visits. */
const THEMES = ["rose", "lavender", "ocean", "gold", "mint"];
const THEME_KEY = "soraTheme";

function applyStoredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved && saved !== "rose") {
    document.documentElement.setAttribute("data-theme", saved);
  }
}

function cycleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "rose";
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];

  if (next === "rose") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", next);
  }
  localStorage.setItem(THEME_KEY, next);
}

// Apply saved theme immediately (module scripts run before first paint
// finishes, and content on every page stays hidden until auth resolves
// anyway, so there's no flash of the wrong theme).
applyStoredTheme();

/* SIGN OUT */
async function handleSignOut() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (e) {
    console.error(e);
  }
}

/* WIRE UP BUTTONS — present on every gated page */
document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) themeBtn.addEventListener("click", cycleTheme);

  const signoutBtn = document.getElementById("signoutBtn");
  if (signoutBtn) signoutBtn.addEventListener("click", handleSignOut);
});
