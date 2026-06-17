const title = "Hi Sora ❤️";

let index = 0;

const typing =
  document.getElementById("typing");

/* TYPING */

function typeText() {

  if (index < title.length) {

    typing.innerHTML +=
      title.charAt(index);

    index++;

    setTimeout(typeText, 100);
  }
}

typeText();

/* SECTION */

const buttons =
  document.querySelectorAll(
    "[data-target]"
  );

const sections =
  document.querySelectorAll(
    ".content"
  );

buttons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const target =
        button.dataset.target;

      sections.forEach(section => {

        section.classList.add(
          "hidden"
        );
      });

      document
        .getElementById(target)
        .classList.remove(
          "hidden"
        );
    }
  );
});

/* POPUP */

const popup =
  document.getElementById(
    "popup"
  );

const messageBtn =
  document.getElementById(
    "messageBtn"
  );

const closePopup =
  document.getElementById(
    "closePopup"
  );

messageBtn.addEventListener(
  "click",
  () => {

    popup.classList.remove(
      "hidden"
    );
  }
);

closePopup.addEventListener(
  "click",
  () => {

    popup.classList.add(
      "hidden"
    );
  }
);

/* CLOSE OUTSIDE */

popup.addEventListener(
  "click",
  (e) => {

    if (e.target === popup) {

      popup.classList.add(
        "hidden"
      );
    }
  }
);