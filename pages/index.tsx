import { useMemo, useState } from "react";
import Head from "next/head";

type WeekStart = 0 | 1; // 0=Sun, 1=Mon

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clampWeekStart(v: string | string[] | undefined): WeekStart {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "mon" ? 1 : 0;
}

export default function Home() {
  // URL 파라미터로 옵션 조절 가능:
  // ?week=mon  (월요일 시작)
  // ?locale=ko-KR
  // ?w=280 (가로폭)
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const weekStart: WeekStart = clampWeekStart(params?.get("week") ?? undefined);
  const locale = (params?.get("locale") || "ko-KR").trim();
  const width = Math.max(220, Math.min(420, Number(params?.get("w") || 280)));

  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(() => today);

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(view);
    } catch {
      return `${view.getFullYear()}-${pad2(view.getMonth() + 1)}`;
    }
  }, [view, locale]);

  const dowLabels = useMemo(() => {
    // Intl의 weekday short는 로케일마다 길이가 제각각이라,
    // ko-KR 기준으로는 고정값이 가장 깔끔함.
    const sunFirst = ["일", "월", "화", "수", "목", "금", "토"];
    return weekStart === 1 ? [...sunFirst.slice(1), sunFirst[0]] : sunFirst;
  }, [weekStart]);

  const cells = useMemo(() => {
    const y = view.getFullYear();
    const m = view.getMonth();

    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const daysInMonth = last.getDate();

    // JS getDay(): 0=Sun..6=Sat
    let leading = first.getDay(); // 0..6
    if (weekStart === 1) {
      leading = (leading + 6) % 7; // 월요일 시작으로 보정
    }

    const result: Array<{ date: Date | null; label: string; inMonth: boolean }> = [];

    // leading blanks
    for (let i = 0; i < leading; i++) {
      result.push({ date: null, label: "", inMonth: false });
    }

    // month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      result.push({ date, label: String(d), inMonth: true });
    }

    // trailing blanks to complete 6 rows (42 cells) - 노션에서 항상 높이 일정하게
    while (result.length < 42) {
      result.push({ date: null, label: "", inMonth: false });
    }

    return result;
  }, [view, weekStart]);

  function prevMonth() {
    setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  }
  function nextMonth() {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  }
  function goToday() {
    const t = new Date();
    setView(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelected(t);
  }

  async function copySelected() {
    const text = formatYMD(selected);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard 막혔을 때 fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  return (
    <>
      <Head>
        <title>Mini Calendar</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="widget" style={{ width }}>
        <div className="header">
          <div className="title">{monthLabel}</div>
          <div className="controls">
            <button className="btn" onClick={prevMonth} aria-label="Previous month">‹</button>
            <button className="btn" onClick={goToday} aria-label="Today">•</button>
            <button className="btn" onClick={nextMonth} aria-label="Next month">›</button>
          </div>
        </div>

        <div className="grid">
          <div className="dow">
            {dowLabels.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="days">
            {cells.map((c, idx) => {
              const isToday = c.date ? sameDay(c.date, today) : false;
              const isSel = c.date ? sameDay(c.date, selected) : false;

              const className =
                "cell " +
                (c.inMonth ? "day" : "blank") +
                (isToday ? " today" : "") +
                (isSel ? " selected" : "");

              return (
                <div
                  key={idx}
                  className={className}
                  onClick={() => c.date && setSelected(c.date)}
                  role={c.inMonth ? "button" : undefined}
                  aria-label={c.date ? formatYMD(c.date) : undefined}
                  title={c.date ? formatYMD(c.date) : ""}
                >
                  {c.label}
                </div>
              );
            })}
          </div>
        </div>

        <div className="footer">
          <div className="pill">{formatYMD(selected)}</div>
          <button className="copy" onClick={copySelected}>Copy</button>
        </div>
      </div>
    </>
  );
}
