/* TITLE */

const title =
  "Hi Sora ❤️";

const titleElement =
  document.getElementById(
    "title"
  );

let titleIndex = 0;

function typeTitle() {

  if (titleIndex < title.length) {

    titleElement.innerHTML +=
      title.charAt(titleIndex);

    titleIndex++;

    setTimeout(typeTitle, 100);
  }
}

typeTitle();

/* PASSWORD */

const unlockBtn =
  document.getElementById(
    "unlockBtn"
  );

const passwordInput =
  document.getElementById(
    "passwordInput"
  );

const lockScreen =
  document.getElementById(
    "lockScreen"
  );

const errorText =
  document.getElementById(
    "errorText"
  );

unlockBtn.addEventListener(
  "click",
  () => {

    if (
      passwordInput.value ===
      "1102"
    ) {

      lockScreen.style.display =
        "none";

    } else {

      errorText.innerHTML =
        "Wrong password";
    }
  }
);

/* DISTANCE */

const distanceBtn =
  document.getElementById(
    "distanceBtn"
  );

const distanceSection =
  document.getElementById(
    "distanceSection"
  );

distanceBtn.addEventListener(
  "click",
  () => {

    distanceSection.classList.toggle(
      "hidden"
    );
  }
);

/* QR POPUP */

const scanBtn =
  document.getElementById(
    "scanBtn"
  );

const qrPopup =
  document.getElementById(
    "qrPopup"
  );

scanBtn.addEventListener(
  "click",
  () => {

    qrPopup.classList.remove(
      "hidden"
    );
  }
);

/* FUTURE */

const futureBtn =
  document.getElementById(
    "futureBtn"
  );

const futurePopup =
  document.getElementById(
    "futurePopup"
  );

const successPopup =
  document.getElementById(
    "successPopup"
  );

const yesBtn =
  document.getElementById(
    "yesBtn"
  );

const noBtn =
  document.getElementById(
    "noBtn"
  );

futureBtn.addEventListener(
  "click",
  () => {

    futurePopup.classList.remove(
      "hidden"
    );
  }
);

yesBtn.addEventListener(
  "click",
  () => {

    futurePopup.classList.add(
      "hidden"
    );

    successPopup.classList.remove(
      "hidden"
    );
  }
);

noBtn.addEventListener(
  "mouseover",
  () => {

    const x =
      Math.random() * 200 - 100;

    const y =
      Math.random() * 200 - 100;

    noBtn.style.transform =
      `translate(${x}px, ${y}px)`;
  }
);

/* CLOSE */

const closeButtons =
  document.querySelectorAll(
    ".closeBtn"
  );

closeButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const target =
        button.dataset.close;

      document
        .getElementById(target)
        .classList.add(
          "hidden"
        );
    }
  );
});

/* OUTSIDE CLICK */

window.addEventListener(
  "click",
  (event) => {

    if (
      event.target.classList.contains(
        "popup"
      )
    ) {

      event.target.classList.add(
        "hidden"
      );
    }
  }
);