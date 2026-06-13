"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useProto } from "../state";
import { Phone, TabBar } from "../shared";
import { useOnboardingControls } from "../onboarding/onboarding-flow";

type MissionRow = {
  id: string;
  label: string;
  cur: number;
  tgt: number;
  reward: string;
  onClick?: () => void;
  badge?: string;
  done?: boolean;
};

export const HomeScreen = () => {
  const proto = useProto();
  const tickets = proto.tickets;
  const streak = proto.streak;
  const level = proto.level;
  const xp = proto.xp;
  const homeSlot = proto.tweaks.homeSlot;
  const overflow = xp >= 500;
  const displayLevel = overflow ? level + 1 : level;
  const displayXp = overflow ? xp - 500 : xp;
  const xpPct = Math.min(100, Math.round((displayXp / 500) * 100));
  const tournamentClock = useTournamentClock();

  const { sampleComplete, verifyStatus, relaunchSample, relaunchVerify } = useOnboardingControls();
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user?.address);

  // Build mission list. Setup + verify (when applicable) come first as
  // brick-tagged onboarding nudges; standard missions follow.
  const missions: MissionRow[] = [];
  if (!sampleComplete) {
    missions.push({
      id: "setup",
      label: "Finish setup",
      cur: 0,
      tgt: 1,
      reward: "+50 XP",
      onClick: relaunchSample,
      badge: "ONE-TIME",
    });
  }
  if (isAuthed && verifyStatus === null) {
    missions.push({
      id: "verify",
      label: "Verify yourself",
      cur: 0,
      tgt: 1,
      reward: "+100 XP",
      onClick: relaunchVerify,
      badge: "ONE-TIME",
    });
  }
  missions.push(
    { id: "xp", label: "Earn 50 XP", cur: 32, tgt: 50, reward: "+10 XP" },
    { id: "win", label: "Win a round", cur: 0, tgt: 1, reward: "+1 ticket" },
    { id: "play", label: "Play 2 games", cur: 1, tgt: 2, reward: "+25 XP", done: false }
  );

  const showContinue = homeSlot === "both" || homeSlot === "continue";
  const showMissions = homeSlot === "both" || homeSlot === "missions";

  return (
    <Phone paper>
      <div className="paper-page">
        <header className="paper-masthead">
          <span className="paper-masthead-issue">
            Waffles <span className="paper-masthead-num">№47</span>
          </span>
          <span className="paper-masthead-right">
            <span className="paper-tickets" aria-label={`${tickets} tickets`}>
              <TicketGlyph /> {tickets}
            </span>
            <span aria-label={`${streak} day streak`}>
              <FlameGlyph /> {streak}
            </span>
          </span>
        </header>
        <hr className="paper-rule" />

        {/* ── Now Playing ─────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="paper-section-label">
            <span>Now playing</span>
            <span className="paper-section-label-meta">
              <LiveDot /> 2,418 in
            </span>
          </div>
          <button type="button" className="paper-event" onClick={() => proto.startTournament()}>
            <div className="paper-event-row">
              <h2 className="paper-event-title">
                Top of the <em>Hour</em>
              </h2>
              <span className="paper-event-clock">{tournamentClock}</span>
            </div>
            <div className="paper-event-meta">
              Mixed trivia · 12 questions in 90 seconds · top 100 win a ticket
            </div>
          </button>
        </section>

        <hr className="paper-rule-dotted" />

        {/* ── Continue ────────────────────────────────────────────── */}
        {showContinue && (
          <>
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="paper-section-label">
                <span>Continue</span>
                <span className="paper-section-label-meta">Forest</span>
              </div>
              <div className="paper-listing">
                <button type="button" className="paper-row" onClick={() => proto.goto("levels")}>
                  <span className="paper-row-key" aria-hidden="true">№</span>
                  <span className="paper-row-main">
                    <span className="paper-row-title">Level {displayLevel}</span>
                    <span className="paper-row-sub">3 questions · 3 lives · +50 XP</span>
                  </span>
                  <span className="paper-row-meta brick">{xpPct}%</span>
                  <ArrowGlyph />
                </button>
              </div>
            </section>
            <hr className="paper-rule-dotted" />
          </>
        )}

        {/* ── Missions ────────────────────────────────────────────── */}
        {showMissions && (
          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="paper-section-label">
              <span>Today's missions</span>
              <span className="paper-section-label-meta">resets 6h 17m</span>
            </div>
            <div className="paper-listing">
              {missions.map((m) => (
                <MissionRowItem key={m.id} mission={m} />
              ))}
            </div>
          </section>
        )}

        {/* ── Stats footer ────────────────────────────────────────── */}
        <div className="paper-stat-row" style={{ marginTop: "auto" }}>
          <div>
            <span>Streak</span>
            <strong>{streak} days</strong>
          </div>
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--ink)", opacity: 0.3 }} />
          <div>
            <span>Level</span>
            <strong className="brick">{displayLevel}</strong>
          </div>
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--ink)", opacity: 0.3 }} />
          <div>
            <span>XP</span>
            <strong>{displayXp}/500</strong>
          </div>
        </div>
      </div>

      <div className="cta-row sticky">
        <button type="button" className="paper-cta" onClick={() => proto.startTournament()}>
          Join next tournament
          <span className="paper-cta-arrow" aria-hidden="true" />
        </button>
      </div>
      <div className="bottom-bar">
        <TabBar active="home" />
      </div>
    </Phone>
  );
};

