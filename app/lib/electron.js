const { app, shell } = require("electron");

app.whenReady().then(() => {
  let port = process.env.PORT || 3000;
  shell.openExternal(`http://localhost:${port}`);
});
