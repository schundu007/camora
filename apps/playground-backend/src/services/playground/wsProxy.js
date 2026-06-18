import { WebSocket as WsClient } from 'ws';

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

export function createTtydProxy(browserWs, ttydHost, ttydPort, preBuf = []) {
  const url = `ws://${ttydHost}:${ttydPort}`;
  console.log(`[WsProxy] starting proxy url=${url} preBuf=${preBuf.length}`);

  const pendingBinary = [];
  for (const { data, isBinary } of preBuf) {
    if (isBinary) pendingBinary.push(data);
  }

  browserWs.on('message', (data, isBinary) => {
    if (isBinary) pendingBinary.push(data);
  });

  connectToTtyd(url).then((ttydWs) => {
    console.log(`[WsProxy] ttyd connected url=${url} pendingBinary=${pendingBinary.length}`);

    ttydWs.send(JSON.stringify({ AuthToken: '', columns: 220, rows: 50 }));

    browserWs.removeAllListeners('message');

    for (const data of pendingBinary) {
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.send(data, { binary: true });
    }
    pendingBinary.length = 0;

    browserWs.on('message', (data, isBinary) => {
      if (!isBinary) return;
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.send(data, { binary: true });
    });

    ttydWs.on('message', (data, isBinary) => {
      if (browserWs.readyState === browserWs.OPEN) {
        browserWs.send(data, { binary: isBinary });
      }
    });

    const keepAlive = setInterval(() => {
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.ping();
      if (browserWs.readyState === browserWs.OPEN) browserWs.ping();
    }, 30_000);

    const cleanup = () => clearInterval(keepAlive);

    ttydWs.on('close', (code, reason) => {
      cleanup();
      console.log(`[WsProxy] ttyd closed code=${code} reason=${reason}`);
      if (browserWs.readyState === browserWs.OPEN) browserWs.close(1000, reason);
    });

    ttydWs.on('error', (err) => {
      cleanup();
      console.error('[WsProxy] ttyd error:', err.message);
      if (browserWs.readyState === browserWs.OPEN) browserWs.close(1011, 'upstream error');
    });

    browserWs.on('close', (code) => {
      cleanup();
      console.log(`[WsProxy] browser closed code=${code}`);
      if (ttydWs.readyState === WsClient.OPEN || ttydWs.readyState === WsClient.CONNECTING) ttydWs.close();
    });

    browserWs.on('error', (err) => {
      cleanup();
      console.error('[WsProxy] browser ws error:', err.message);
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.close();
    });
  }).catch((err) => {
    console.error('[WsProxy] failed to connect to ttyd:', err.message);
    if (browserWs.readyState === browserWs.OPEN) browserWs.close(1011, 'ttyd unavailable');
  });
}
