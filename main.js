const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let backendProcess;
const BACKEND_PORT = 5000;
const HEALTH_ENDPOINT = `http://127.0.0.1:${BACKEND_PORT}/api/health`;
const DEBUG_MODE = process.env.DEBUG_MODE === 'true' || !app.isPackaged;

// Setup logging
let logPath;
try {
    logPath = path.join(app.getPath('userData'), 'backend.log');
    // Ensure directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    // Clear previous log on startup
    fs.writeFileSync(logPath, `--- Log Started: ${new Date().toISOString()} ---\n`);
} catch (error) {
    console.error("Failed to initialize logging:", error);
}

function logToFile(message) {
    if (!logPath) return; // Logging disabled or failed
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    try {
        fs.appendFileSync(logPath, logLine);
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }
    // Also log to console for dev mode
    console.log(message);
}

let isBackendReady = false;


function createWindow() {
    logToFile("Creating main window...");
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: path.join(__dirname, 'frontend', 'icon.png'),
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#1e1e1e',
            symbolColor: '#ffffff'
        },
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        backgroundColor: '#121212',
        backgroundColor: '#121212',
        show: false // Wait until ready to show
    });

    if (DEBUG_MODE) {
        mainWindow.webContents.openDevTools();
    }

    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        mainWindow.loadURL('http://localhost:5173');
    }

    mainWindow.once('ready-to-show', () => {
        logToFile("Window ready to show");
        mainWindow.show();
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        logToFile(`ERROR: Window failed to load: ${errorDescription} (${errorCode})`);
    });

    mainWindow.on('closed', () => (mainWindow = null));
}

function checkBackendHealth(retries = 20, delay = 500) {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            logToFile(`Checking backend health (Attempt ${21 - n}/20)...`);
            http.get(HEALTH_ENDPOINT, (res) => {
                if (res.statusCode === 200) {
                    logToFile("Backend health check passed!");
                    resolve(true);
                } else {
                    logToFile(`Backend returned status: ${res.statusCode}`);
                    if (n > 1) setTimeout(() => attempt(n - 1), delay);
                    else reject(new Error(`Backend returned status ${res.statusCode}`));
                }
            }).on('error', (err) => {
                logToFile(`Health check failed: ${err.message}`);
                if (n > 1) setTimeout(() => attempt(n - 1), delay);
                else reject(err);
            });
        };
        attempt(retries);
    });
}

function startBackend() {
    logToFile(`Starting backend. Packaged: ${app.isPackaged}`);

    let executable;
    let args = [];

    if (app.isPackaged) {
        executable = path.join(process.resourcesPath, 'backend', 'comic-api.exe');
        logToFile(`Backend executable path: ${executable}`);

        if (!fs.existsSync(executable)) {
            logToFile(`ERROR: Backend executable not found at ${executable}`);
            dialog.showErrorBox("Startup Error", "Backend executable not found.\nPlease reinstall the application.");
            return;
        }
    } else {
        executable = 'python';
        const scriptPath = path.join(__dirname, 'backend', 'main.py');
        args = ['-u', scriptPath];
        logToFile(`Development backend script: ${scriptPath}`);
    }

    try {
        backendProcess = spawn(executable, args);

        backendProcess.stdout.on('data', (data) => {
            logToFile(`[Backend stdout]: ${data.toString().trim()}`);
        });

        backendProcess.stderr.on('data', (data) => {
            logToFile(`[Backend stderr]: ${data.toString().trim()}`);
        });

        backendProcess.on('error', (err) => {
            logToFile(`Failed to spawn backend: ${err.message}`);
            dialog.showErrorBox("Backend Error", `Failed to start backend process:\n${err.message}`);
        });

        backendProcess.on('close', (code) => {
            logToFile(`Backend process exited with code ${code}`);
            if (code !== 0 && code !== null) {
                // If it crashes early, we might want to alert if window isn't shown yet
                if (!mainWindow || !mainWindow.isVisible()) {
                    dialog.showErrorBox("Backend Crashed", `The backend process exited unexpectedly with code ${code}.\nCheck logs at: ${logPath}`);
                }
            }
        });

        // Backend started, now wait for health check
        checkBackendHealth()
            .then(() => {
                logToFile("Backend is ready, creating window.");
                isBackendReady = true;
                createWindow();
            })
            .catch((err) => {
                logToFile(`Backend failed to initialize: ${err.message}`);
                dialog.showErrorBox("Initialization Error",
                    `Failed to connect to backend service after multiple attempts.\n\nError: ${err.message}\n\nLog file: ${logPath}`);
            });

    } catch (e) {
        logToFile(`Exception starting backend: ${e.message}`);
        dialog.showErrorBox("Critical Error", `Exception starting backend:\n${e.message}`);
    }
}

app.whenReady().then(() => {
    const { ipcMain } = require('electron');

    ipcMain.handle('select-dirs', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        return result.filePaths;
    });

    startBackend();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0 && isBackendReady) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (backendProcess) {
        logToFile("Killing backend process...");
        backendProcess.kill();
    }
});
