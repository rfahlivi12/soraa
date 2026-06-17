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

function showLove() {

  document.getElementById("loveMessage")
    .classList.remove("hidden");

  for (let i = 0; i < 35; i++) {
    createHeart();
  }
}

function createHeart() {

  const heart = document.createElement("div");

  heart.innerHTML = "💖";

  heart.style.position = "absolute";

  heart.style.left =
    Math.random() * 100 + "vw";

  heart.style.top = "100vh";

  heart.style.fontSize =
    Math.random() * 20 + 20 + "px";

  document.body.appendChild(heart);

  let position = 100;

  const interval = setInterval(() => {

    position--;

    heart.style.top = position + "vh";

    if (position < -10) {

      clearInterval(interval);

      heart.remove();
    }

  }, 20);
}