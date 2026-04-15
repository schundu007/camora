const { Tray, Menu, app } = require('electron');

function createTray(icon, showWindow, navigateTo) {
  const tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Camora',
      click: showWindow,
    },
    { type: 'separator' },
    {
      label: 'Interview',
      click: () => navigateTo('/lumora'),
    },
    {
      label: 'Coding',
      click: () => navigateTo('/lumora/coding'),
    },
    {
      label: 'Design',
      click: () => navigateTo('/lumora/design'),
    },
    {
      label: 'Prepare',
      click: () => navigateTo('/capra/prepare'),
    },
    { type: 'separator' },
    {
      label: 'Quit Camora',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Camora — AI Interview Co-pilot');
  tray.setContextMenu(contextMenu);

  // macOS: single click to show, Windows: double click convention
  if (process.platform !== 'darwin') {
    tray.on('double-click', showWindow);
  } else {
    tray.on('click', showWindow);
  }

  return tray;
}

module.exports = { createTray };
