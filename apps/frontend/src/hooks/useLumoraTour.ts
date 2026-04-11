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
        text: '<strong>Audio Controls</strong><br/><strong>Live:</strong> always listening, auto-transcribes.<br/><strong>Manual:</strong> press Record or Cmd+M.<br/><strong>My Voice:</strong> enroll to filter out your voice.<br/><strong>Calibrate:</strong> adjust mic sensitivity.<br/><strong>Interviewer:</strong> capture from Zoom/Meet screen share.<br/><strong>Docs:</strong> upload prep documents for context.',
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
