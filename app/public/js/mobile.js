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
  const closeButton = elem.parentElement.querySelector(".js-modal-close");
  const backButtons = elem.parentElement.querySelectorAll(".js-modal-back");

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

  const previousStep = () => {
    let currentStep;
    Array.from(steps)
      .reverse()
      .forEach((step, index) => {
        if (currentStep == index) {
          step.style.display = "flex";
        } else if (step.style.display != "none") {
          currentStep = index;
          currentStep++;
          if (currentStep < steps.length) step.style.display = "none";
        }
      });
  };

  if (closeButton) closeButton.addEventListener("click", onClose);
  Array.from(confirmButtons).forEach((button) =>
    button.addEventListener("click", nextOrConfirm)
  );
  Array.from(backButtons).forEach((button) =>
    button.addEventListener("click", previousStep)
  );

  return { close: onClose };
};

/**
 * Secret Messages Composer
 */

const composeButtons = document.querySelectorAll(".js-compose-secret-message");
composeButtons.forEach((composeButton) => {
  const parent = composeButton.parentElement;
  const publishButton = parent.querySelector(".js-secret-publish");
  const sendingMessage = parent.querySelector(".js-sending-message");
  const messageInput = parent.querySelector(".js-secret-message-input");

  messageInput.value = ""; // Clearing because of browser default behavior of keeping the value on refresh

  const selectedRecipients = () =>
    Array.from(parent.querySelectorAll(".js-secret-recipients:checked"))
      .map((x) => x.value)
      .join(",");

  const onPublish = () => {
    if (messageInput.value.length == 0) return;

    let url = composeButton.dataset.url;
    let body = "message=" + encodeURIComponent(messageInput.value);

    if (parent.querySelector(".js-recipients-list")) {
      const recipients = selectedRecipients();
      if (recipients.length == 0) return;

      url = "/publish_secret";
      body += "&recipients=" + encodeURIComponent(recipients);
    }

    publishButton.style.display = "none"; // hidden doesn't work on buttons
    sendingMessage.innerHTML = "Loading...";
    sendingMessage.hidden = false;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
      .then(onSuccess)
      .catch(onError);
  };

  const onSuccess = () => {
    sendingMessage.innerHTML = "✅ Sent";

    setTimeout(() => {
      modal.close();
      messageInput.value = "";
      publishButton.style.display = "block";
      sendingMessage.hidden = true;
    }, 1000);
  };

  const onError = () => {
    sendingMessage.innerHTML = "Error";
    setTimeout(() => {
      publishButton.style.display = "block";
      sendingMessage.hidden = true;
    }, 1000);
  };

  let modal;
  composeButton.addEventListener("click", () => {
    modal = openModalFor(composeButton, onPublish);
  });
});

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

/**
 * Tabs
 */

const tabButtons = document.querySelectorAll(".js-tab-button");
tabButtons.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    const tabItems = document.querySelectorAll(".js-tab-item");
    tabItems.forEach((item) => {
      item.style.display = "none";
    });
    tabItems[index].style.display = "block";

    tabButtons.forEach((tab) => {
      tab.classList.remove("tab-selected");
    });
    tab.classList.add("tab-selected");
  });
});

/**
 * Top menu
 */

const openMenu = document.querySelector(".js-open-menu");
if (openMenu) {
  const topMenu = document.querySelector(".js-top-menu");
  const overlay = document.querySelector(".js-top-menu-overlay");
  openMenu.addEventListener("click", () => {
    overlay.style.display = "block";
    topMenu.style.display = "flex";
  });
  overlay.addEventListener("click", () => {
    overlay.style.display = "none";
    topMenu.style.display = "none";
  });
}
