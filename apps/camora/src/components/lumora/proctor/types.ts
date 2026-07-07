export type ProctorEventType =
  | 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'COPY' | 'PASTE'
  | 'MULTI_MONITOR' | 'CAMERA_OFF' | 'DEVTOOLS' | 'AUTOMATION' | 'UNSUPPORTED';

export type Severity = 'low' | 'medium' | 'high' | 'info';

export type Action = 'log' | 'warn' | 'block' | 'pause' | 'flag';

export interface ProctorEvent {
  id: string;
  type: ProctorEventType;
  severity: Severity;
  ts: number;
  meta?: Record<string, unknown>;
}

export interface EnforcementState {
  blurCount: number;
  cameraDown: boolean;
}
