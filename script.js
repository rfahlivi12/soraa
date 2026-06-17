const text = "Hi Sora ❤️";

let index = 0;

/* TYPING EFFECT */

function typeEffect() {

  if (index < text.length) {

    document
      .getElementById("typing")
      .innerHTML += text.charAt(index);

    index++;

    setTimeout(typeEffect, 100);
  }
}

typeEffect();

/* MENU */

function showSection(sectionId) {

  const sections =
    document.querySelectorAll(".section");

  sections.forEach(section => {

    section.classList.add("hidden");
  });

  document
    .getElementById(sectionId)
    .classList.remove("hidden");

  createHearts();
}

/* HEART EFFECT */

function createHearts() {

  for (let i = 0; i < 20; i++) {

    const heart =
      document.createElement("div");

    heart.innerHTML = "❤️";

    heart.style.position = "absolute";

    heart.style.left =
      Math.random() * 100 + "vw";

    heart.style.top = "100vh";

    heart.style.fontSize =
      Math.random() * 20 + 15 + "px";

    heart.style.opacity = "0.8";

    heart.style.pointerEvents = "none";

    document.body.appendChild(heart);

    let position = 100;

    const interval = setInterval(() => {

      position--;

      heart.style.top =
        position + "vh";

      if (position < -10) {

        clearInterval(interval);

        heart.remove();
      }

    }, 20);
  }
}