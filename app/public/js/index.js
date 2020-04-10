let escCallback = () => {};
document.onkeydown = (e) => {
  const isEsc = e.key === "Escape" || e.key === "Esc";
  if (isEsc) escCallback();
};

const messages = document.querySelectorAll(".js-vanishing-message");
messages.forEach((message) => {
  message.addEventListener("click", () => {
    const overlay = message.parentElement.querySelector(".overlay");
    const modal = message.parentElement.querySelector(".modal");
    const closeButton = message.parentElement.querySelector(".modal-close");

    overlay.style.display = "block";
    modal.style.display = "block";

    const onClose = () => {
      const parent = modal.parentElement;
      parent.parentElement.removeChild(parent);
      if (document.querySelectorAll(".vanishing-message").length == 0) {
        document.querySelector(".vanishing-messages").style.display = "none";
      }
    };

    overlay.addEventListener("click", onClose);
    closeButton.addEventListener("click", onClose);
    escCallback = onClose;

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
