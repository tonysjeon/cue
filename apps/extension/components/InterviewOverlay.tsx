import type { CSSProperties } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
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

export function InterviewOverlay() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState<number>();
  const contentRef = useRef<HTMLDivElement>(null);
  const detection = useProblemContext();
  const detected = detection.status === 'ready';
  const problemName = detected
    ? detection.problem.title
    : 'Waiting for NeetCode';
  const language = detected ? detection.problem.language : 'Not detected';

  useLayoutEffect(() => {
    if (collapsed || !contentRef.current) return;

    const content = contentRef.current;
    const updateHeight = () => setExpandedHeight(content.scrollHeight + 29);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [collapsed, detected]);

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
              <p>Mock interview</p>
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
          </dl>
        </section>

        <button
          className="cue-primary cue-collapsible-content"
          disabled={!detected}
          type="button"
        >
          Start interview
        </button>
        {!detected && (
          <p className="cue-note cue-collapsible-content">
            Available once a problem is detected
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
