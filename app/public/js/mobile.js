/**
 * Compose Post
 */

const composePost = document.querySelector(".js-compose-post");
if (composePost) {
  const composeButton = document.querySelector(".js-publish-button");
  composePost.addEventListener("focus", () => {
    composeButton.style.display = "block";
  });
}

/**
 * Modal
 */

const openModalFor = (elem, onConfirm, afterClose = null) => {
  const overlay = elem.parentElement.querySelector(".overlay");
  const modal = elem.parentElement.querySelector(".modal");
  const confirmButtons = elem.parentElement.querySelectorAll(".modal-confirm");
  const steps = elem.parentElement.querySelectorAll(".js-step");

  overlay.hidden = false;
  modal.hidden = false;

  const onClose = () => {
    overlay.hidden = true;
    modal.hidden = true;
    steps.forEach((step) => {
      step.style.display = "none";
    });
    if (steps[0]) steps[0].style.display = "flex";
    if (afterClose) afterClose();
  };

  const nextOrConfirm = () => {
    if (steps.length == 0) {
      onConfirm();
    } else {
      let currentStep;
      steps.forEach((step, index) => {
        if (currentStep == index) {
          step.style.display = "flex";
        } else if (step.style.display != "none") {
          currentStep = index;
          currentStep++;
          if (currentStep < steps.length) step.style.display = "none";
        }
      });
      if (currentStep == steps.length) {
        onConfirm();
      }
    }
  };

  overlay.addEventListener("click", onClose);
  Array.from(confirmButtons).forEach((button) =>
    button.addEventListener("click", nextOrConfirm)
  );

  return { close: onClose };
};

/**
 * Secret Messages Reading
 */

const messages = document.querySelectorAll(".js-secret-message");
messages.forEach((message) => {
  message.addEventListener("click", () => {
    const afterClose = () => {
      const parent = message.parentElement;
      const composeMessage = parent.parentElement.querySelector(
        ".js-compose-secret-message"
      );
      composeMessage.style.display = "flex";
      parent.parentElement.removeChild(parent);
    };

    const modal = openModalFor(message, () => modal.close(), afterClose);

    fetch("/vanish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "keys=" + encodeURIComponent(message.dataset.keys),
    });
  });
});
