import { WebSocket as WsClient } from 'ws';

// ttyd binary protocol:
//   Recv from ttyd: binary frames, byte[0]='0' output, '1' title, '2' prefs
//   Send to ttyd:   text frame JSON {"AuthToken":"","columns":N,"rows":N} on open
//                   binary frames byte[0]='0' input, byte[0]='1' resize JSON
//
// The browser sends the handshake text frame immediately on WS open.
// We must buffer browser messages that arrive before ttyd connects, then flush.

const TTYD_CONNECT_RETRIES = 8;
const TTYD_RETRY_DELAY_MS = 1500;

function connectToTtyd(url, attempt = 0) {
  return new Promise((resolve, reject) => {
    const ws = new WsClient(url, ['tty']);
    ws.once('open', () => resolve(ws));
    ws.once('error', (err) => {
      ws.terminate();
      if (attempt < TTYD_CONNECT_RETRIES) {
        setTimeout(() => connectToTtyd(url, attempt + 1).then(resolve, reject), TTYD_RETRY_DELAY_MS);
      } else {
        reject(err);
      }
    });
  });
}

export function createTtydProxy(browserWs, ttydHost, ttydPort) {
  const url = `ws://${ttydHost}:${ttydPort}`;
  const pendingFromBrowser = [];

  browserWs.on('message', (data, isBinary) => {
    pendingFromBrowser.push({ data, isBinary });
  });

  connectToTtyd(url).then((ttydWs) => {
    browserWs.removeAllListeners('message');

    for (const { data, isBinary } of pendingFromBrowser) {
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.send(data, { binary: isBinary });
    }
    pendingFromBrowser.length = 0;

    browserWs.on('message', (data, isBinary) => {
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.send(data, { binary: isBinary });
    });

    ttydWs.on('message', (data, isBinary) => {
      if (browserWs.readyState === browserWs.OPEN) browserWs.send(data, { binary: isBinary });
    });

    ttydWs.on('close', (code, reason) => {
      if (browserWs.readyState === browserWs.OPEN) browserWs.close(1000, reason);
    });

    ttydWs.on('error', (err) => {
      console.error('[WsProxy] ttyd error:', err.message);
      if (browserWs.readyState === browserWs.OPEN) browserWs.close(1011, 'upstream error');
    });

    browserWs.on('close', () => {
      if (ttydWs.readyState === WsClient.OPEN || ttydWs.readyState === WsClient.CONNECTING) ttydWs.close();
    });

    browserWs.on('error', (err) => {
      console.error('[WsProxy] browser ws error:', err.message);
      if (ttydWs.readyState === WsClient.OPEN) ttydWs.close();
    });
  }).catch((err) => {
    console.error('[WsProxy] failed to connect to ttyd after retries:', err.message);
    if (browserWs.readyState === browserWs.OPEN) browserWs.close(1011, 'ttyd unavailable');
  });
}
