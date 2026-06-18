import { WebSocket as WsClient } from 'ws';

// ttyd binary protocol:
//   FROM ttyd → browser: binary frames, first byte = type ('0'=output, '1'=title, '2'=prefs)
//   TO ttyd ← browser:   binary frames, first byte = type ('0'=input, '1'=resize JSON)
//   Handshake: browser sends JSON {"AuthToken":"","columns":N,"rows":N} as text on open
//
// Pass frames through raw — no JSON wrapping — browser speaks ttyd natively.

export function createTtydProxy(browserWs, ttydHost, ttydPort) {
  const ttydWs = new WsClient(`ws://${ttydHost}:${ttydPort}`, ['tty']);

  ttydWs.on('open', () => {
    // Forward all browser frames straight to ttyd
    browserWs.on('message', (data, isBinary) => {
      if (ttydWs.readyState === WsClient.OPEN) {
        ttydWs.send(data, { binary: isBinary });
      }
    });
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