function MissionRowItem({ mission }: { mission: MissionRow }) {
  const isAction = Boolean(mission.onClick);
  const isOnboardingMission = mission.id === "setup" || mission.id === "verify";

  const inner = (
    <>
      <span className="paper-row-key" aria-hidden="true">
        {mission.done ? "✓" : isOnboardingMission ? "★" : "·"}
      </span>
      <span className="paper-row-main">
        <span className="paper-row-title">
          {mission.label}
          {mission.badge && (
            <span style={{ marginLeft: 8, fontSize: 10, color: "var(--brick)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-body), Funnel Sans, system-ui", fontWeight: 600 }}>
              {mission.badge}
            </span>
          )}
        </span>
        <span className="paper-row-sub">
          {mission.cur}/{mission.tgt}
        </span>
      </span>
      <span className={"paper-row-meta " + (isOnboardingMission ? "brick" : "mute")}>
        {mission.reward}
      </span>
      {isAction && <ArrowGlyph />}
    </>
  );

  if (isAction) {
    return (
      <button type="button" className="paper-row" onClick={mission.onClick} aria-label={`${mission.label}, reward ${mission.reward}`}>
        {inner}
      </button>
    );
  }
  return <div className="paper-row static">{inner}</div>;
}

// ─────────────────────────────────────────────────────────────────────────
// Inline glyphs — single-color line drawings
// ─────────────────────────────────────────────────────────────────────────

function TicketGlyph() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden="true">
      <path d="M2 3 v2 a1.4 1.4 0 0 1 0 4 v2 a1 1 0 0 0 1 1 h10 a1 1 0 0 0 1 -1 v-2 a1.4 1.4 0 0 1 0 -4 v-2 a1 1 0 0 0 -1 -1 h-10 a1 1 0 0 0 -1 1 z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 4 v6" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 1.4" />
    </svg>
  );
}

function FlameGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5 c0 2 -2 3 -2 5 a3 3 0 1 0 6 0 c0 -2 -1 -2.5 -2 -4 c-0.5 0.6 -0.8 1 -1 1.6 c-0.3 -1.2 -0.5 -2 -1 -2.6 z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg className="paper-row-arrow" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LiveDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: 99,
        background: "var(--brick)",
        marginRight: 6,
        verticalAlign: "middle",
        animation: "onboard-paper-pulse 2.4s ease-in-out infinite",
      }}
      aria-hidden="true"
    />
  );
}

// Mocked tournament countdown — same logic as onboarding
function useTournamentClock() {
  const [seconds, setSeconds] = useState(17 * 60 + 42);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s <= 1 ? 17 * 60 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
