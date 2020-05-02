/**
 * Fix image heights
 */

let imagesFixed = false;
const fixImageHeights = () => {
  if (imagesFixed) return;
  imagesFixed = true;

  const css = `
    .profile-pic {
      min-height: 0;
    }
    .post-profile-pic {
      min-height: 0;
    }
    .link-profile-pic {
      min-height: 0;
    }
  `;
  const head = document.head || document.getElementsByTagName("head")[0];
  const style = document.createElement("style");

  head.appendChild(style);
  style.appendChild(document.createTextNode(css));
};

document.addEventListener("readystatechange", (event) => {
  if (event.target.readyState === "complete") {
    fixImageHeights();
  }
});
setTimeout(fixImageHeights, 2000);

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
