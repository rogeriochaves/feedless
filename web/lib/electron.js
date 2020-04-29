const { app, shell } = require("electron");

app.whenReady().then(() => {
  let port = process.env.PORT || 7624;
  shell.openExternal(`http://localhost:${port}`);
});
