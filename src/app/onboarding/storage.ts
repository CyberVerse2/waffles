"use client";

const KEY_STEP = "waffles-onboard-step";
const KEY_SAMPLE = "waffles-onboard-sample";
const KEY_VERIFY = "waffles-verify-status";
const KEY_VERIFY_AT = "waffles-verify-at";

export type OnboardStep = "hook" | "sample" | "result" | "skipped" | "complete";
export type VerifyStatus = "verified" | "dismissed";
export type SampleResult = { picked: number; correct: boolean };

const safe = {
  get(k: string) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(k, v);
    } catch {
      // private mode / quota — silently no-op
    }
  },
  remove(k: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
};

export const onboardStore = {
  getStep(): OnboardStep | null {
    const v = safe.get(KEY_STEP);
    if (v === "hook" || v === "sample" || v === "result" || v === "skipped" || v === "complete") return v;
    return null;
  },
  setStep(step: OnboardStep) {
    safe.set(KEY_STEP, step);
  },
  getSample(): SampleResult | null {
    const raw = safe.get(KEY_SAMPLE);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SampleResult;
      if (typeof parsed.picked !== "number" || typeof parsed.correct !== "boolean") return null;
      return parsed;
    } catch {
      return null;
    }
  },
  setSample(picked: number, correct: boolean) {
    safe.set(KEY_SAMPLE, JSON.stringify({ picked, correct }));
  },
  getVerify(): VerifyStatus | null {
    const v = safe.get(KEY_VERIFY);
    return v === "verified" || v === "dismissed" ? v : null;
  },
  setVerify(status: VerifyStatus) {
    safe.set(KEY_VERIFY, status);
    if (status === "verified") safe.set(KEY_VERIFY_AT, new Date().toISOString());
  },
  getVerifyAt(): string | null {
    return safe.get(KEY_VERIFY_AT);
  },
  reset() {
    safe.remove(KEY_STEP);
    safe.remove(KEY_SAMPLE);
    safe.remove(KEY_VERIFY);
    safe.remove(KEY_VERIFY_AT);
  },
};
