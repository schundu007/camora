/**
 * Live dictation bridge — proxies a browser mic WebSocket to Deepgram's
 * realtime STT and relays interim/final transcripts back.
 *
 *   browser  ──(webm/opus audio frames)──▶  this server  ──▶  Deepgram Live
 *   browser  ◀──({type:'interim'|'final', text})──────────  this server
 *
 * The client streams MediaRecorder chunks as binary frames; we forward them
 * to Deepgram and push transcript events back as JSON. Word-by-word interim
 * results give the "types as you talk" feel in both web and the Electron
 * desktop app (both just open a WS to us).
 *
 * If DEEPGRAM_API_KEY is unset/placeholder we refuse the upgrade so the client
 * falls back to the Groq near-live path.
 */
import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../lib/shared-auth.js';

const wss = new WebSocketServer({ noServer: true });

// nova-2, interim results on, punctuation + smart formatting. No `encoding`
// param: MediaRecorder sends webm/opus which Deepgram detects from the
// container stream.
const DG_URL =
  'wss://api.deepgram.com/v1/listen' +
  '?model=nova-2&language=en&interim_results=true&punctuate=true&smart_format=true&endpointing=300';

function keyIsUsable() {
  const k = process.env.DEEPGRAM_API_KEY || '';
  return k.length >= 30 && !/placeholder/i.test(k);
}

/** Returns true if it handled (or rejected) the upgrade; false if the path
 *  doesn't match and the caller should keep matching other routes. */
export function tryHandleDictateUpgrade(req, socket, head) {
  let path = req.url || '';
  if (!path.startsWith('/api/v1/dictate/live')) return false;

  // Auth via ?token= (WS can't send Authorization headers from the browser).
  let ok = false;
  try {
    const u = new URL(req.url, 'http://localhost');
    const token = u.searchParams.get('token');
    if (token) { verifyToken(token); ok = true; }
  } catch { ok = false; }

  if (!ok || !keyIsUsable()) { socket.destroy(); return true; }

  wss.handleUpgrade(req, socket, head, (client) => bridge(client));
  return true;
}

function bridge(client) {
  const dg = new WebSocket(DG_URL, {
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
  });

  let dgOpen = false;
  const queue = [];
  let keepAlive = null;

  dg.on('open', () => {
    dgOpen = true;
    for (const buf of queue) { try { dg.send(buf); } catch {} }
    queue.length = 0;
    try { client.send(JSON.stringify({ type: 'ready' })); } catch {}
    // Deepgram closes idle sockets after ~10s; ping to hold it open between
    // words. (KeepAlive is a documented control message.)
    keepAlive = setInterval(() => {
      try { if (dg.readyState === WebSocket.OPEN) dg.send(JSON.stringify({ type: 'KeepAlive' })); } catch {}
    }, 7000);
  });

  dg.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type !== 'Results') return;
      const text = msg.channel?.alternatives?.[0]?.transcript || '';
      if (!text) return;
      client.send(JSON.stringify({
        type: msg.is_final ? 'final' : 'interim',
        text,
        speechFinal: !!msg.speech_final,
      }));
    } catch { /* ignore non-JSON keepalive echoes */ }
  });

  const closeAll = () => {
    if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
    try { dg.close(); } catch {}
    try { client.close(); } catch {}
  };

  dg.on('close', closeAll);
  dg.on('error', () => { try { client.send(JSON.stringify({ type: 'error' })); } catch {}; closeAll(); });

  client.on('message', (data, isBinary) => {
    // Audio frames arrive as binary; forward straight through.
    if (!isBinary) return;
    if (dgOpen) { try { dg.send(data); } catch {} }
    else queue.push(data);
  });

  client.on('close', () => {
    // Ask Deepgram to flush the final transcript, then close.
    try { if (dg.readyState === WebSocket.OPEN) dg.send(JSON.stringify({ type: 'CloseStream' })); } catch {}
    setTimeout(closeAll, 600);
  });
  client.on('error', closeAll);
}
