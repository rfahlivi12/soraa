const text = "Hi Sora ❤️";

let index = 0;

function typeEffect() {

  if (index < text.length) {

    document.getElementById("typing")
      .innerHTML += text.charAt(index);

    index++;

    setTimeout(typeEffect, 100);
  }
}

typeEffect();

/* SHOW MESSAGE */

function showLove() {

  document.getElementById("loveMessage")
    .classList.remove("hidden");

  for (let i = 0; i < 50; i++) {
    createHeart();
  }
}

/* HEART ANIMATION */

function createHeart() {

  const heart =
    document.createElement("div");

  heart.classList.add("heart");

  heart.innerHTML = "💖";

  heart.style.left =
    Math.random() * 100 + "vw";

  heart.style.fontSize =
    Math.random() * 25 + 20 + "px";

  heart.style.animationDuration =
    Math.random() * 3 + 3 + "s";

  document.body.appendChild(heart);

  setTimeout(() => {
    heart.remove();
  }, 6000);
}