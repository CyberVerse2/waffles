"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { ASSETS, Confetti, PixelImg } from "../shared";
import {
  onboardStore,
  type OnboardStep,
  type SampleResult,
  type VerifyStatus,
} from "./storage";
import { useWorldSignIn } from "./use-world-auth";
import { useVerifyHuman, type VerifyLevel } from "./use-verify";

// ─────────────────────────────────────────────────────────────────────────────
// Hero question for the onboarding sample round.
// Hand-picked: a satisfying "huh, never noticed" moment with a near-miss
// distractor (FIVE has 4 letters but its value is 5). Broadly knowable, not
// culturally narrow. See open question #1 in the design brief.
// ─────────────────────────────────────────────────────────────────────────────
const HERO_QUESTION = {
  prompt: "Only one number is spelled with the same number of letters as its value. Which one?",
  answers: ["THREE", "FOUR", "FIVE", "SEVEN"],
  correct: 1,
  reveal: "FOUR — F·O·U·R. The only number that matches.",
} as const;

const SAMPLE_TIMER_SEC = 10;
const FEEDBACK_DURATION_MS = 1500;
const COUNTDOWN_DURATION_MS = 1400;
const ONBOARD_XP_REWARD = 50;
const VERIFY_XP_REWARD = 100;

type CurrentStep = "hook" | "countdown" | "sample" | "feedback" | "result" | "verify";

type OnboardingControls = {
  // Re-launch the sample-then-result flow (for users who skipped the teaser)
  relaunchSample: () => void;
  // Re-launch the verify step (for users who dismissed it)
  relaunchVerify: () => void;
  // True once the sample round was played (for Home mission card)
  sampleComplete: boolean;
  verifyStatus: VerifyStatus | null;
};

const OnboardingContext = createContext<OnboardingControls | null>(null);

export function useOnboardingControls(): OnboardingControls {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    // Not yet mounted — return a no-op fallback so consumers don't crash if
    // they render before OnboardingFlow does (shouldn't happen, but defensive).
    return {
      relaunchSample: () => {},
      relaunchVerify: () => {},
      sampleComplete: false,
      verifyStatus: null,
    };
  }
  return ctx;
}

