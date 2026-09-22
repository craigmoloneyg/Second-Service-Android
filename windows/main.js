const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const { APP_ORIGIN, isApp, isInternal } = require('./navigation.cjs');
const HOME = APP_ORIGIN + '/workspace';
let win;
function navigate(url) { if(win && !win.isDestroyed()) win.loadURL(url).catch(()=>{}); }
function external(raw) {
  try { const u=new URL(raw); if(['https:','mailto:','tel:'].includes(u.protocol)) shell.openExternal(u.href).catch(()=>{}); } catch {}
}
function createWindow() {
  win = new BrowserWindow({
    width:1440,height:920,minWidth:720,minHeight:540,title:'Garnish',
    backgroundColor:'#104b39',icon:path.join(__dirname,'garnish.ico'),
    webPreferences:{partition:'persist:garnish',nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,allowRunningInsecureContent:false}
  });
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.webContents.session.setPermissionCheckHandler(()=>false);
  win.webContents.setWindowOpenHandler(({url})=>{
    if(isInternal(url)) navigate(url); else external(url);
    return {action:'deny'};
  });
  for(const eventName of ['will-navigate','will-redirect']) {
    win.webContents.on(eventName,(event,url)=>{
      if(!isInternal(url)) { event.preventDefault(); external(url); }
    });
  }
  win.webContents.on('page-title-updated',event=>{
    event.preventDefault();
    const url=win.webContents.getURL();
    let title='Garnish';
    if(!isApp(url)) { try { title+=' — Sign in · '+new URL(url).hostname; } catch {} }
    win.setTitle(title);
  });
  win.webContents.on('did-fail-load',(_event,code,_description,url,isMainFrame)=>{
    if(!isMainFrame || code===-3 || !isInternal(url)) return;
    dialog.showMessageBox(win,{type:'warning',title:'Garnish connection',message:'Garnish could not connect.',detail:'Check your internet connection, then choose Retry. Your saved online records are unchanged.',buttons:['Retry','Close'],defaultId:0,cancelId:1}).then(({response})=>{if(response===0)navigate(url);});
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Garnish',submenu:[
      {label:'Workspace',click:()=>navigate(HOME)},
      {label:'POS & Kitchen',click:()=>navigate(APP_ORIGIN+'/workspace/pos')},
      {type:'separator'},{role:'quit'}
    ]},
    {label:'View',submenu:[
      {label:'Back',accelerator:'Alt+Left',click:()=>{if(win.webContents.navigationHistory.canGoBack())win.webContents.navigationHistory.goBack();}},
      {role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}
    ]}
  ]));
  navigate(HOME);
}
const single=app.requestSingleInstanceLock();
if(!single) app.quit();
else {
  app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
  app.whenReady().then(()=>{app.setAppUserModelId('com.garnish.live');createWindow();});
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
  app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
