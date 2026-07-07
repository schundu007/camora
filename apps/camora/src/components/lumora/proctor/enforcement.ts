import type { Action, EnforcementState, ProctorEvent, Severity } from './types';

export const INITIAL_STATE: EnforcementState = { blurCount: 0, cameraDown: false };

const BLUR_FLAG_THRESHOLD = 3;

const SEVERITY_WEIGHT: Record<Severity, number> = { info: 0, low: 1, medium: 3, high: 8 };

export const evaluate = (
  event: ProctorEvent,
  state: EnforcementState,
): { actions: Action[]; state: EnforcementState; scoreDelta: number } => {
  const actions: Action[] = ['log'];
  let next: EnforcementState = state;
  let scoreDelta = SEVERITY_WEIGHT[event.severity] ?? 0;

  switch (event.type) {
    case 'WINDOW_BLUR':
    case 'TAB_HIDDEN': {
      const blurCount = state.blurCount + 1;
      next = { ...state, blurCount };
      actions.push('warn');
      if (blurCount >= BLUR_FLAG_THRESHOLD) {
        actions.push('flag');
        scoreDelta += 5;
      }
      break;
    }
    case 'FULLSCREEN_EXIT':
      actions.push('block');
      break;
    case 'MULTI_MONITOR':
      actions.push('block');
      break;
    case 'CAMERA_OFF':
      next = { ...state, cameraDown: true };
      actions.push('pause');
      break;
    case 'DEVTOOLS':
    case 'AUTOMATION':
      actions.push('flag', 'warn');
      break;
    case 'PASTE':
      actions.push('warn');
      break;
    case 'COPY':
    case 'UNSUPPORTED':
    default:
      break;
  }

  return { actions, state: next, scoreDelta };
};
