import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useExecutionEvents } from '../hooks/useExecutionEvents';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { useProblemContext } from '../hooks/useProblemContext';
import './InterviewOverlay.css';

function CollapseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="M3.5 2.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      <path d="M10.5 3v10" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="m6 6 2 2-2 2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function CueMark() {
  return (
    <span aria-hidden="true" className="cue-mark">
      <i />
      <i />
      <i />
    </span>
  );
}

type PanelStyle = CSSProperties & {
  '--cue-expanded-height'?: string;
};

function formatEventTime(timestamp: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - timestamp) / 60_000);
  if (minutes < 1) return 'Just now';
  return `${minutes}m`;
}

export function InterviewOverlay() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState<number>();
  const [now, setNow] = useState(() => Date.now());
  const contentRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLOListElement>(null);
  const detection = useProblemContext();
  const executionEvents = useExecutionEvents();
  const session = useInterviewSession();
  const showEventLog = import.meta.env.COMMAND === 'serve';
  const detected = detection.status === 'ready';
  const live = session.state.status === 'live';
  const starting = session.state.status === 'starting';
  const ending = session.state.status === 'ending';
  const ended = session.state.status === 'ended';
  const problemName = detected
    ? detection.problem.title
    : 'Waiting for NeetCode';
  const language = detected ? detection.problem.language : 'Not detected';

  useEffect(() => {
    setNow(Date.now());
  }, [executionEvents]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(interval);
  }, []);

  useLayoutEffect(() => {
    if (collapsed || !contentRef.current) return;

    const content = contentRef.current;
    const updateHeight = () => setExpandedHeight(content.scrollHeight + 29);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [collapsed, detected, executionEvents.length > 0, session.state.status]);

  useLayoutEffect(() => {
    const list = eventsRef.current;
    if (!list) return;
    list.scrollTop = 0;
  }, [executionEvents]);

  const style: PanelStyle | undefined = expandedHeight
    ? { '--cue-expanded-height': `${expandedHeight}px` }
    : undefined;

  return (
    <aside
      aria-label="Cue interview panel"
      className={collapsed ? 'cue-panel cue-panel-collapsed' : 'cue-panel'}
      style={style}
    >
      <div ref={contentRef} className="cue-content">
        <header className="cue-header">
          <div className="cue-identity">
            <CueMark />
            <div className="cue-collapsible-content">
              <h1>Cue</h1>
              <p>{ended ? 'Interview complete' : 'Mock interview'}</p>
            </div>
          </div>
          <button
            aria-label="Collapse interview panel"
            className="cue-icon-button cue-collapsible-content"
            onClick={() => setCollapsed(true)}
            type="button"
          >
            <CollapseIcon />
          </button>
        </header>

        <section className="cue-section cue-collapsible-content">
          <h2>Current problem</h2>
          <dl className="cue-details">
            <div>
              <dt>Problem</dt>
              <dd>
                <span
                  className={
                    detected
                      ? 'cue-status-dot cue-status-dot-ready'
                      : 'cue-status-dot'
                  }
                />
                {problemName}
              </dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd className={detected ? undefined : 'cue-empty'}>{language}</dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>
                <span
                  className={
                    live
                      ? 'cue-status-dot cue-status-dot-ready'
                      : ended
                        ? 'cue-status-dot cue-status-dot-complete'
                        : 'cue-status-dot'
                  }
                />
                {live
                  ? 'Live'
                  : ending
                    ? 'Ending'
                    : ended
                      ? 'Complete'
                      : starting
                        ? 'Starting'
                        : session.state.status === 'error'
                          ? 'Error'
                          : 'Idle'}
              </dd>
            </div>
          </dl>
        </section>

        {showEventLog && (
          <section className="cue-section cue-collapsible-content">
            <h2>Execution events</h2>
            {executionEvents.length === 0 ? (
              <p className="cue-note cue-event-empty">
                Run or submit on NeetCode to verify detection
              </p>
            ) : (
              <ol className="cue-events" ref={eventsRef}>
                {executionEvents.map((event) => (
                  <li key={`${event.type}-${event.timestamp}`}>
                    <span className="cue-event-type">
                      {event.type === 'run' ? 'Run' : 'Submit'}
                    </span>
                    <span
                      className={`cue-event-result cue-event-result-${event.result}`}
                    >
                      {event.result}
                    </span>
                    <time dateTime={new Date(event.timestamp).toISOString()}>
                      {formatEventTime(event.timestamp, now)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {live || ending ? (
          <button
            className="cue-primary cue-danger cue-collapsible-content"
            disabled={ending}
            onClick={() => {
              void session.end();
            }}
            type="button"
          >
            {ending ? 'Ending…' : 'End interview'}
          </button>
        ) : (
          <button
            className="cue-primary cue-collapsible-content"
            disabled={!detected || starting}
            onClick={() => {
              if (detection.status !== 'ready') return;
              void session.start(detection.problem);
            }}
            type="button"
          >
            {starting ? 'Starting…' : 'Start interview'}
          </button>
        )}
        {!detected && (
          <p className="cue-note cue-collapsible-content">
            Available once a problem is detected
          </p>
        )}
        {session.state.status === 'error' && (
          <p className="cue-note cue-collapsible-content">
            {session.state.message}
          </p>
        )}
      </div>

      <button
        aria-label="Open Cue interview panel"
        className="cue-open-button"
        onClick={() => setCollapsed(false)}
        tabIndex={collapsed ? 0 : -1}
        type="button"
      />
    </aside>
  );
}
