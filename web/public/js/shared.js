/**
 * Client JS error monitoring
 */

window.debugError = () => {
  const throwLevel1 = () => {
    throwLevel2();
  };
  const throwLevel2 = () => {
    const object = {};
    object.isUndefinedAFunction();
  };
  setTimeout(throwLevel1, 1);
};

window.onerror = (message, _url, _lineNo, _columnNo, error) => {
  fetch("/frontend-error", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "message=" +
      encodeURIComponent(message.toString()) +
      "&stacktrace=" +
      encodeURIComponent(error.stack),
  });
};

/**
 * Letter counter
 */

const letterCounter = document.querySelector(".js-letter-count");
if (letterCounter) {
  let parent = letterCounter.parentElement;
  if (parent.tagName != "FORM") parent = parent.parentElement;
  const textarea = parent.querySelector("textarea");
  const submit = parent.querySelector("input[type=submit]");
  const countLetters = () => {
    const left = 140 - textarea.value.length;
    letterCounter.textContent = left.toString();
    if (left < 0) {
      submit.setAttribute("disabled", "disabled");
    } else {
      submit.removeAttribute("disabled");
    }
  };
  textarea.addEventListener("keyup", countLetters);
  countLetters();
}

window.replyTo = (id, name, prev, root) => {
  const textarea = document.querySelector(".js-compose-post");
  textarea.value = `@${name} `;
  textarea.focus();

  const mentionIdInput = document.querySelector(".js-post-mention-id");
  const mentionNameInput = document.querySelector(".js-post-mention-name");
  const prevInput = document.querySelector(".js-post-prev");
  const rootInput = document.querySelector(".js-post-root");

  mentionIdInput.value = id;
  mentionNameInput.value = name;
  prevInput.value = prev;
  rootInput.value = root;

  textarea.addEventListener("keyup", () => {
    if (!textarea.value.includes(name)) {
      mentionIdInput.value = "";
      mentionNameInput.value = "";
      prevInput.value = "";
      rootInput.value = "";
    }
  });
};

const openPopupButtons = document.querySelectorAll(".js-open-popup");
openPopupButtons.forEach((openPopupButton) => {
  openPopupButton.addEventListener("click", () => {
    const parent = openPopupButton.parentElement;
    const popup = parent.querySelector(".js-popup-menu");
    if (popup.style.display == "block") {
      popup.style.display = "none";
    } else {
      popup.style.display = "block";
    }
  });
});

const deleteButtons = document.querySelectorAll(".js-delete");
deleteButtons.forEach((deleteButton) => {
  deleteButton.addEventListener("click", () => {
    const key = deleteButton.parentElement.dataset.key.replace("%", "");
    fetch(`/delete/${key}`, { method: "POST" }).then(() => {
      const post =
        deleteButton.parentElement.parentElement.parentElement.parentElement;
      post.parentElement.removeChild(post);
    });
  });
});

const hideItem = (key, post) => {
  fetch(`/delete/${key}`, { method: "POST" }).then(() => {
    post.innerHTML =
      "Post not visible either because you have hidden it, blocked the user or they are not in your extended friends range";
  });
};

const hideButtons = document.querySelectorAll(".js-hide");
hideButtons.forEach((hideButton) => {
  hideButton.addEventListener("click", () => {
    const key = hideButton.parentElement.dataset.key.replace("%", "");
    const post =
      hideButton.parentElement.parentElement.parentElement.parentElement;
    hideItem(key, post);

    if (confirm("Do you also want to flag the post?")) {
      flagItem(key);
    }
  });
});

const flagItem = (key) => {
  const reason = prompt("What is the reason to flag this?");
  if (!reason) return;

  fetch(`/flag/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "reason=" + encodeURIComponent(reason),
  }).then(() => {
    alert("Post was flagged, thank you for reporting");
  });
};

const flagButtons = document.querySelectorAll(".js-flag");
flagButtons.forEach((flagButton) => {
  flagButton.addEventListener("click", () => {
    const key = flagButton.parentElement.dataset.key.replace("%", "");
    const post =
      flagButton.parentElement.parentElement.parentElement.parentElement;
    flagItem(key);

    if (confirm("Do you also want to hide the post?")) {
      hideItem(key, post);
    }
  });
});

const shareButtons = document.querySelectorAll(".js-share");
shareButtons.forEach((shareButton) => {
  if (navigator.share) {
    shareButton.addEventListener("click", () => {
      const key = shareButton.parentElement.dataset.key.replace("%", "");
      const text = shareButton.parentElement.parentElement.parentElement.querySelector(
        ".js-post-text"
      ).innerText;
      navigator.share({
        title: "Feedless",
        text: text,
        url: `https://feedless.social/post/${key}`,
      });
    });
    const popupMenu = shareButton.parentElement;
    popupMenu.style.display = "none";
  } else {
    shareButton.style.display = "none";
  }
});

const copyButtons = document.querySelectorAll(".js-copy-id");
copyButtons.forEach((copyButton) => {
  copyButton.addEventListener("click", () => {
    const key = copyButton.parentElement.dataset.key;
    navigator.clipboard.writeText(key).catch(() => {
      alert("Copy failed");
    });
    const popupMenu = copyButton.parentElement;
    popupMenu.style.display = "none";
  });
});
