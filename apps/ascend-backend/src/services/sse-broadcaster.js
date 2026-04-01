/**
 * SSE Broadcaster Service
 *
 * Pub/sub pattern for Server-Sent Events, inspired by vassist.py's SSEBroadcaster.
 * Manages multiple subscribers and broadcasts events to all connected clients.
 */

import { safeLog } from './utils.js';

class SSEBroadcaster {
  constructor(name = 'default') {
    this.name = name;
    this.subscribers = new Map(); // Map<subscriberId, { res, queue }>
    this.subscriberCounter = 0;
    this.heartbeatInterval = null;
    this.HEARTBEAT_MS = 15000; // Send heartbeat every 15s to keep connection alive
    this.MAX_QUEUE_SIZE = 100;
  }

  /**
   * Start the heartbeat interval
   */
  start() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('ping', { ts: Date.now() });
    }, this.HEARTBEAT_MS);
    safeLog(`[SSE:${this.name}] Broadcaster started`);
  }

  /**
   * Stop the broadcaster and clean up
   */
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    // Close all subscriber connections
    for (const [id, sub] of this.subscribers) {
      try {
        sub.res.end();
      } catch (e) {
        // Ignore errors on cleanup
      }
    }
    this.subscribers.clear();
    safeLog(`[SSE:${this.name}] Broadcaster stopped`);
  }

  /**
   * Subscribe a new client
   * @param {Response} res - Express response object
   * @returns {string} subscriberId
   */
  subscribe(res) {
    const id = `sub_${++this.subscriberCounter}_${Date.now()}`;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.subscribers.set(id, { res, connected: true });

    // Handle client disconnect
    res.on('close', () => {
      this.unsubscribe(id);
    });

    safeLog(`[SSE:${this.name}] Subscriber ${id} connected (total: ${this.subscribers.size})`);

    // Send initial connection event
    this.sendTo(id, 'connected', { subscriberId: id, timestamp: Date.now() });

    return id;
  }

  /**
   * Unsubscribe a client
   * @param {string} id - subscriberId
   */
  unsubscribe(id) {
    const sub = this.subscribers.get(id);
    if (sub) {
      sub.connected = false;
      this.subscribers.delete(id);
      safeLog(`[SSE:${this.name}] Subscriber ${id} disconnected (total: ${this.subscribers.size})`);
    }
  }

  /**
   * Send event to a specific subscriber
   * @param {string} id - subscriberId
   * @param {string} event - event name
   * @param {object} data - event data
   */
  sendTo(id, event, data) {
    const sub = this.subscribers.get(id);
    if (!sub || !sub.connected) return false;

    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      sub.res.write(payload);
      return true;
    } catch (e) {
      safeLog(`[SSE:${this.name}] Error sending to ${id}: ${e.message}`);
      this.unsubscribe(id);
      return false;
    }
  }

  /**
   * Broadcast event to all subscribers
   * @param {string} event - event name
   * @param {object} data - event data
   */
  broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const deadSubscribers = [];

    for (const [id, sub] of this.subscribers) {
      if (!sub.connected) {
        deadSubscribers.push(id);
        continue;
      }

      try {
        sub.res.write(payload);
      } catch (e) {
        deadSubscribers.push(id);
      }
    }

    // Clean up dead subscribers
    for (const id of deadSubscribers) {
      this.unsubscribe(id);
    }
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount() {
    return this.subscribers.size;
  }
}

// Singleton instance for voice events
const voiceBroadcaster = new SSEBroadcaster('voice');

export { SSEBroadcaster, voiceBroadcaster };
