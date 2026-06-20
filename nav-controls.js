/* ============================================================
   nav-controls.js
   Theme cycling + sign-out, wired to every gated page.

   FIX: Firebase is now loaded via dynamic import inside
   handleSignOut(). This means if firebase-init.js ever has
   an error, the theme toggle still works — the old static
   import at the top would kill the ENTIRE module silently.
   ============================================================ */

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

// Apply saved theme immediately on every page load.
applyStoredTheme();

/* SIGN OUT — firebase loaded dynamically so a firebase error
   never prevents the theme button from working */
async function handleSignOut() {
  try {
    const { auth } = await import("./firebase-init.js");
    const { signOut } = await import(
      "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js"
    );
    await signOut(auth);
    window.location.href = "index.html";
  } catch (e) {
    console.error("Sign out failed:", e);
  }
}

/* WIRE UP BUTTONS — present on every gated page */
document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) themeBtn.addEventListener("click", cycleTheme);

  const signoutBtn = document.getElementById("signoutBtn");
  if (signoutBtn) signoutBtn.addEventListener("click", handleSignOut);
});
