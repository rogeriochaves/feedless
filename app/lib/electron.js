const { app, shell } = require("electron");

app.whenReady().then(() => {
  let port = process.env.EXPRESS_PORT || 3000;
  shell.openExternal(`http://localhost:${port}`);
});
