import { useState } from 'react';
import './InterviewOverlay.css';

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
        Cue
      </button>
    );
  }

  return (
    <aside aria-label="Cue interview panel" className="cue-panel">
      <header className="cue-header">
        <div>
          <span className="cue-eyebrow">Cue</span>
          <h1>AI Mock Interview</h1>
        </div>
        <button
          aria-label="Collapse interview panel"
          className="cue-icon-button"
          onClick={() => setCollapsed(true)}
          type="button"
        >
          −
        </button>
      </header>

      <dl className="cue-details">
        <div>
          <dt>Problem</dt>
          <dd>Waiting for NeetCode</dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>Not detected</dd>
        </div>
      </dl>

      <button className="cue-primary" disabled type="button">
        Start Interview
      </button>
      <p className="cue-note">Problem detection comes next.</p>
    </aside>
  );
}
