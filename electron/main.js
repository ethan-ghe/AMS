const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let updateWindow;

// Simple dev detection - no package needed
const isDev = !app.isPackaged;

// Configure auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

if (!isDev) {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'ethan-ghe',
    repo: 'AMS'
  });
}

function createUpdateWindow() {
  updateWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  updateWindow.loadFile(path.join(__dirname, 'update.html'));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      partition: 'persist:main'
    },
    show: false
  });

  mainWindow.maximize();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.show();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
      .then(() => mainWindow.show())
      .catch(err => console.error('Failed to load:', err));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function closeUpdateWindow() {
  if (updateWindow) {
    updateWindow.close();
    updateWindow = null;
  }
}

function sendUpdateStatus(message, status = '') {
  if (updateWindow) {
    updateWindow.webContents.send('update-status', { message, status });
  }
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
  sendUpdateStatus('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  sendUpdateStatus(`Update available: v${info.version}`, 'Downloading...');
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available. App is up to date.');
  sendUpdateStatus('App is up to date!', 'Starting...');
  setTimeout(() => {
    closeUpdateWindow();
    createMainWindow();
  }, 1000);
});

autoUpdater.on('download-progress', (progressObj) => {
  const percent = progressObj.percent;
  console.log(`Download progress: ${Math.round(percent)}%`);
  if (updateWindow) {
    updateWindow.webContents.send('update-progress', percent);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded. Installing...');
  sendUpdateStatus('Update downloaded!', 'Installing and restarting...');
  setTimeout(() => {
    autoUpdater.quitAndInstall(true, true);
  }, 2000);
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  
  // Show the error to the user so you can see what's happening
  const errorMessage = `Update Error:\n\n${err.message}\n\nStack:\n${err.stack}`;
  
  if (updateWindow) {
    sendUpdateStatus('Update failed. See error details.', 'Error occurred');
  }
  
  setTimeout(() => {
    dialog.showErrorBox('Update Error Details', errorMessage);
    app.quit();
  }, 5000);
});

app.on('ready', () => {
  if (isDev) {
    createMainWindow();
  } else {
    createUpdateWindow();
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 1000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null && updateWindow === null) {
    if (isDev) {
      createMainWindow();
    } else {
      createUpdateWindow();
      autoUpdater.checkForUpdates();
    }
  }
});