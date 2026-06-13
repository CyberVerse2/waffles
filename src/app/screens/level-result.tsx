"use client";

import { useProto } from "../state";
import { Phone } from "../shared";

export const LevelWinScreen = () => {
  const proto = useProto();
  const score = proto.score;
  const heartsLeft = proto.hearts;
  const justCompleted = proto.level;
  const next = justCompleted + 1;
  const nextTicketLevel = Math.ceil((next + 1) / 5) * 5;
  const levelsToGo = nextTicketLevel - next;
  const ticketPct = Math.round(((5 - levelsToGo) / 5) * 100);

  return (
    <Phone paper>
      <div className="paper-page" style={{ paddingBottom: 116 }}>
        <header className="paper-masthead">
          <span className="paper-masthead-issue">
            Waffles <span className="paper-masthead-num">№47</span>
          </span>
        </header>
        <hr className="paper-rule" />

        <div className="paper-section-label">
          <span>Level cleared</span>
        </div>

        <div className="paper-outcome-stamp" aria-hidden="true">
          <CircledNumberStamp value={String(next)} caption="Level up" />
        </div>

        <h1 className="paper-result-headline" style={{ textAlign: "center" }}>
          Level <em>{justCompleted}</em> cleared.
        </h1>

        <p style={{ margin: 0, textAlign: "center", color: "var(--ink-soft-2)", fontSize: "var(--text-body)", lineHeight: 1.5 }}>
          On to <strong style={{ color: "var(--ink)", fontWeight: 600 }}>Level {next}</strong>, friend.
        </p>

        <div className="paper-receipt">
          <div className="paper-receipt-stamp">Filed</div>
          <ReceiptRow label="XP earned" value={`+${score}`} brick />
          <ReceiptRow label="Hearts left" value={`${heartsLeft} of 3`} />
          <hr className="paper-rule-dotted" />
          <ReceiptRow
            label={`Free ticket at lvl ${nextTicketLevel}`}
            value={`${ticketPct}%`}
          />
        </div>
      </div>

      <div className="cta-row sticky" style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          className="paper-cta paper-cta-secondary"
          aria-label="Back to home"
          onClick={() => proto.goto("home")}
          style={{ width: 56, padding: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 12l9-8 9 8v8a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
        <button
          type="button"
          className="paper-cta"
          onClick={() => proto.goto("levels")}
          style={{ flex: 1 }}
        >
          Next level
          <span className="paper-cta-arrow" aria-hidden="true" />
        </button>
      </div>
    </Phone>
  );
};

export const LevelFailScreen = () => {
  const proto = useProto();
  return (
    <Phone paper>
      <div className="paper-page" style={{ paddingBottom: 116 }}>
        <header className="paper-masthead">
          <span className="paper-masthead-issue">
            Waffles <span className="paper-masthead-num">№47</span>
          </span>
        </header>
        <hr className="paper-rule" />

        <div className="paper-section-label">
          <span>Level failed</span>
        </div>

        <div className="paper-outcome-stamp fail" aria-hidden="true">
          <TryAgainStamp />
        </div>

        <h1 className="paper-result-headline" style={{ textAlign: "center" }}>
          Out of hearts.
        </h1>
        <p style={{ margin: 0, textAlign: "center", color: "var(--ink-soft-2)", fontSize: "var(--text-body)", lineHeight: 1.5, maxWidth: "36ch", marginInline: "auto" }}>
          Night Owl got the better of you this time. Your progress is saved &mdash; pick up where you left off.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 8 }}>
          {[1, 2, 3].map((h) => (
            <span
              key={h}
              className="paper-q-heart broken"
              style={{ width: 18, height: 18 }}
              aria-hidden="true"
            />
          ))}
        </div>

        <div style={{ marginTop: "auto", padding: "var(--space-md) var(--space-sm)", borderTop: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)", background: "var(--paper-deep)" }}>
          <div style={{ fontSize: "var(--text-tag)", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--brick)" }}>
            Tip
          </div>
          <div style={{ marginTop: 6, fontFamily: "var(--font-display), Funnel Display, Georgia, serif", fontWeight: 500, fontSize: "var(--text-body)", color: "var(--ink)", lineHeight: 1.45 }}>
            Read the question fully &mdash; level mode's timer is forgiving.
          </div>
        </div>
      </div>

      <div className="cta-row sticky" style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          className="paper-cta paper-cta-secondary"
          aria-label="Back to level path"
          onClick={() => proto.goto("levels", { back: true })}
          style={{ width: 56, padding: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className="paper-cta"
          onClick={() => proto.retryLevel()}
          style={{ flex: 1 }}
        >
          Retry the level
          <span className="paper-cta-arrow" aria-hidden="true" />
        </button>
      </div>
    </Phone>
  );
};

function ReceiptRow({ label, value, brick }: { label: string; value: string; brick?: boolean }) {
  return (
    <div className="paper-receipt-row">
      <span className="paper-receipt-label">{label}</span>
      <span className="paper-receipt-leader" aria-hidden="true" />
      <span className={"paper-receipt-value " + (brick ? "brick" : "")}>{value}</span>
    </div>
  );
}

// "LEVEL UP" circular stamp with curving text + central numeral
function CircledNumberStamp({ value, caption }: { value: string; caption: string }) {
  return (
    <svg viewBox="0 0 168 168" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <path
          id="paper-levelup-circle"
          d="M 84 84 m -68 0 a 68 68 0 1 1 136 0 a 68 68 0 1 1 -136 0"
        />
      </defs>
      <circle cx="84" cy="84" r="80" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="84" cy="84" r="72" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <text fontFamily="var(--font-body), Funnel Sans, system-ui" fontSize="11" fontWeight="700" letterSpacing="3" fill="currentColor" style={{ textTransform: "uppercase" }}>
        <textPath href="#paper-levelup-circle" startOffset="0">
          LEVEL UP · LEVEL UP · LEVEL UP ·
        </textPath>
      </text>
      <text x="84" y="100" textAnchor="middle" fontFamily="var(--font-display), Funnel Display, Georgia, serif" fontSize="56" fontWeight="800" fill="currentColor" letterSpacing="-2">
        {value}
      </text>
      <text x="84" y="120" textAnchor="middle" fontFamily="var(--font-body), Funnel Sans, system-ui" fontSize="8" fontWeight="700" letterSpacing="2" fill="currentColor" opacity="0.7">
        {caption.toUpperCase()}
      </text>
    </svg>
  );
}

// "TRY AGAIN" stamp — square, less celebratory than the circle
function TryAgainStamp() {
  return (
    <svg viewBox="0 0 168 168" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Imperfect rectangle */}
      <path
        d="M 18 22 L 150 18 L 152 148 L 16 152 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 26 32 L 142 28 L 144 138 L 24 142 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
      <text x="84" y="80" textAnchor="middle" fontFamily="var(--font-display), Funnel Display, Georgia, serif" fontSize="26" fontWeight="800" fill="currentColor" letterSpacing="-0.5">
        TRY
      </text>
      <text x="84" y="118" textAnchor="middle" fontFamily="var(--font-display), Funnel Display, Georgia, serif" fontSize="26" fontWeight="800" fill="currentColor" letterSpacing="-0.5" fontStyle="italic">
        again.
      </text>
    </svg>
  );
}
