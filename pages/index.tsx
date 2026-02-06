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

function getParam(params: URLSearchParams | null, key: string) {
  if (!params) return null;
  const v = params.get(key);
  return v && v.trim().length ? v.trim() : null;
}

function clampWeekStart(v: string | null): WeekStart {
  return v?.toLowerCase() === "mon" ? 1 : 0;
}

export default function Home() {
  // URL options:
  // ?week=mon        -> week starts on Monday
  // ?locale=en-US    -> month label locale
  // ?w=280           -> widget width
  // ?dow=short       -> day-of-week: short | narrow (Mon..Sun vs M..S)
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const weekStart: WeekStart = clampWeekStart(getParam(params, "week"));
  const locale = (getParam(params, "locale") || "en-US").trim();
  const width = Math.max(220, Math.min(420, Number(getParam(params, "w") || 280)));
  const dowStyle = (getParam(params, "dow") || "short").toLowerCase(); // short | narrow

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
    const baseShortSunFirst = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const baseNarrowSunFirst = ["S", "M", "T", "W", "T", "F", "S"];

    const base = dowStyle === "narrow" ? baseNarrowSunFirst : baseShortSunFirst;

    return weekStart === 1 ? [...base.slice(1), base[0]] : base;
  }, [weekStart, dowStyle]);

  const cells = useMemo(() => {
    const y = view.getFullYear();
    const m = view.getMonth();

    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const daysInMonth = last.getDate();

    // JS getDay(): 0=Sun..6=Sat
    let leading = first.getDay();
    if (weekStart === 1) {
      leading = (leading + 6) % 7; // shift for Monday-start calendars
    }

    const result: Array<{ date: Date | null; label: string; inMonth: boolean }> = [];

    for (let i = 0; i < leading; i++) {
      result.push({ date: null, label: "", inMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      result.push({ date, label: String(d), inMonth: true });
    }

    // Always 6 rows (42 cells) so Notion height stays stable
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
            <button className="btn" onClick={prevMonth} aria-label="Previous month">
              ‹
            </button>
            <button className="btn" onClick={goToday} aria-label="Today">
              •
            </button>
            <button className="btn" onClick={nextMonth} aria-label="Next month">
              ›
            </button>
          </div>
        </div>

        <div className="grid">
          <div className="dow">
            {dowLabels.map((d, i) => (
              <div key={`${d}-${i}`}>{d}</div>
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
          <button className="copy" onClick={copySelected}>
            Copy
          </button>
        </div>
      </div>
    </>
  );
}
