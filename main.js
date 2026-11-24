const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Bubble Inspeksi',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Buka PDF...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open-pdf'),
        },
        {
          label: 'Ekspor PDF...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu-export-pdf'),
        },
        { type: 'separator' },
        { label: 'Keluar', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'Tampilan',
      submenu: [
        {
          label: 'Perbesar',
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow.webContents.send('menu-zoom-in'),
        },
        {
          label: 'Perkecil',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow.webContents.send('menu-zoom-out'),
        },
        {
          label: 'Pas ke Lebar',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow.webContents.send('menu-zoom-fit'),
        },
      ],
    },
    {
      label: 'Bantuan',
      submenu: [
        {
          label: 'Tentang Bubble Inspeksi',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Tentang Bubble Inspeksi',
              message: 'Bubble Inspeksi 1.0.0',
              detail:
                'Beri nomor bubble pada gambar PDF dan ekspor hasilnya ke PDF.\n' +
                'Klik pada gambar untuk memasang bubble bernomor otomatis.',
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openPdf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Buka PDF Gambar',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  const filePath = result.filePaths[0];
  const data = await fs.promises.readFile(filePath);
  return { canceled: false, filePath, fileName: path.basename(filePath), data };
});

ipcMain.handle('dialog:savePdf', async (_event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Simpan PDF Hasil',
    defaultPath: defaultName || 'bubble-inspeksi.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('file:write', async (_event, filePath, data) => {
  await fs.promises.writeFile(filePath, Buffer.from(data));
  return { ok: true };
});

ipcMain.handle('file:read', async (_event, filePath) => {
  const data = await fs.promises.readFile(filePath);
  return { filePath, fileName: path.basename(filePath), data };
});