export function OnboardingFlow({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const isAuthed = Boolean(session?.user?.address);

  // Hydration
  const [hydrated, setHydrated] = useState(false);
  const [storedStep, setStoredStep] = useState<OnboardStep | null>(null);
  const [sampleResult, setSampleResult] = useState<SampleResult | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus | null>(null);

  // UI state
  const [currentStep, setCurrentStep] = useState<CurrentStep>("hook");
  const [skipSheetOpen, setSkipSheetOpen] = useState(false);
  const [reLaunchActive, setReLaunchActive] = useState<"sample" | "verify" | null>(null);

  // Auth + verify hooks (used inside steps 3 and 4)
  const { signIn, isSigningIn, error: authError, isInstalled, clearError } = useWorldSignIn();
  const { check: checkVerify, isChecking, error: verifyError } = useVerifyHuman();
  const [verifySuccess, setVerifySuccess] = useState<VerifyLevel | null>(null);

  // ── Hydrate from storage on mount ──────────────────────────────────────────
  useEffect(() => {
    setStoredStep(onboardStore.getStep());
    setSampleResult(onboardStore.getSample());
    setVerifyStatus(onboardStore.getVerify());
    setHydrated(true);
  }, []);

  // ── Auto-mark onboarding complete for legacy authed users with no storage ─
  useEffect(() => {
    if (!hydrated) return;
    if (isAuthed && storedStep === null) {
      onboardStore.setStep("complete");
      setStoredStep("complete");
    }
  }, [hydrated, isAuthed, storedStep]);

  // ── If session arrives mid-flow (after step 3 sign-in), advance to verify ─
  useEffect(() => {
    if (!hydrated) return;
    if (currentStep === "result" && isAuthed) {
      // Sign-in just landed. Mark onboarding complete and move to step 4.
      onboardStore.setStep("complete");
      setStoredStep("complete");
      setCurrentStep("verify");
    }
  }, [isAuthed, currentStep, hydrated]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const startSample = useCallback(() => {
    onboardStore.setStep("sample");
    setStoredStep("sample");
    setCurrentStep("countdown");
  }, []);

  const onSampleAnswered = useCallback((picked: number, correct: boolean) => {
    onboardStore.setSample(picked, correct);
    setSampleResult({ picked, correct });
    setCurrentStep("feedback");
  }, []);

  const advanceToResult = useCallback(() => {
    onboardStore.setStep("result");
    setStoredStep("result");
    setCurrentStep("result");
  }, []);

  const handleSignIn = useCallback(async () => {
    const result = await signIn();
    if (result.ok) {
      // The useEffect above watches `isAuthed` and will move us to "verify".
      // If we're in re-launch mode, finishing here just closes the flow.
      if (reLaunchActive === "sample") {
        setReLaunchActive(null);
      }
    }
  }, [signIn, reLaunchActive]);

  const handleSkipFromPreAuth = useCallback(() => {
    onboardStore.setStep("skipped");
    setStoredStep("skipped");
    setSkipSheetOpen(false);
    setReLaunchActive(null);
  }, []);

  const handleVerify = useCallback(async () => {
    const result = await checkVerify();
    if (result.ok) {
      onboardStore.setVerify("verified");
      setVerifyStatus("verified");
      setVerifySuccess(result.level);
      // Brief celebration, then exit.
      setTimeout(() => {
        setReLaunchActive(null);
      }, 1600);
    }
  }, [checkVerify]);

  const handleVerifyDismiss = useCallback(() => {
    onboardStore.setVerify("dismissed");
    setVerifyStatus("dismissed");
    setSkipSheetOpen(false);
    setReLaunchActive(null);
  }, []);

  const relaunchSample = useCallback(() => {
    clearError();
    setVerifySuccess(null);
    setReLaunchActive("sample");
    setCurrentStep("hook");
  }, [clearError]);

  const relaunchVerify = useCallback(() => {
    clearError();
    setVerifySuccess(null);
    setReLaunchActive("verify");
    setCurrentStep("verify");
  }, [clearError]);

  const controls = useMemo<OnboardingControls>(
    () => ({
      relaunchSample,
      relaunchVerify,
      sampleComplete: sampleResult !== null,
      verifyStatus,
    }),
    [relaunchSample, relaunchVerify, sampleResult, verifyStatus]
  );

  // ── What to render ────────────────────────────────────────────────────────
  const showOnboarding = (() => {
    if (!hydrated) return false;
    if (sessionStatus === "loading") return false;
    if (reLaunchActive) return true;

    if (!isAuthed) {
      // Pre-auth: show flow unless they've explicitly skipped it.
      return storedStep !== "skipped" && storedStep !== "complete";
    }
    // Post-auth: show verify step until verifyStatus is set.
    return verifyStatus === null;
  })();

  if (!showOnboarding) {
    return (
      <OnboardingContext.Provider value={controls}>
        {children}
      </OnboardingContext.Provider>
    );
  }

  // Decide which step component to render. For post-auth users without a
  // saved currentStep transition, jump straight to "verify".
  const effectiveStep: CurrentStep = (() => {
    if (reLaunchActive === "verify") return "verify";
    if (isAuthed && currentStep !== "verify") return "verify";
    return currentStep;
  })();

  return (
    <OnboardingContext.Provider value={controls}>
      <div className="onboard-frame waffles-v2-frame">
        <div className="onboard-bg" />
        {effectiveStep === "hook" && (
          <HookStep
            onPlay={startSample}
            onSkip={() => setSkipSheetOpen(true)}
            isReLaunch={reLaunchActive === "sample"}
          />
        )}
        {effectiveStep === "countdown" && (
          <CountdownStep onDone={() => setCurrentStep("sample")} />
        )}
        {effectiveStep === "sample" && (
          <SampleStep
            onAnswered={onSampleAnswered}
            onSkip={() => setSkipSheetOpen(true)}
          />
        )}
        {effectiveStep === "feedback" && sampleResult && (
          <FeedbackStep result={sampleResult} onDone={advanceToResult} />
        )}
        {effectiveStep === "result" && (
          <ResultStep
            sampleCorrect={sampleResult?.correct ?? false}
            isSigningIn={isSigningIn}
            error={authError}
            isInstalled={isInstalled}
            onSignIn={handleSignIn}
            onSkip={() => setSkipSheetOpen(true)}
          />
        )}
        {effectiveStep === "verify" && (
          <VerifyStep
            isChecking={isChecking}
            error={verifyError}
            success={verifySuccess}
            onVerify={handleVerify}
            onDismiss={() => setSkipSheetOpen(true)}
            sampleEarnedXp={sampleResult !== null}
          />
        )}
        {skipSheetOpen && (
          <SkipSheet
            mode={effectiveStep === "verify" ? "verify" : "onboarding"}
            onConfirm={
              effectiveStep === "verify" ? handleVerifyDismiss : handleSkipFromPreAuth
            }
            onClose={() => setSkipSheetOpen(false)}
          />
        )}
      </div>
    </OnboardingContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Hook — pre-auth hype card
// ─────────────────────────────────────────────────────────────────────────────
function HookStep({
  onPlay,
  onSkip,
  isReLaunch,
}: {
  onPlay: () => void;
  onSkip: () => void;
  isReLaunch: boolean;
}) {
  const playerCount = useTickingNumber(2418, 2520, 4000);
  const tournamentClock = useCountdownClock();

  return (
    <div className="onboard-step onboard-step-hook">
      <SkipButton onClick={onSkip} />

      <div className="onboard-watermark" aria-hidden="true">WAFFLES</div>

      <div className="onboard-hook-body">
        <div className="onboard-chip-row">
          <span className="onboard-live-chip">
            <span className="onboard-live-dot" />
            LIVE NOW
          </span>
          <span className="onboard-counter">
            <span className="onboard-counter-num">{playerCount.toLocaleString()}</span>
            <span className="onboard-counter-label">PLAYING</span>
          </span>
        </div>

        <h1 className="onboard-headline">
          REAL TRIVIA.
          <br />
          REAL PRIZES.
          <br />
          <span className="onboard-headline-accent">RIGHT NOW.</span>
        </h1>

        <div className="onboard-tournament-card">
          <div className="onboard-tournament-label">TOP OF THE HOUR</div>
          <div className="onboard-tournament-clock" aria-live="off">
            <ClockDigit value={tournamentClock.minutes} label="MIN" />
            <span className="onboard-clock-sep">:</span>
            <ClockDigit value={tournamentClock.seconds} label="SEC" />
          </div>
          <div className="onboard-tournament-meta">12 questions · 90s · prize pool</div>
        </div>

        <div className="onboard-mascot-row">
          <PixelImg src={ASSETS.wally} size={88} alt="" />
          <div className="onboard-bubble">
            {isReLaunch
              ? "Good to see you back. Same drill — one question."
              : "I'll show you. One question, ten seconds. Ready?"}
          </div>
        </div>
      </div>

      <div className="onboard-cta-bar">
        <button type="button" className="onboard-cta onboard-cta-primary" onClick={onPlay}>
          {isReLaunch ? "REPLAY THE ROUND" : "PLAY ONE"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1.5: Countdown — 3-2-1 between hook and sample
// ─────────────────────────────────────────────────────────────────────────────
function CountdownStep({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n <= 0) {
      const t = setTimeout(onDone, 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((v) => v - 1), COUNTDOWN_DURATION_MS / 4);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div className="onboard-step onboard-step-countdown">
      <div className="onboard-countdown-num" key={n}>
        {n > 0 ? n : "GO"}
      </div>
      <div className="onboard-countdown-caption">GET READY</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Sample — one timed question
// ─────────────────────────────────────────────────────────────────────────────
function SampleStep({
  onAnswered,
  onSkip,
}: {
  onAnswered: (picked: number, correct: boolean) => void;
  onSkip: () => void;
}) {
  const [timer, setTimer] = useState(SAMPLE_TIMER_SEC);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    startedAt.current = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      const remaining = Math.max(0, SAMPLE_TIMER_SEC - elapsed);
      setTimer(remaining);
      if (remaining <= 0) {
        onAnswered(-1, false);
      }
    };
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [onAnswered]);

  const handlePick = (idx: number) => {
    const correct = idx === HERO_QUESTION.correct;
    onAnswered(idx, correct);
  };

  const ringPct = Math.max(0, Math.min(100, (timer / SAMPLE_TIMER_SEC) * 100));
  const timerLow = timer <= 3;

  return (
    <div className="onboard-step onboard-step-sample">
      <SkipButton onClick={onSkip} />

      <div className="onboard-sample-head">
        <span className="onboard-step-chip">ROUND 1</span>
        <div className={"onboard-timer-bar" + (timerLow ? " low" : "")} aria-live="off">
          <div className="onboard-timer-fill" style={{ width: `${ringPct}%` }} />
          <span className="onboard-timer-label">
            {Math.ceil(timer)}s
          </span>
        </div>
      </div>

      <div className="onboard-question">
        <div className="onboard-question-cat">CATEGORY · WORDS</div>
        <h2 className="onboard-question-text">{HERO_QUESTION.prompt}</h2>
      </div>

      <div className="onboard-answer-grid">
        {HERO_QUESTION.answers.map((answer, idx) => (
          <button
            key={idx}
            type="button"
            className="onboard-answer pressable"
            onClick={() => handlePick(idx)}
          >
            <span className="onboard-answer-key">{String.fromCharCode(65 + idx)}</span>
            <span className="onboard-answer-text">{answer}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2.5: Feedback — brief reaction (correct/wrong/timeout)
// ─────────────────────────────────────────────────────────────────────────────
function FeedbackStep({
  result,
  onDone,
}: {
  result: SampleResult;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, FEEDBACK_DURATION_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  const isTimeout = result.picked === -1;
  const correctText = HERO_QUESTION.answers[HERO_QUESTION.correct];

  return (
    <div className={"onboard-step onboard-step-feedback " + (result.correct ? "correct" : "missed")}>
      {result.correct && <Confetti pieces={28} />}

      <div className="onboard-feedback-icon" aria-hidden="true">
        {result.correct ? (
          <svg viewBox="0 0 80 80" width="120" height="120">
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" />
            <path d="M22 42 L36 56 L60 28" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 80 80" width="120" height="120">
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" />
            <path d="M28 28 L52 52 M52 28 L28 52" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <div className="onboard-feedback-headline">
        {result.correct ? "NICE." : isTimeout ? "RAN OUT." : "CLOSE."}
      </div>
      <div className="onboard-feedback-sub">
        {result.correct
          ? `+${ONBOARD_XP_REWARD} XP locked in.`
          : isTimeout
            ? `It was ${correctText}. Still +${ONBOARD_XP_REWARD} XP.`
            : `It was ${correctText}. Still +${ONBOARD_XP_REWARD} XP.`}
      </div>
      {!result.correct && (
        <div className="onboard-feedback-reveal">{HERO_QUESTION.reveal}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Result — sign-in conversion
// ─────────────────────────────────────────────────────────────────────────────
function ResultStep({
  sampleCorrect,
  isSigningIn,
  error,
  isInstalled,
  onSignIn,
  onSkip,
}: {
  sampleCorrect: boolean;
  isSigningIn: boolean;
  error: string | null;
  isInstalled: boolean | undefined;
  onSignIn: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="onboard-step onboard-step-result">
      <SkipButton onClick={onSkip} disabled={isSigningIn} />

      <div className="onboard-result-head">
        <span className="onboard-step-chip">ROUND COMPLETE</span>
      </div>

      <div className="onboard-reward-stack">
        <div className="onboard-reward-headline">YOU JUST EARNED</div>
        <div className="onboard-reward-amount">+{ONBOARD_XP_REWARD}<span className="onboard-reward-unit">XP</span></div>

        <div className="onboard-reward-tokens">
          <LockedReward
            icon={<PixelImg src={ASSETS.xpGem} size={56} alt="" />}
            label={`${ONBOARD_XP_REWARD} XP`}
          />
          <LockedReward
            icon={<PixelImg src={ASSETS.ticket} size={56} alt="" />}
            label="1 TICKET"
          />
        </div>

        <div className="onboard-reward-caption">
          {sampleCorrect
            ? "Sign in with World to claim your XP and your first ticket."
            : "Sign in anyway — we round up. XP and a ticket on us."}
        </div>
      </div>

      <div className="onboard-cta-bar onboard-cta-bar-stacked">
        <button
          type="button"
          className="onboard-cta onboard-cta-primary"
          onClick={onSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? "SIGNING IN…" : "SIGN IN WITH WORLD"}
        </button>
        <button
          type="button"
          className="onboard-cta-text"
          onClick={onSkip}
          disabled={isSigningIn}
        >
          Maybe later
        </button>
        {isInstalled === false && (
          <p className="onboard-result-note">Open Waffles inside World App to sign in.</p>
        )}
        {error && <p className="onboard-result-error">{error}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Verify — humanness check (post-auth)
// ─────────────────────────────────────────────────────────────────────────────
function VerifyStep({
  isChecking,
  error,
  success,
  onVerify,
  onDismiss,
  sampleEarnedXp,
}: {
  isChecking: boolean;
  error: string | null;
  success: VerifyLevel | null;
  onVerify: () => void;
  onDismiss: () => void;
  sampleEarnedXp: boolean;
}) {
  if (success) {
    return (
      <div className="onboard-step onboard-step-verify success">
        <Confetti pieces={42} />
        <div className="onboard-verify-success-graphic" aria-hidden="true">
          <PixelImg src={ASSETS.trophy} size={108} alt="" />
        </div>
        <div className="onboard-verify-headline">YOU'RE IN.</div>
        <div className="onboard-verify-sub">
          Tournaments unlocked. {sampleEarnedXp ? `+${VERIFY_XP_REWARD} XP credited.` : ""}
        </div>
      </div>
    );
  }

  return (
    <div className="onboard-step onboard-step-verify">
      <SkipButton onClick={onDismiss} disabled={isChecking} />

      <div className="onboard-verify-head">
        <span className="onboard-step-chip">LAST STEP</span>
      </div>

      <div className="onboard-verify-graphic">
        <div className="onboard-verify-trophy-stack">
          <PixelImg src={ASSETS.trophy} size={96} alt="" />
          <PixelImg src={ASSETS.ticket} size={64} alt="" style={{ marginLeft: -12 }} />
        </div>
        <div className="onboard-verify-locked-overlay" aria-hidden="true">
          <PixelImg src={ASSETS.lock} size={36} alt="" />
        </div>
      </div>

      <div className="onboard-verify-text">
        <h2 className="onboard-verify-headline">PLAY FOR REAL PRIZES</h2>
        <p className="onboard-verify-sub">
          Tournaments pay real prizes, so we need to know each player is one human.
          One quick check with World ID.
        </p>
      </div>

      <div className="onboard-cta-bar onboard-cta-bar-stacked">
        <button
          type="button"
          className="onboard-cta onboard-cta-leaf"
          onClick={onVerify}
          disabled={isChecking}
        >
          {isChecking ? "CHECKING…" : "VERIFY WITH WORLD ID"}
        </button>
        <button
          type="button"
          className="onboard-cta-text"
          onClick={onDismiss}
          disabled={isChecking}
        >
          Maybe later
        </button>
        {error && <p className="onboard-result-error">{error}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skip confirmation sheet (bottom)
// ─────────────────────────────────────────────────────────────────────────────
function SkipSheet({
  mode,
  onConfirm,
  onClose,
}: {
  mode: "onboarding" | "verify";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isVerify = mode === "verify";
  return (
    <div className="onboard-skip-backdrop" onClick={onClose}>
      <div
        className="onboard-skip-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-skip-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="onboard-skip-handle" aria-hidden="true" />
        <h3 id="onboard-skip-title" className="onboard-skip-title">
          {isVerify ? "Skip verification?" : "Finish later?"}
        </h3>
        <p className="onboard-skip-body">
          {isVerify
            ? `You can play levels and earn XP without it. Find "Verify yourself" in Daily Missions for +${VERIFY_XP_REWARD} XP whenever you're ready.`
            : `You'll find "Finish setup" in Daily Missions for +${ONBOARD_XP_REWARD} XP whenever you want to come back.`}
        </p>
        <div className="onboard-skip-actions">
          <button
            type="button"
            className="onboard-cta onboard-cta-secondary"
            onClick={onConfirm}
          >
            {isVerify ? "SKIP FOR NOW" : "FINISH LATER"}
          </button>
          <button type="button" className="onboard-cta-text" onClick={onClose}>
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────────────
function SkipButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="onboard-skip"
      onClick={onClick}
      disabled={disabled}
      aria-label="Skip onboarding"
    >
      Skip
    </button>
  );
}

function LockedReward({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="onboard-locked-reward" aria-label={`Locked reward: ${label}`}>
      <div className="onboard-locked-reward-icon">{icon}</div>
      <div className="onboard-locked-reward-label">{label}</div>
      <div className="onboard-locked-reward-lock" aria-hidden="true">
        <PixelImg src={ASSETS.lock} size={20} alt="" />
      </div>
    </div>
  );
}

function ClockDigit({ value, label }: { value: string; label: string }) {
  return (
    <div className="onboard-clock-digit">
      <div className="onboard-clock-value">{value}</div>
      <div className="onboard-clock-label">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny utilities
// ─────────────────────────────────────────────────────────────────────────────

// Number that ticks up periodically — adds life to the "players in" counter.
function useTickingNumber(start: number, end: number, intervalMs: number) {
  const [n, setN] = useState(start);
  useEffect(() => {
    const t = setInterval(() => {
      setN((curr) => {
        if (curr >= end) return start;
        return curr + 1 + Math.floor(Math.random() * 3);
      });
    }, intervalMs);
    return () => clearInterval(t);
  }, [start, end, intervalMs]);
  return n;
}

// Mocked "next tournament" countdown — a 17-minute window that resets when
// it hits zero. See open question #5: the real source can be wired later.
function useCountdownClock() {
  const [seconds, setSeconds] = useState(17 * 60 + 42);
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => (s <= 1 ? 17 * 60 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return {
    minutes: m.toString().padStart(2, "0"),
    seconds: s.toString().padStart(2, "0"),
  };
}
