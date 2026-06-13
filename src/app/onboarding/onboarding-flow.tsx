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
import {
  onboardStore,
  type OnboardStep,
  type SampleResult,
  type VerifyStatus,
} from "./storage";
import { useWorldSignIn } from "./use-world-auth";
import { useVerifyHuman, type VerifyLevel } from "./use-verify";

// ─────────────────────────────────────────────────────────────────────────────
// Hero question — hand-picked. A satisfying "huh, never noticed" with a
// near-miss distractor (FIVE has 4 letters but value is 5). Broadly knowable,
// not culturally narrow. See open question #1 in the design brief.
// ─────────────────────────────────────────────────────────────────────────────
const HERO_QUESTION = {
  prompt: "Only one number is spelled with the same number of letters as its value. Which one?",
  answers: ["Three", "Four", "Five", "Seven"],
  correct: 1,
  reveal: "Four — F·O·U·R. The only one that matches.",
} as const;

const SAMPLE_TIMER_SEC = 10;
const FEEDBACK_DURATION_MS = 1500;
const COUNTDOWN_DURATION_MS = 1400;
const ONBOARD_XP_REWARD = 50;
const VERIFY_XP_REWARD = 100;

type CurrentStep = "hook" | "countdown" | "sample" | "feedback" | "result" | "verify";

type OnboardingControls = {
  relaunchSample: () => void;
  relaunchVerify: () => void;
  sampleComplete: boolean;
  verifyStatus: VerifyStatus | null;
};

const OnboardingContext = createContext<OnboardingControls | null>(null);

