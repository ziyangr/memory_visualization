// src/components/Header.tsx

import React from 'react';
import { useEventTreeStore } from '../store/eventTreeStore';

export const Header: React.FC = () => {
  const { statistics, view, actions } = useEventTreeStore();
  const { viewMode, showLabels, showEdges } = view;

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">
          🌳 Event Tree Knowledge Graph
        </h1>
        <span className="app-subtitle">
          Personal Knowledge Graph Visualization
        </span>
      </div>

      <div className="header-center">
        {/* View Mode Toggle */}
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
            onClick={() => actions.setViewMode('tree')}
            title="Tree View"
          >
            🌳 Tree
          </button>
        </div>

        {/* Display Options */}
        <div className="display-options">
          <button
            className={`option-btn ${showLabels ? 'active' : ''}`}
            onClick={actions.toggleLabels}
            title="Toggle Labels"
          >
            🏷️ Labels
          </button>
          <button
            className={`option-btn ${showEdges ? 'active' : ''}`}
            onClick={actions.toggleEdges}
            title="Toggle Edges"
          >
            🔗 Edges
          </button>
        </div>

        {/* Expand/Collapse Controls */}
        <div className="expand-controls">
          <button
            className="btn-control"
            onClick={actions.expandAll}
            title="Expand All"
          >
            ⊞ Expand All
          </button>
          <button
            className="btn-control"
            onClick={() => actions.expandToLevel(1)}
            title="Expand to Level 1"
          >
            Level 1
          </button>
          <button
            className="btn-control"
            onClick={() => actions.expandToLevel(2)}
            title="Expand to Level 2"
          >
            Level 2
          </button>
          <button
            className="btn-control"
            onClick={actions.collapseAll}
            title="Collapse All"
          >
            ⊟ Collapse All
          </button>
        </div>
      </div>

      <div className="header-right">
        {/* Statistics Summary */}
        {statistics && (
          <div className="stats-summary">
            <div className="stat-badge">
              <span className="stat-number">{statistics.totalEvents}</span>
              <span className="stat-label">Events</span>
            </div>
            <div className="stat-badge">
              <span className="stat-number">{statistics.parentEvents}</span>
              <span className="stat-label">Parent</span>
            </div>
            <div className="stat-badge">
              <span className="stat-number">{statistics.subEvents}</span>
              <span className="stat-label">Sub</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
