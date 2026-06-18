import { WebSocket as WsClient } from 'ws';

// ttyd binary protocol:
//   Recv from ttyd: binary frames, byte[0]='0' output, '1' title, '2' prefs
//   Send to ttyd:   text frame JSON {"AuthToken":"","columns":N,"rows":N} on open
//                   binary frames byte[0]='0' input, byte[0]='1' resize JSON
//
// The browser sends the handshake text frame immediately on WS open.
// We must buffer browser messages that arrive before ttyd connects, then flush.

export function createTtydProxy(browserWs, ttydHost, ttydPort) {
  const ttydWs = new WsClient(`ws://${ttydHost}:${ttydPort}`, ['tty']);

  // Buffer messages from browser that arrive before ttyd is ready
  const pendingFromBrowser = [];
  let ttydReady = false;

  // Queue messages from browser until ttyd is open
  browserWs.on('message', (data, isBinary) => {
    if (ttydReady && ttydWs.readyState === WsClient.OPEN) {
      ttydWs.send(data, { binary: isBinary });
    } else {
      pendingFromBrowser.push({ data, isBinary });
    }
  });

  ttydWs.on('open', () => {
    ttydReady = true;
    // Flush any messages that arrived before ttyd was ready
    for (const { data, isBinary } of pendingFromBrowser) {
      if (ttydWs.readyState === WsClient.OPEN) {
        ttydWs.send(data, { binary: isBinary });
      }
    }
    pendingFromBrowser.length = 0;
  });

  // Forward all ttyd frames straight to browser
  ttydWs.on('message', (data, isBinary) => {
    if (browserWs.readyState === browserWs.OPEN) {
      browserWs.send(data, { binary: isBinary });
    }
  });

  ttydWs.on('close', (code, reason) => {
    if (browserWs.readyState === browserWs.OPEN) {
      browserWs.close(1000, reason);
    }
  });

  ttydWs.on('error', (err) => {
    console.error('[WsProxy] ttyd error:', err.message);
    if (browserWs.readyState === browserWs.OPEN) {
      browserWs.close(1011, 'upstream error');
    }
  });

  browserWs.on('close', () => {
    if (ttydWs.readyState === WsClient.OPEN || ttydWs.readyState === WsClient.CONNECTING) {
      ttydWs.close();
    }
  });

  browserWs.on('error', (err) => {
    console.error('[WsProxy] browser ws error:', err.message);
    if (ttydWs.readyState === WsClient.OPEN) {
      ttydWs.close();
    }
  });
}