export function useOnboardingControls(): OnboardingControls {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
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

  const [hydrated, setHydrated] = useState(false);
  const [storedStep, setStoredStep] = useState<OnboardStep | null>(null);
  const [sampleResult, setSampleResult] = useState<SampleResult | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus | null>(null);

  const [currentStep, setCurrentStep] = useState<CurrentStep>("hook");
  const [skipSheetOpen, setSkipSheetOpen] = useState(false);
  const [reLaunchActive, setReLaunchActive] = useState<"sample" | "verify" | null>(null);

  const { signIn, isSigningIn, error: authError, isInstalled, clearError } = useWorldSignIn();
  const { check: checkVerify, isChecking, error: verifyError } = useVerifyHuman();
  const [verifySuccess, setVerifySuccess] = useState<VerifyLevel | null>(null);

  useEffect(() => {
    setStoredStep(onboardStore.getStep());
    setSampleResult(onboardStore.getSample());
    setVerifyStatus(onboardStore.getVerify());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthed && storedStep === null) {
      onboardStore.setStep("complete");
      setStoredStep("complete");
    }
  }, [hydrated, isAuthed, storedStep]);

  useEffect(() => {
    if (!hydrated) return;
    if (currentStep === "result" && isAuthed) {
      onboardStore.setStep("complete");
      setStoredStep("complete");
      setCurrentStep("verify");
    }
  }, [isAuthed, currentStep, hydrated]);

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
    if (result.ok && reLaunchActive === "sample") {
      setReLaunchActive(null);
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
      setTimeout(() => setReLaunchActive(null), 1800);
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

  const showOnboarding = (() => {
    if (!hydrated) return false;
    if (sessionStatus === "loading") return false;
    if (reLaunchActive) return true;
    if (!isAuthed) return storedStep !== "skipped" && storedStep !== "complete";
    return verifyStatus === null;
  })();

  if (!showOnboarding) {
    return (
      <OnboardingContext.Provider value={controls}>{children}</OnboardingContext.Provider>
    );
  }

  const effectiveStep: CurrentStep = (() => {
    if (reLaunchActive === "verify") return "verify";
    if (isAuthed && currentStep !== "verify") return "verify";
    return currentStep;
  })();

  return (
    <OnboardingContext.Provider value={controls}>
      <div className="onboard-frame">
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
          <SampleStep onAnswered={onSampleAnswered} onSkip={() => setSkipSheetOpen(true)} />
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
          />
        )}
        {skipSheetOpen && (
          <SkipSheet
            mode={effectiveStep === "verify" ? "verify" : "onboarding"}
            onConfirm={effectiveStep === "verify" ? handleVerifyDismiss : handleSkipFromPreAuth}
            onClose={() => setSkipSheetOpen(false)}
          />
        )}
      </div>
    </OnboardingContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Hook — editorial paper layout
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
  const playerCount = useTickingNumber(2418, 2520, 4500);
  const clock = useCountdownClock();

  return (
    <div className="onboard-step onboard-step-hook">
      <Masthead live onSkip={onSkip} />
      <hr className="onboard-rule" />

      <h1 className="onboard-hook-headline">
        {isReLaunch ? <>Welcome back.<br /><em>One round.</em></> : <>One question.<br /><em>Ten seconds.</em></>}
      </h1>

      <p className="onboard-hook-lede">
        {isReLaunch
          ? "Same drill — pick the answer, see what happens."
          : "We don't believe in long onboarding. Take a round, see if it lands."}
      </p>

      <hr className="onboard-rule-dotted" />

      <div className="onboard-hook-meta">
        <div>
          <span>Playing now</span>
          <strong>{playerCount.toLocaleString()}</strong>
        </div>
        <div>
          <span>Next round in</span>
          <strong>{clock.minutes}:{clock.seconds}</strong>
        </div>
      </div>

      <RoundStamp />

      <div className="onboard-cta-bar">
        <button type="button" className="onboard-cta" onClick={onPlay}>
          {isReLaunch ? "Replay the round" : "Play one question"}
          <span className="onboard-cta-arrow" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1.5: Countdown — single brick stamp
// ─────────────────────────────────────────────────────────────────────────────
function CountdownStep({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);

  useEffect(() => {
    if (n <= 0) {
      const t = setTimeout(onDone, 220);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((v) => v - 1), COUNTDOWN_DURATION_MS / 4);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div className="onboard-step onboard-step-countdown">
      <div className="onboard-countdown-num" key={n}>
        {n > 0 ? n : "Go"}
      </div>
      <div className="onboard-countdown-caption">Get ready</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Sample — editorial answer list
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
      if (remaining <= 0) onAnswered(-1, false);
    };
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [onAnswered]);

  const ringPct = Math.max(0, Math.min(1, timer / SAMPLE_TIMER_SEC));
  const timerLow = timer <= 3;

  return (
    <div className="onboard-step onboard-step-sample">
      <Masthead onSkip={onSkip} />
      <div className="onboard-section-bar">
        <span>Round one</span>
        <span className="onboard-section-bar-sep" aria-hidden="true" />
        <span>Words</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.ceil(timer)} sec</span>
      </div>
      <div className={"onboard-timer" + (timerLow ? " low" : "")}>
        <div
          className="onboard-timer-fill"
          style={{ transform: `scaleX(${ringPct})` }}
        />
      </div>

      <h2 className="onboard-question">{HERO_QUESTION.prompt}</h2>

      <div className="onboard-answers">
        {HERO_QUESTION.answers.map((answer, idx) => (
          <button
            key={idx}
            type="button"
            className="onboard-answer"
            onClick={() => onAnswered(idx, idx === HERO_QUESTION.correct)}
          >
            <span className="onboard-answer-key">{String.fromCharCode(65 + idx)}.</span>
            <span className="onboard-answer-text">{answer}</span>
            <svg className="onboard-answer-arrow" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2.5: Feedback — single hand-stamped mark
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
    <div className="onboard-step onboard-step-feedback">
      <Masthead />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 24, textAlign: "center" }}>
        <div className={"onboard-feedback-stamp" + (result.correct ? "" : " missed")}>
          {result.correct ? <CheckStamp /> : <XStamp />}
        </div>
        <div className="onboard-feedback-headline">
          {result.correct ? "Nice." : isTimeout ? "Out of time." : "Close."}
        </div>
        <div className="onboard-feedback-sub">
          {result.correct
            ? <>+{ONBOARD_XP_REWARD} XP, in pencil for now.</>
            : <>It was <em>{correctText}</em>. We're crediting +{ONBOARD_XP_REWARD} anyway.</>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Result — receipt with PENDING stamp
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
      <Masthead onSkip={onSkip} skipDisabled={isSigningIn} />
      <div className="onboard-section-bar">
        <span>Round complete</span>
      </div>

      <h2 className="onboard-result-headline">
        You earned <strong>{ONBOARD_XP_REWARD} XP</strong>.
      </h2>

      <div className="onboard-receipt">
        <div className="onboard-receipt-pending">Pending</div>
        <ReceiptRow label="XP" value={String(ONBOARD_XP_REWARD)} />
        <ReceiptRow label="Tickets" value="1" />
        <hr className="onboard-rule-dotted" />
        <ReceiptRow label="Status" value="Unclaimed" />
      </div>

      <p className="onboard-result-caption">
        {sampleCorrect
          ? "Sign in with your World wallet to make it real and start earning for keeps."
          : "We round up. Sign in to claim your XP and your first ticket — the round wasn't graded."}
      </p>

      <div className="onboard-cta-bar">
        <button
          type="button"
          className="onboard-cta"
          onClick={onSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? "Signing in…" : "Sign in with World"}
          {!isSigningIn && <span className="onboard-cta-arrow" aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="onboard-cta-text"
          onClick={onSkip}
          disabled={isSigningIn}
        >
          later
        </button>
        {isInstalled === false && <p className="onboard-note">Open Waffles inside World App to sign in.</p>}
        {error && <p className="onboard-error">{error}</p>}
      </div>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="onboard-receipt-row">
      <span className="onboard-receipt-label">{label}</span>
      <span className="onboard-receipt-leader" aria-hidden="true" />
      <span className="onboard-receipt-value">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Verify — humanness check
// ─────────────────────────────────────────────────────────────────────────────
function VerifyStep({
  isChecking,
  error,
  success,
  onVerify,
  onDismiss,
}: {
  isChecking: boolean;
  error: string | null;
  success: VerifyLevel | null;
  onVerify: () => void;
  onDismiss: () => void;
}) {
  if (success) {
    return (
      <div className="onboard-step onboard-step-verify success">
        <Masthead />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
          <div className="onboard-verify-success-mark">
            <CheckStamp />
          </div>
          <h2 className="onboard-verify-success-headline">You're in.</h2>
          <p className="onboard-verify-success-sub">
            Tournaments unlocked. +{VERIFY_XP_REWARD} XP added to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboard-step onboard-step-verify">
      <Masthead onSkip={onDismiss} skipDisabled={isChecking} />
      <div className="onboard-section-bar">
        <span>Last step</span>
      </div>

      <div className="onboard-verify-mark">
        <FingerprintMark />
      </div>

      <h2 className="onboard-verify-headline">Are you a person?</h2>
      <p className="onboard-verify-lede">
        Tournaments pay real prizes, so we like to know each player is one
        human. Two seconds with World ID and we're done.
      </p>

      <WallyMark />

      <div className="onboard-cta-bar">
        <button
          type="button"
          className="onboard-cta"
          onClick={onVerify}
          disabled={isChecking}
        >
          {isChecking ? "Checking…" : "Verify with World ID"}
          {!isChecking && <span className="onboard-cta-arrow" aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="onboard-cta-text"
          onClick={onDismiss}
          disabled={isChecking}
        >
          later
        </button>
        {error && <p className="onboard-error">{error}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skip sheet
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
    <div className="onboard-sheet-backdrop" onClick={onClose}>
      <div
        className="onboard-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="onboard-sheet-title" className="onboard-sheet-title">
          {isVerify ? "Skip verification?" : "Finish later?"}
        </h3>
        <p className="onboard-sheet-body">
          {isVerify
            ? `You can play levels and earn XP without verifying. We'll save "Verify yourself" in your missions for +${VERIFY_XP_REWARD} XP whenever you're ready.`
            : `We'll save "Finish setup" in your missions for +${ONBOARD_XP_REWARD} XP whenever you'd like to come back.`}
        </p>
        <div className="onboard-sheet-actions">
          <button type="button" className="onboard-cta" onClick={onConfirm}>
            {isVerify ? "Skip for now" : "Finish later"}
          </button>
          <button type="button" className="onboard-cta-text" onClick={onClose}>
            keep going
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────────────
function Masthead({
  live = false,
  onSkip,
  skipDisabled,
}: {
  live?: boolean;
  onSkip?: () => void;
  skipDisabled?: boolean;
}) {
  return (
    <header className="onboard-masthead">
      <span className="onboard-masthead-issue">
        Waffles <span className="onboard-masthead-num">№47</span>
      </span>
      <span className="onboard-masthead-right">
        {live && (
          <span className="onboard-masthead-live">
            <span className="onboard-masthead-dot" aria-hidden="true" /> On air
          </span>
        )}
        {onSkip && (
          <button
            type="button"
            className="onboard-skip"
            onClick={onSkip}
            disabled={skipDisabled}
            aria-label="Skip onboarding"
          >
            skip
          </button>
        )}
      </span>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG primitives — hand-drawn-feeling line work in single ink color
// ─────────────────────────────────────────────────────────────────────────────

// "ROUND OF THE HOUR" rubber-stamp circle. Curved text + central icon.
function RoundStamp() {
  // Curved text uses a circular path with textPath
  return (
    <div className="onboard-stamp" aria-hidden="true">
      <svg viewBox="0 0 132 132" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <path
            id="onboard-stamp-circle"
            d="M 66 66 m -52 0 a 52 52 0 1 1 104 0 a 52 52 0 1 1 -104 0"
          />
        </defs>
        {/* Outer ring */}
        <circle cx="66" cy="66" r="62" fill="none" stroke="currentColor" strokeWidth="1.4" />
        {/* Inner ring */}
        <circle cx="66" cy="66" r="56" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
        {/* Curved text along the inner-circle path */}
        <text fontFamily="var(--font-body), Funnel Sans, system-ui" fontSize="9" fontWeight="700" letterSpacing="2.4" fill="currentColor" style={{ textTransform: "uppercase" }}>
          <textPath href="#onboard-stamp-circle" startOffset="0">
            ROUND OF THE HOUR · ROUND OF THE HOUR ·
          </textPath>
        </text>
        {/* Central numeral with hand-drawn feel */}
        <text x="66" y="78" textAnchor="middle" fontFamily="var(--font-display), Funnel Display, Georgia, serif" fontSize="38" fontWeight="800" fill="currentColor" letterSpacing="-1">
          №01
        </text>
        {/* Tiny "PRESS" mark */}
        <text x="66" y="92" textAnchor="middle" fontFamily="var(--font-body), Funnel Sans, system-ui" fontSize="6" fontWeight="700" letterSpacing="1.6" fill="currentColor" opacity="0.7">
          PRESS TO PLAY
        </text>
      </svg>
    </div>
  );
}

// Hand-drawn-feeling checkmark inside a slightly imperfect circle
function CheckStamp() {
  return (
    <svg viewBox="0 0 152 152" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Slightly imperfect circle (path, not perfect arc) */}
      <path
        d="M 76 12 C 110 12 140 40 140 76 C 140 112 112 142 76 140 C 40 142 12 112 14 76 C 12 40 42 12 76 12 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Hand-drawn checkmark — varies stroke slightly */}
      <path
        d="M 44 78 L 70 102 L 110 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XStamp() {
  return (
    <svg viewBox="0 0 152 152" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M 76 12 C 110 12 140 40 140 76 C 140 112 112 142 76 140 C 40 142 12 112 14 76 C 12 40 42 12 76 12 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M 50 50 L 102 102 M 102 50 L 50 102" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

// Fingerprint mark for the verify step — line drawing, single ink
function FingerprintMark() {
  return (
    <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M 18 60 C 18 38 30 22 48 22 C 66 22 78 38 78 60" />
        <path d="M 26 64 C 26 46 36 32 48 32 C 60 32 70 46 70 64 C 70 70 68 76 64 80" opacity="0.85" />
        <path d="M 34 66 C 34 52 40 42 48 42 C 56 42 62 52 62 66 C 62 72 60 76 56 80" opacity="0.7" />
        <path d="M 42 68 C 42 60 44 52 48 52 C 52 52 54 60 54 68 C 54 72 53 76 50 78" opacity="0.55" />
        {/* Indication marks — small ticks suggesting analysis */}
        <path d="M 14 28 L 20 28 M 76 28 L 82 28 M 14 82 L 20 82 M 76 82 L 82 82" opacity="0.55" />
      </g>
    </svg>
  );
}

// Wally — flat ink line drawing of a waffle character. Sits, watches.
function WallyMark() {
  return (
    <div className="onboard-wally" aria-hidden="true">
      <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Waffle body — rounded square */}
          <rect x="20" y="22" width="56" height="48" rx="6" />
          {/* Waffle grid (3x3 cells) */}
          <path d="M 38 22 L 38 70 M 56 22 L 56 70" opacity="0.65" />
          <path d="M 20 38 L 76 38 M 20 54 L 76 54" opacity="0.65" />
          {/* Eyes (inside upper-middle cells) */}
          <circle cx="44" cy="32" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="52" cy="32" r="1.6" fill="currentColor" stroke="none" />
          {/* Smile */}
          <path d="M 42 46 Q 48 50 54 46" />
          {/* Stick legs */}
          <path d="M 36 70 L 32 86 M 60 70 L 64 86" />
          {/* Stick arms — one raised in a small wave */}
          <path d="M 20 44 L 10 38 M 76 44 L 86 30" />
          {/* Tiny ground rule */}
          <path d="M 16 90 L 80 90" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function useTickingNumber(start: number, end: number, intervalMs: number) {
  const [n, setN] = useState(start);
  useEffect(() => {
    const t = setInterval(() => {
      setN((curr) => (curr >= end ? start : curr + 1 + Math.floor(Math.random() * 3)));
    }, intervalMs);
    return () => clearInterval(t);
  }, [start, end, intervalMs]);
  return n;
}

function useCountdownClock() {
  const [seconds, setSeconds] = useState(17 * 60 + 42);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s <= 1 ? 17 * 60 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return {
    minutes: m.toString().padStart(2, "0"),
    seconds: s.toString().padStart(2, "0"),
  };
}
