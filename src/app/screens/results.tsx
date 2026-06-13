"use client";

import { useProto } from "../state";
import { Phone } from "../shared";

export const ResultsScreen = () => {
  const proto = useProto();
  const score = proto.score;
  const total = proto.totalQuestions;
  const rank = Math.max(1, Math.round(2418 * (1 - Math.min(1, score / (total * 250)))) + 1);
  const pct = Math.max(1, Math.round((rank / 2418) * 100));
  const isPodium = rank <= 3;
  const board = [
    { r: 1, n: "@quizking", s: 9840 },
    { r: 2, n: "@trivia.eth", s: 9540 },
    { r: 3, n: "@waffleboss", s: 9210 },
    { r: rank, n: "you", s: score, you: true },
    { r: rank + 1, n: "@brainpan", s: Math.max(0, score - 60) },
  ];

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
          <span>Round complete</span>
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1 className="paper-result-headline">
            {isPodium ? <>Podium finish.</> : <>You finished.</>}
          </h1>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span className="paper-rank-stamp">
              <span className="rank-hash">№</span>
              {rank.toLocaleString()}
            </span>
            <div style={{ paddingBottom: 6, whiteSpace: "nowrap" }}>
              <div style={{ fontSize: "var(--text-tag)", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--ink-mute-2)", fontWeight: 600 }}>of 2,418</div>
              <div style={{ fontFamily: "var(--font-display), Funnel Display, Georgia, serif", fontWeight: 700, fontSize: "var(--text-h3)", color: "var(--ink)" }}>top {pct}%</div>
            </div>
          </div>
        </section>

        {/* Receipt: tonight's earnings */}
        <div className="paper-receipt">
          <div className="paper-receipt-stamp">{isPodium ? "Top 3" : "Filed"}</div>
          <ReceiptRow label="XP earned" value={`+${score}`} brick />
          <ReceiptRow label="Tickets" value="+1" />
          <ReceiptRow label="Streak" value={`${proto.streak} days`} />
          <hr className="paper-rule-dotted" />
          <ReceiptRow label="Status" value="Posted" />
        </div>

        {/* Mini-leaderboard as a typeset listing */}
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="paper-section-label">
            <span>Top of the hour</span>
            <span className="paper-section-label-meta">Top 100 win a ticket</span>
          </div>
          <div className="paper-listing">
            {board.map((p, i) => {
              const youStyle = p.you ? { background: "var(--paper-deep)" } : undefined;
              return (
                <div key={i} className="paper-row static" style={youStyle}>
                  <span className="paper-row-key" style={{ color: p.you ? "var(--brick)" : "var(--ink-mute-2)" }}>
                    {p.r}
                  </span>
                  <span className="paper-row-main">
                    <span className="paper-row-title" style={{ fontStyle: p.you ? "italic" : "normal", color: p.you ? "var(--brick)" : "var(--ink)" }}>
                      {p.n}
                    </span>
                  </span>
                  <span className={"paper-row-meta " + (p.you ? "brick" : "")}>
                    {p.s.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
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
          onClick={() => proto.playAgain()}
          style={{ flex: 1 }}
        >
          Play next hour
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
