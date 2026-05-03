/**
 * Activity tracker — singleton that manages session lifecycle,
 * page view tracking, and feature event tracking.
 *
 * Uses fire-and-forget fetch for non-critical tracking calls.
 * Uses navigator.sendBeacon for session end on page unload.
 */

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

class ActivityTracker {
  private sessionId: string | null = null;
  private token: string | null = null;
  private currentPage: string | null = null;
  private pageEnteredAt: number = 0;
  private started = false;

  /**
   * Initialize the tracker with the user's auth token.
   * Starts a new session and sets up beforeunload handler.
   */
  async init(token: string) {
    if (this.started || !token) return;
    this.token = token;
    this.started = true;

    try {
      const resp = await fetch(`${API_URL}/api/v1/activity/sessions`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        this.sessionId = data.session_id;
      }
    } catch {
      // Silently fail — tracking is non-critical
    }

    // End session on page unload
    window.addEventListener('beforeunload', this.handleUnload);
  }

  /** Clean up — remove event listener */
  destroy() {
    window.removeEventListener('beforeunload', this.handleUnload);
    this.endSession();
    this.started = false;
    this.sessionId = null;
    this.token = null;
  }

  private handleUnload = () => {
    this.endSession();
  };

  private endSession() {
    if (!this.sessionId || !this.token) return;
    // Use fetch with keepalive for reliable delivery on unload
    // (sendBeacon cannot send Authorization headers)
    const url = `${API_URL}/api/v1/activity/sessions/${this.sessionId}/end`;
    fetch(url, {
      credentials: 'include',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      keepalive: true,
    }).catch(() => {});
  }

  /**
   * Track a page navigation. Call on every route change.
   * Includes duration for the previous page in the new page view request.
   */
  trackPageView(page: string, path: string) {
    if (!this.token) return;

    // Calculate duration of previous page
    let prevDuration: number | undefined;
    if (this.currentPage && this.pageEnteredAt) {
      prevDuration = Math.round((Date.now() - this.pageEnteredAt) / 1000);
      if (prevDuration < 1) prevDuration = undefined;
    }

    // Record new page (includes prev duration as metadata — single row per page visit)
    this.currentPage = page;
    this.pageEnteredAt = Date.now();

    // Fire and forget
    fetch(`${API_URL}/api/v1/activity/page-views`, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        page,
        path,
        session_id: this.sessionId,
        duration_seconds: prevDuration,
      }),
    }).catch(() => {});
  }

  /**
   * Track a feature usage event. Fire and forget.
   */
  trackEvent(
    eventType: string,
    category?: string,
    metadata?: Record<string, any>
  ) {
    if (!this.token) return;

    fetch(`${API_URL}/api/v1/activity/events`, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        category,
        metadata,
        session_id: this.sessionId,
      }),
    }).catch(() => {});
  }

  /** Check if tracker is active */
  get isActive() {
    return this.started && !!this.sessionId;
  }
}

// Singleton instance
export const activityTracker = new ActivityTracker();
