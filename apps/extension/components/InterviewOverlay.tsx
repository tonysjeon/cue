import { useState } from 'react';
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

function ExpandIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="M3.5 2.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      <path d="M5.5 3v10" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="m10 5-3 3 3 3"
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

export function InterviewOverlay() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        aria-label="Open Cue interview panel"
        className="cue-launcher"
        onClick={() => setCollapsed(false)}
        type="button"
      >
        <CueMark />
        <span className="cue-launcher-copy">
          <span className="cue-launcher-label">Cue</span>
          <span className="cue-launcher-action">
            <ExpandIcon />
            Expand
          </span>
        </span>
      </button>
    );
  }

  return (
    <aside aria-label="Cue interview panel" className="cue-panel">
      <header className="cue-header">
        <div className="cue-identity">
          <CueMark />
          <div>
            <h1>Cue</h1>
            <p>Mock interview</p>
          </div>
        </div>
        <button
          aria-label="Collapse interview panel"
          className="cue-icon-button"
          onClick={() => setCollapsed(true)}
          type="button"
        >
          <CollapseIcon />
        </button>
      </header>

      <section className="cue-section">
        <h2>Current problem</h2>
        <dl className="cue-details">
          <div>
            <dt>Problem</dt>
            <dd>
              <span className="cue-waiting-dot" />
              Waiting for NeetCode
            </dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd className="cue-empty">Not detected</dd>
          </div>
        </dl>
      </section>

      <button className="cue-primary" disabled type="button">
        Start interview
      </button>
      <p className="cue-note">Available once a problem is detected</p>
    </aside>
  );
}
