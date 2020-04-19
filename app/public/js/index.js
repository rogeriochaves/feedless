let escCallback = () => {};
document.onkeydown = (e) => {
  const isEsc = e.key === "Escape" || e.key === "Esc";
  if (isEsc) escCallback();
};

const openModalFor = (elem, onConfirm, afterClose = null) => {
  const overlay = elem.parentElement.querySelector(".overlay");
  const modal = elem.parentElement.querySelector(".modal");
  const confirmButton = elem.parentElement.querySelector(".modal-confirm");

  overlay.style.display = "block";
  modal.style.display = "block";

  const onClose = () => {
    overlay.style.display = "none";
    modal.style.display = "none";
    if (afterClose) afterClose();
  };

  overlay.addEventListener("click", onClose);
  confirmButton.addEventListener("click", onConfirm);
  escCallback = onClose;

  return { close: onClose };
};

const composeButton = document.querySelector(".js-compose-secret-message");
const publishButton = document.querySelector(".js-secret-publish");
const sendingMessage = document.querySelector(".js-sending-message");
const messageInput = document.querySelector(".js-secret-message-input");
if (composeButton) {
  composeButton.addEventListener("click", () => {
    const onPublish = () => {
      if (messageInput.value.length == 0) return;

      publishButton.style.display = "none";
      sendingMessage.innerHTML = "Loading...";
      sendingMessage.style.display = "block";

      fetch(composeButton.dataset.url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "message=" + encodeURIComponent(messageInput.value),
      })
        .then(() => {
          sendingMessage.innerHTML = "✅ Sent";

          setTimeout(() => {
            modal.close();
            messageInput.value = "";
            publishButton.style.display = "block";
            sendingMessage.style.display = "none";
          }, 1000);
        })
        .catch(() => {
          sendingMessage.innerHTML = "Error";
          setTimeout(() => {
            publishButton.style.display = "block";
            sendingMessage.style.display = "none";
          }, 1000);
        });
    };
    const modal = openModalFor(composeButton, onPublish);
  });
}

const messages = document.querySelectorAll(".js-secret-message");
messages.forEach((message) => {
  message.addEventListener("click", () => {
    const afterClose = () => {
      const parent = message.parentElement;
      parent.parentElement.removeChild(parent);
      if (document.querySelectorAll(".js-secret-message").length == 0) {
        document.querySelector(".js-secret-messages").style.display = "none";
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
