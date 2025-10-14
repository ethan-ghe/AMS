const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');

let mainWindow;
let updateWindow;

// Configure auto-updater
autoUpdater.autoDownload = true; // Auto-download updates
autoUpdater.autoInstallOnAppQuit = true;

// Disable auto-updater in development
if (isDev) {
  autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      partition: 'persist:main'
    },
    show: false // Don't show until ready
  });
  
  mainWindow.maximize();

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.show();
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
    
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });
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
  
  // Close update window and open main window
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
  
  // Install and restart after a brief delay
  setTimeout(() => {
    autoUpdater.quitAndInstall(false, true);
  }, 2000);
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  
  // Show error but continue to main app
  if (updateWindow) {
    sendUpdateStatus('Update check failed', 'Continuing to app...');
  }
  
  setTimeout(() => {
    closeUpdateWindow();
    createMainWindow();
  }, 2000);
  
  // Optional: Show error dialog
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Update Error',
      message: 'Could not check for updates. You may be running an outdated version.',
      detail: err.message
    });
  }
});

app.on('ready', () => {
  if (isDev) {
    // Skip update check in development
    createMainWindow();
  } else {
    // Production: Show update window and check for updates
    createUpdateWindow();
    
    // Give the window time to render before checking
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