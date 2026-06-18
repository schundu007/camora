import { WebSocket as WsClient } from 'ws';

// ttyd binary protocol:
//   Recv from ttyd: binary frames, byte[0]='0' output, '1' title, '2' prefs
//   Send to ttyd:   text frame JSON {"AuthToken":"","columns":N,"rows":N} on open
//                   binary frames byte[0]='0' input, byte[0]='1' resize JSON
//
// Auth race fix: the upgrade handler is async (awaits DB session lookup), so the
// browser's auth text frame can arrive before createTtydProxy is even called.
// Solution: caller pre-buffers messages before any awaits; we also send the auth
// from the proxy side so ttyd doesn't depend on the browser's timing at all.

const TTYD_CONNECT_RETRIES = 10;
const TTYD_RETRY_DELAY_MS = 1200;

function connectToTtyd(url, attempt = 0) {
  return new Promise((resolve, reject) => {
    const ws = new WsClient(url, ['tty']);
    let settled = false;
    const settle = (fn, val) => { if (!settled) { settled = true; fn(val); } };

    ws.once('open', () => {
      const openTime = Date.now();
      ws.once('close', (code) => {
        const elapsed = Date.now() - openTime;
        if (elapsed < 600) {
          // Port accepted TCP but ttyd not ready yet — retry
          ws.terminate();
          if (attempt < TTYD_CONNECT_RETRIES) {
            console.log(`[WsProxy] ttyd immediate close code=${code} elapsed=${elapsed}ms attempt=${attempt} — retrying`);
            setTimeout(() => connectToTtyd(url, attempt + 1).then(
              (w) => settle(resolve, w), (e) => settle(reject, e)
            ), TTYD_RETRY_DELAY_MS);
          } else {
            settle(reject, new Error(`ttyd closed immediately after open (code ${code})`));
          }
        } else {
          settle(reject, new Error(`ttyd closed during handshake (code ${code})`));
        }
      });
      // Connection looks stable — resolve
      setTimeout(() => settle(resolve, ws), 0);
    });

    ws.once('error', (err) => {
      ws.terminate();
      if (attempt < TTYD_CONNECT_RETRIES) {
        setTimeout(() => connectToTtyd(url, attempt + 1).then(
          (w) => settle(resolve, w), (e) => settle(reject, e)
        ), TTYD_RETRY_DELAY_MS);
      } else {
        settle(reject, err);
      }
    });
  });
}

// preBuf: messages buffered by the upgrade handler before createTtydProxy was called
export function createTtydProxy(browserWs, ttydHost, ttydPort, preBuf = []) {
  const url = `ws://${ttydHost}:${ttydPort}`;
  console.log(`[WsProxy] starting proxy url=${url} preBuf=${preBuf.length}`);

  // Buffer binary input frames that arrive while we are connecting to ttyd.
  // Text frames from browser = the auth handshake; we send auth ourselves so skip them.
  const pendingBinary = [];
  for (const { data, isBinary } of preBuf) {
    if (isBinary) pendingBinary.push(data);
  }

  browserWs.on('message', (data, isBinary) => {
    if (isBinary) pendingBinary.push(data);
    // skip text frames (browser auth) — proxy sends its own auth below
  });

  connectToTtyd(url).then((ttydWs) => {
    console.log(`[WsProxy] ttyd connected url=${url} pendingBinary=${pendingBinary.length}`);

    // Send auth on behalf of the browser — fixed cols/rows; terminal will resize via binary frame
    ttydWs.send(JSON.stringify({ AuthToken: '', columns: 220, rows: 50 }));

    browserWs.removeAllListeners('message');

    for (const data of pendingBinary) {
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.send(data, { binary: true });
    }
    pendingBinary.length = 0;

    // Pass-through: binary only from browser (skip any stray text frames)
    browserWs.on('message', (data, isBinary) => {
      if (!isBinary) return;
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.send(data, { binary: true });
    });

    ttydWs.on('message', (data, isBinary) => {
      if (browserWs.readyState === browserWs.OPEN) {
        browserWs.send(data, { binary: isBinary });
      }
    });

    ttydWs.on('close', (code, reason) => {
      console.log(`[WsProxy] ttyd closed code=${code} reason=${reason}`);
      if (browserWs.readyState === browserWs.OPEN) browserWs.close(1000, reason);
    });

    ttydWs.on('error', (err) => {
      console.error('[WsProxy] ttyd error:', err.message);
      if (browserWs.readyState === browserWs.OPEN) browserWs.close(1011, 'upstream error');
    });

    browserWs.on('close', (code) => {
      console.log(`[WsProxy] browser closed code=${code}`);
      if (ttydWs.readyState === WsClient.OPEN || ttydWs.readyState === WsClient.CONNECTING) ttydWs.close();
    });

    browserWs.on('error', (err) => {
      console.error('[WsProxy] browser ws error:', err.message);
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.close();
    });
  }).catch((err) => {
    console.error('[WsProxy] failed to connect to ttyd:', err.message);
    if (browserWs.readyState === browserWs.OPEN) browserWs.close(1011, 'ttyd unavailable');
  });
}
