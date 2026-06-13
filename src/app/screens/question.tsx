"use client";

import { useProto } from "../state";
import { Phone } from "../shared";

export const QuestionScreen = () => {
  const proto = useProto();
  const isLevel = proto.mode === "level";
  const q = proto.currentQuestion;
  const idx = proto.qIdx;
  const total = proto.totalQuestions;
  const answered = proto.qAnswered;
  const totalTime = proto.tweaks.questionTime;
  const timeLeft = proto.timer;
  const ringPct = Math.max(0, Math.min(1, timeLeft / totalTime));
  const isCorrect = answered === q.correct;
  const points = answered != null && isCorrect ? Math.round(100 + timeLeft * 20) : 0;
  const cat = q.cat;
  const hearts = proto.hearts;
  const timerLow = timeLeft < 3;

  const ticks = Array.from({ length: total }, (_, i) => {
    if (i < idx) return "done" as const;
    if (i === idx) return "current" as const;
    return "pending" as const;
  });

  return (
    <Phone paper>
      <div className="paper-q-stage">
        <header className="paper-masthead">
          <span className="paper-masthead-issue">
            Waffles <span className="paper-masthead-num">№47</span>
          </span>
        </header>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }} aria-label={`Question ${idx + 1} of ${total}`}>
          <div className="paper-q-progress" style={{ flex: 1 }}>
            {ticks.map((t, i) => (
              <span key={i} className={"paper-q-progress-tick " + t} />
            ))}
          </div>
          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)", fontFamily: "var(--font-display), Funnel Display, Georgia, serif", fontWeight: 700, fontSize: "var(--text-small)", letterSpacing: 0 }}>
            Q{idx + 1}<span style={{ color: "var(--ink-faint-2)" }}>/{total}</span>
          </span>
        </div>

        <div className="paper-section-label">
          <span className="paper-q-cat">{cat}</span>
          <span className="paper-section-label-meta">
            {isLevel ? (
              <span className="paper-q-hearts" aria-label={`${hearts} hearts left`}>
                {[1, 2, 3].map((h) => (
                  <span
                    key={h}
                    className={"paper-q-heart " + (h <= hearts ? "full" : "broken")}
                  />
                ))}
              </span>
            ) : (
              <>Rank 247 of 2,418</>
            )}
          </span>
        </div>

        {/* Depleting hairline timer */}
        <div className="paper-q-timer-wrap" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className={"onboard-timer" + (timerLow ? " low" : "")}
            style={{ flex: 1 }}
            role="timer"
            aria-label={`${Math.ceil(timeLeft)} seconds left`}
          >
            <div
              className="onboard-timer-fill"
              style={{ transform: `scaleX(${ringPct})` }}
            />
          </div>
          <span style={{ fontFamily: "var(--font-display), Funnel Display, Georgia, serif", fontWeight: 700, fontSize: "var(--text-body)", color: timerLow ? "var(--brick)" : "var(--ink)", fontVariantNumeric: "tabular-nums", minWidth: 54, textAlign: "right" }}>
            {Math.max(0, timeLeft).toFixed(1)}s
          </span>
        </div>

        <h2 className="paper-q-question">{q.q}</h2>

        <div className="paper-q-answers">
          {q.answers.map((text, i) => {
            const letters = ["A", "B", "C", "D"];
            let state: "idle" | "correct" | "wrong" | "dim" = "idle";
            if (answered != null) {
              if (i === q.correct) state = "correct";
              else if (i === answered) state = "wrong";
              else state = "dim";
            }
            return (
              <button
                key={i}
                type="button"
                disabled={answered != null}
                onClick={() => answered == null && proto.answerQuestion(i)}
                aria-label={`Answer ${letters[i]}: ${text}`}
                className={"paper-q-answer " + (state !== "idle" ? state : "")}
              >
                <span className="paper-q-answer-key">{letters[i]}.</span>
                <span className="paper-q-answer-text">{text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {answered != null && (
        <div role="status" aria-live="polite" className={"paper-q-feedback " + (isCorrect ? "correct" : "")}>
          <div>
            <div className="paper-q-feedback-headline">
              {isCorrect ? "Correct." : answered === -1 ? "Out of time." : "Incorrect."}
            </div>
            <div className="paper-q-feedback-sub">
              {isCorrect
                ? `Speed bonus · ${(totalTime - timeLeft).toFixed(1)}s`
                : `Answer: ${q.answers[q.correct]}`}
            </div>
          </div>
          {isCorrect && <span className="paper-q-feedback-points">+{points}</span>}
        </div>
      )}
    </Phone>
  );
};
