/**
 * Modal
 */

let escCallback = () => {};
document.onkeydown = (e) => {
  const isEsc = e.key === "Escape" || e.key === "Esc";
  if (isEsc) escCallback();
};

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
      step.hidden = true;
    });
    if (steps[0]) steps[0].hidden = false;
    if (afterClose) afterClose();
  };

  const nextOrConfirm = () => {
    if (steps.length == 0) {
      onConfirm();
    } else {
      let currentStep;
      steps.forEach((step, index) => {
        if (currentStep == index) {
          step.hidden = false;
        } else if (!step.hidden) {
          currentStep = index;
          currentStep++;
          if (currentStep < steps.length) step.hidden = true;
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
  escCallback = onClose;

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

    if (parent.querySelector(".js-secret-recipients")) {
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
 * Profile Pic Upload
 */

const profilePicUpload = document.querySelector(".js-profile-pic-upload");
if (profilePicUpload) {
  const placeholder = document.querySelector(".js-profile-pic-placeholder");

  const previewImage = () => {
    if (profilePicUpload.files && profilePicUpload.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        placeholder.src = e.target.result;
        placeholder.parentElement.style.height = "auto";
      };
      reader.readAsDataURL(profilePicUpload.files[0]);
    }
  };

  profilePicUpload.addEventListener("change", previewImage);
  previewImage();
}

/**
 * Syncing
 */

const jsSyncing = document.querySelector(".js-syncing");
if (jsSyncing) {
  let checkSyncInterval;
  const checkSync = () => {
    fetch("/syncing")
      .then((result) => result.json())
      .then((result) => {
        if (!result.syncing) {
          clearInterval(checkSyncInterval);
          jsSyncing.parentElement.removeChild(jsSyncing);
        }
      });
  };
  checkSyncInterval = setInterval(checkSync, 5000);
}
