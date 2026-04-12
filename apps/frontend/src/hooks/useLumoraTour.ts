import { useEffect } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

const TOUR_KEY = 'lumora_toured';

export function useLumoraTour() {
  useEffect(() => {
    // Show tour on every fresh login (session-based, not permanent)
    if (sessionStorage.getItem(TOUR_KEY)) return;

    // Wait for header to render
    const timer = setTimeout(() => {
      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          cancelIcon: { enabled: true },
          scrollTo: false,
          classes: 'lumora-tour-step',
        },
      });

      tour.addStep({
        id: 'tabs',
        text: '<strong>Interview Modes</strong><br/>Switch between Interview (system design, behavioral), Coding (full code editor), and Design (architecture diagrams).',
        attachTo: { element: '[data-tour="tabs"]', on: 'bottom' },
        buttons: [
          { text: 'Skip', action: tour.complete, classes: 'shepherd-button-secondary' },
          { text: 'Next', action: tour.next },
        ],
      });

      tour.addStep({
        id: 'platform',
        text: '<strong>Platform</strong><br/>Select your interview platform (Zoom, Google Meet, MS Teams, HackerRank, etc.) for optimized behavior.',
        attachTo: { element: '[data-tour="platform"]', on: 'bottom' },
        buttons: [
          { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
          { text: 'Next', action: tour.next },
        ],
      });

      tour.addStep({
        id: 'audio',
        text: '<strong>Audio Modes</strong><br/><strong>Live:</strong> always listening, auto-transcribes the interviewer.<br/><strong>Manual:</strong> press Record or Cmd+M to capture specific questions.<br/><strong>Calibrate:</strong> adjust mic sensitivity to your environment.',
        attachTo: { element: '[data-tour="audio"]', on: 'bottom' },
        buttons: [
          { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
          { text: 'Next', action: tour.next },
        ],
      });

      tour.addStep({
        id: 'voice-filter',
        text: '<strong>Voice Filter (Key Feature)</strong><br/>Click <strong>My Voice</strong> to record 5 seconds of yourself speaking. Camora will learn your voice and <strong>automatically filter it out</strong> — only your <strong>interviewer\'s questions</strong> get transcribed and answered.<br/><br/>Works with both:<br/>- <strong>Microphone:</strong> for in-person or speakerphone interviews<br/>- <strong>Interviewer button:</strong> captures audio from Zoom/Meet/Teams screen share<br/><br/>Two-speaker diarization identifies who is speaking in real-time.',
        attachTo: { element: '[data-tour="audio"]', on: 'bottom' },
        buttons: [
          { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
          { text: 'Next', action: tour.next },
        ],
      });

      tour.addStep({
        id: 'input',
        text: '<strong>Question Input</strong><br/>Type or paste a question here. Press Enter to send. Click the expand icon for multi-line input (coding problems). Press Cmd+K to focus.',
        attachTo: { element: '[data-tour="input"]', on: 'top' },
        buttons: [
          { text: 'Back', action: tour.back, classes: 'shepherd-button-secondary' },
          { text: 'Got it!', action: tour.complete },
        ],
      });

      tour.on('complete', () => {
        sessionStorage.setItem(TOUR_KEY, '1');
      });

      tour.on('cancel', () => {
        sessionStorage.setItem(TOUR_KEY, '1');
      });

      // Only start if the elements exist
      if (document.querySelector('[data-tour="tabs"]')) {
        tour.start();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);
}
