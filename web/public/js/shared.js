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
