import { WebSocket as WsClient } from 'ws';

export function createTtydProxy(browserWs, ttydHost, ttydPort) {
  const ttydWs = new WsClient(`ws://${ttydHost}:${ttydPort}`);

  ttydWs.on('open', () => {
    browserWs.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      if (msg.type === 'input' && typeof msg.data === 'string') {
        if (ttydWs.readyState === WsClient.OPEN) {
          ttydWs.send(msg.data);
        }
      } else if (msg.type === 'resize' && msg.cols && msg.rows) {
        if (ttydWs.readyState === WsClient.OPEN) {
          ttydWs.send(`\x1b[8;${msg.rows};${msg.cols}t`);
        }
      }
    });
  });

  ttydWs.on('message', (data) => {
    if (browserWs.readyState === browserWs.OPEN) {
      browserWs.send(JSON.stringify({ type: 'output', data: data.toString() }));
    }
  });

  ttydWs.on('close', () => {
    if (browserWs.readyState === browserWs.OPEN) {
      browserWs.send(JSON.stringify({ type: 'destroyed', reason: 'session_ended' }));
      browserWs.close();
    }
  });

  ttydWs.on('error', (err) => {
    console.error('[WsProxy] ttyd error:', err.message);
    if (browserWs.readyState === browserWs.OPEN) {
      browserWs.send(JSON.stringify({ type: 'destroyed', reason: 'connection_error' }));
      browserWs.close();
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
