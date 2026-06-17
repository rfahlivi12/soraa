const titleText = "Hi Sora ❤️";

let titleIndex = 0;

/* TITLE TYPING */

function typeTitle() {

  if (titleIndex < titleText.length) {

    document
      .getElementById("typing")
      .innerHTML += titleText.charAt(titleIndex);

    titleIndex++;

    setTimeout(typeTitle, 100);
  }
}

typeTitle();

/* SECTION */

function showSection(sectionId) {

  const sections =
    document.querySelectorAll(".section");

  sections.forEach(section => {

    section.classList.add("hidden");
  });

  document
    .getElementById(sectionId)
    .classList.remove("hidden");
}

/* POPUP */

const message = `
Even though we've never met in person,
somehow you still became someone important to me.

I like our conversations,
the way you respond,
and the comfort you bring into ordinary days.

Distance is strange sometimes,
because even from far away,
you still manage to make me smile.

Maybe one day,
we'll finally meet for real.

And honestly,
I think I'd really like that.
`;

let messageIndex = 0;

function showPopup() {

  document
    .getElementById("popup")
    .classList.remove("hidden");

  document
    .getElementById("messageText")
    .innerHTML = "";

  messageIndex = 0;

  typeMessage();
}

function closePopup() {

  document
    .getElementById("popup")
    .classList.add("hidden");
}

function typeMessage() {

  if (messageIndex < message.length) {

    document
      .getElementById("messageText")
      .innerHTML += message.charAt(messageIndex);

    messageIndex++;

    setTimeout(typeMessage, 35);
  }
}