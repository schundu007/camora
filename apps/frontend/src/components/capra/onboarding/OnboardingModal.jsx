import { useState } from 'react';

const ONBOARDING_KEY = 'ascend_onboarding_completed';

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding() {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

/**
 * Mark onboarding as completed
 */
export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

/**
 * Reset onboarding (for testing)
 */
export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}

/**
 * Onboarding Modal Component - Landing Page Design System
 */
export default function OnboardingModal({ isOpen, onComplete, onOpenPricing }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to Ascend',
      subtitle: 'Your AI-Powered Interview Prep Assistant',
      icon: (
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow bg-gradient-to-br from-emerald-500 to-emerald-600"
          style={{
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)'
          }}
        >
          <img
            src="/ascend-logo.png"
            alt="Ascend"
            className="h-14 w-auto object-contain filter brightness-0 invert"
          />
        </div>
      ),
      content: (
        <div className="space-y-6">
          <p className="text-center text-base text-[var(--text-muted)] landing-body">
            Ascend helps you prepare for technical interviews with AI-powered assistance
            for coding challenges, system design, and behavioral questions.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div
              className="text-center p-4 rounded-lg transition-all hover:scale-105 bg-emerald-50 border border-emerald-200"
            >
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center bg-emerald-100">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-emerald-500 landing-body">Coding</div>
            </div>
            <div
              className="text-center p-4 rounded-lg transition-all hover:scale-105 bg-cyan-50 border border-cyan-200"
            >
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center bg-cyan-100">
                <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-cyan-500 landing-body">System Design</div>
            </div>
            <div
              className="text-center p-4 rounded-lg transition-all hover:scale-105 bg-emerald-50 border border-emerald-200"
            >
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center bg-emerald-100">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-emerald-500 landing-body">Behavioral</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'How It Works',
      subtitle: 'Three simple steps to ace your interview',
      icon: (
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-cyan-100">
          <svg className="w-10 h-10 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      ),
      content: (
        <div className="space-y-4">
          {[
            { num: 1, color: '#10b981', title: 'Input Your Problem', desc: 'Paste code, upload screenshots, or share URLs from LeetCode, HackerRank, and more.' },
            { num: 2, color: '#06b6d4', title: 'Get AI-Powered Solutions', desc: 'Receive optimized code solutions with detailed explanations and complexity analysis.' },
            { num: 3, color: '#10b981', title: 'Practice & Improve', desc: 'Use follow-up questions, run code, and track your progress across sessions.' },
          ].map((step, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 rounded-lg transition-all hover:scale-[1.02] bg-[var(--bg-elevated)] border border-[var(--border)]"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg font-bold text-white"
                style={{ background: step.color }}
              >
                {step.num}
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-[var(--text-primary)] landing-body">{step.title}</h4>
                <p className="text-sm text-[var(--text-muted)] landing-body">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Company Interview Prep',
      subtitle: 'Targeted preparation for specific companies',
      icon: (
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-emerald-100">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      ),
      content: (
        <div className="space-y-4">
          <p className="text-[var(--text-muted)] landing-body">
            Create personalized interview prep materials for any company. Get AI-generated:
          </p>
          <div className="space-y-2">
            {[
              'Company-specific interview questions',
              'Culture and values alignment tips',
              'Technical topics to focus on',
              'Behavioral STAR stories',
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]"
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-100">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[var(--text-muted)] landing-body">{item}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Credits System',
      subtitle: 'Simple and transparent pricing',
      icon: (
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-emerald-100">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      content: (
        <div className="space-y-4">
          <p className="text-[var(--text-muted)] landing-body">
            Each credit allows you to create one company interview preparation package.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div
              className="p-4 rounded-lg text-center relative overflow-hidden bg-emerald-50 border border-emerald-200"
            >
              <div className="text-2xl font-bold text-[var(--text-primary)] landing-display">$29</div>
              <div className="text-sm font-medium text-emerald-500 landing-body">Interview Ready</div>
              <div className="text-xs mt-2 text-[var(--text-muted)] landing-body">/month</div>
            </div>
            <div
              className="p-4 rounded-lg text-center relative overflow-hidden bg-cyan-50 border border-cyan-200"
            >
              <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white landing-mono">POPULAR</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] landing-display">$49</div>
              <div className="text-sm font-medium text-cyan-500 landing-body">Pro</div>
              <div className="text-xs mt-2 text-[var(--text-muted)] landing-body">/month</div>
            </div>
            <div
              className="p-4 rounded-lg text-center bg-violet-50 border border-violet-200"
            >
              <div className="text-2xl font-bold text-[var(--text-primary)] landing-display">$99</div>
              <div className="text-sm font-medium text-violet-400 landing-body">Elite</div>
              <div className="text-xs mt-2 text-[var(--text-muted)] landing-body">/month</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "You're All Set!",
      subtitle: 'Start your interview prep journey',
      icon: (
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-float bg-gradient-to-br from-emerald-500 to-emerald-600" style={{ boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }}>
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      ),
      content: (
        <div className="space-y-6 text-center">
          <p className="text-[var(--text-muted)] landing-body">
            You're ready to start preparing for your dream job interviews.
            Get credits to unlock company-specific prep materials.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                markOnboardingComplete();
                onOpenPricing?.();
                onComplete();
              }}
              className="bg-emerald-500 text-white font-semibold text-sm rounded hover:bg-emerald-600 landing-body w-full py-4 text-base"
            >
              Get Credits & Start
            </button>
            <button
              onClick={() => {
                markOnboardingComplete();
                onComplete();
              }}
              className="btn-secondary w-full py-4 landing-body"
            >
              Explore First
            </button>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      markOnboardingComplete();
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 15, 20, 0.95)', backdropFilter: 'blur(8px)' }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none opacity-50" />

      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-scale-in glass-card"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 30px rgba(16, 185, 129, 0.15)',
        }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-[var(--bg-elevated)]">
          <div
            className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          {currentStepData.icon}

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2 landing-display">
              <span className="text-emerald-500">{currentStepData.title}</span>
            </h2>
            <p className="text-[var(--text-muted)] landing-body">{currentStepData.subtitle}</p>
          </div>

          {/* Step content */}
          <div className="min-h-[260px] animate-fade-in" key={currentStep}>
            {currentStepData.content}
          </div>

          {/* Navigation */}
          {!isLastStep && (
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={handleSkip}
                className="text-sm transition-colors hover:opacity-80 text-[var(--text-muted)] landing-body"
              >
                Skip intro
              </button>

              <div className="flex items-center gap-3">
                {!isFirstStep && (
                  <button
                    onClick={handlePrev}
                    className="btn-secondary px-5 py-2.5 landing-body"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="bg-emerald-500 text-white font-semibold text-sm rounded hover:bg-emerald-600 landing-body px-6 py-2.5"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: index === currentStep ? '#10b981' : '#e5e7eb',
                  transform: index === currentStep ? 'scale(1.5)' : 'scale(1)',
                  boxShadow: index === currentStep ? '0 0 8px #10b981' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
