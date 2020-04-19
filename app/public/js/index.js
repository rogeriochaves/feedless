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

  overlay.hidden = false;
  modal.hidden = false;

  const onClose = () => {
    overlay.hidden = true;
    modal.hidden = true;
    if (afterClose) afterClose();
  };

  overlay.addEventListener("click", onClose);
  Array.from(confirmButtons).forEach((button) =>
    button.addEventListener("click", onConfirm)
  );
  escCallback = onClose;

  return { close: onClose };
};

/**
 * Secret Messages Composer
 */

const composeButton = document.querySelector(".js-compose-secret-message");
const publishButton = document.querySelector(".js-secret-publish");
const sendingMessage = document.querySelector(".js-sending-message");
const messageInput = document.querySelector(".js-secret-message-input");
if (composeButton) {
  const step1 = composeButton.parentElement.querySelector(".js-step-1");
  const step2 = composeButton.parentElement.querySelector(".js-step-2");

  const onNext = () => {
    if (!step2 || step1.hidden) {
      onPublish();
      return;
    }

    step1.hidden = true;
    step2.hidden = false;
  };

  const selectedRecipients = () =>
    Array.from(document.querySelectorAll(".js-secret-recipients:checked"))
      .map((x) => x.value)
      .join(",");

  const onPublish = () => {
    if (messageInput.value.length == 0) return;

    let url = composeButton.dataset.url;
    let body = "message=" + encodeURIComponent(messageInput.value);

    if (step2) {
      debugger;
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

      if (step2) {
        step1.hidden = false;
        step2.hidden = true;
      }
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
    const afterClose = () => {
      if (step2) {
        step1.hidden = false;
        step2.hidden = true;
      }
    };

    modal = openModalFor(composeButton, onNext, afterClose);
  });
}

/**
 * Secret Messages Reading
 */

const messages = document.querySelectorAll(".js-secret-message");
messages.forEach((message) => {
  message.addEventListener("click", () => {
    const afterClose = () => {
      const parent = message.parentElement;
      parent.parentElement.removeChild(parent);
      if (document.querySelectorAll(".js-secret-message").length == 0) {
        document.querySelector(".js-secret-messages").hidden = true;
      }
    };

    const modal = openModalFor(message, () => modal.close(), afterClose);

    fetch("/vanish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "key=" + encodeURIComponent(message.dataset.key),
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
