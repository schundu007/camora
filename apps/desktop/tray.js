const { Tray, Menu, app } = require('electron');

function createTray(iconPath, showWindow) {
  const tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Camora',
      click: showWindow,
    },
    { type: 'separator' },
    {
      label: 'Interview',
      click: () => {
        showWindow();
        // Navigate handled by renderer
      },
    },
    {
      label: 'Coding',
      click: showWindow,
    },
    {
      label: 'Design',
      click: showWindow,
    },
    { type: 'separator' },
    {
      label: 'Quit Camora',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Camora — AI Interview Co-pilot');
  tray.setContextMenu(contextMenu);

  // Click tray icon to show window
  tray.on('click', showWindow);

  return tray;
}

module.exports = { createTray };
