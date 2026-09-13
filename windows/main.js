const { app, BrowserWindow, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const HOME = 'https://second-service-profit-intelligence.craig-moloneyg.workers.dev/';
const HOST = new URL(HOME).hostname;

function isInternal(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname === HOST && !url.username && !url.password && (url.port === '' || url.port === '443');
  } catch { return false; }
}

function openExternal(raw) {
  try {
    const url = new URL(raw);
    if (['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) shell.openExternal(url.toString());
  } catch { /* Ignore malformed or unsupported links. */ }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: 'Price 2 Plate',
    backgroundColor: '#f5f3ec',
    icon: path.join(__dirname, 'logo.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: true
    }
  });

  const ses = win.webContents.session;
  win.webContents.on('did-finish-load', () => {
    if (!isInternal(win.webContents.getURL())) return;
    const assetDir = app.isPackaged ? path.join(process.resourcesPath, 'enhancements') : path.join(__dirname, '../app/src/main/assets');
    const source = ['invoice-batch.js', 'welcome.js'].map(name => fs.readFileSync(path.join(assetDir, name), 'utf8')).join('\n');
    win.webContents.executeJavaScript(source).catch(error => console.error('Could not load workspace enhancements:', error.message));
  });
  ses.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) { win.loadURL(url); }
    else openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isInternal(url)) { event.preventDefault(); openExternal(url); }
  });
  win.webContents.on('will-redirect', (event, url) => {
    if (!isInternal(url)) { event.preventDefault(); openExternal(url); }
  });
  win.webContents.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: item.getFilename() });
  });
  win.loadURL(HOME);
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    headers['Content-Security-Policy'] = ["default-src https: 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"];
    callback({ responseHeaders: headers });
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
