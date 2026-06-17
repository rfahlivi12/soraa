const title =
  "Hi Sora ❤️";

const titleElement =
  document.getElementById("title");

let index = 0;

/* TYPING */

function typeText() {

  if (index < title.length) {

    titleElement.innerHTML +=
      title.charAt(index);

    index++;

    setTimeout(typeText, 100);
  }
}

typeText();

/* SECTION */

const menuButtons =
  document.querySelectorAll(".menu-btn");

const sections =
  document.querySelectorAll(".content");

menuButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const target =
        button.dataset.section;

      sections.forEach(section => {

        section.classList.add("hidden");
      });

      document
        .getElementById(target)
        .classList.remove("hidden");
    }
  );
});

/* POPUP */

const popup =
  document.getElementById("popup");

const scanBtn =
  document.getElementById("scanBtn");

const closeBtn =
  document.getElementById("closeBtn");

scanBtn.addEventListener(
  "click",
  () => {

    popup.classList.remove("hidden");
  }
);

closeBtn.addEventListener(
  "click",
  () => {

    popup.classList.add("hidden");
  }
);

popup.addEventListener(
  "click",
  (event) => {

    if (event.target === popup) {

      popup.classList.add("hidden");
    }
  }
);