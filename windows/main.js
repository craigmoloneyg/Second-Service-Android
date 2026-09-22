const { app, shell, dialog } = require('electron');
const WORKSPACE = 'https://garnish-craig.craig-moloneyg.chatgpt.site/workspace';
// Use the system browser so ChatGPT authentication and the live workspace share a session.
app.whenReady().then(async () => {
  try {
    await shell.openExternal(WORKSPACE);
  } catch {
    dialog.showErrorBox('Garnish Live', 'Could not open your browser. Open ' + WORKSPACE + ' in your browser.');
  } finally {
    app.quit();
  }
});
