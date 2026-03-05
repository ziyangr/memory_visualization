// src/App.tsx

import { useEffect, useState, useRef } from 'react';
import { HierarchicalTree } from './components/HierarchicalTree';
import { DailyDiary } from './components/DailyDiary';
import { TimeFilter } from './components/TimeFilter';
import { AttributeFilter } from './components/AttributeFilter';
import { DetailPanel } from './components/DetailPanel';
import { Header } from './components/Header';
import { useEventTreeStore } from './store/eventTreeStore';
import './styles/App.css';

type ViewMode = 'knowledge-graph' | 'daily-diary';

function App() {
  const { actions, isLoading, error, visibleNodes } = useEventTreeStore();
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 });
  const [viewMode, setViewMode] = useState<ViewMode>('knowledge-graph');
  const containerRef = useRef<HTMLDivElement>(null);

  // Load data on mount
  useEffect(() => {
    actions.loadData('/data/event_tree_3months.json');
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zoom controls
  const handleZoom = (delta: number) => {
    const svg = document.querySelector('.hierarchical-tree');
    if (svg) {
      const currentScale = parseFloat(svg.getAttribute('data-scale') || '1');
      const newScale = Math.max(0.5, Math.min(3, currentScale + delta));
      svg.setAttribute('data-scale', String(newScale));
      svg.setAttribute(
        'transform',
        `scale(${newScale}) translate(${(1 - newScale) * containerSize.width / 2 / newScale}, ${(1 - newScale) * containerSize.height / 2 / newScale})`
      );
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading event data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>❌ Error Loading Data</h2>
        <p>{error}</p>
        <button onClick={() => actions.loadData('/data/event_tree_3months.json')}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />

      <div className="app-body">
        {/* Left Sidebar - Filters */}
        <aside className="sidebar sidebar-left">
          <div className="sidebar-content">
            <TimeFilter />
            <AttributeFilter />

            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button
                className={`toggle-btn ${viewMode === 'knowledge-graph' ? 'active' : ''}`}
                onClick={() => setViewMode('knowledge-graph')}
              >
                🕸️ Knowledge Graph
              </button>
              <button
                className={`toggle-btn ${viewMode === 'daily-diary' ? 'active' : ''}`}
                onClick={() => setViewMode('daily-diary')}
              >
                📔 Daily Diary
              </button>
            </div>
          </div>
        </aside>

        {/* Main Canvas */}
        <main className="main-canvas" ref={containerRef}>
          {viewMode === 'knowledge-graph' && (
            <>
              <div className="canvas-toolbar">
                <div className="zoom-controls">
                  <button onClick={() => handleZoom(-0.1)} title="Zoom Out">−</button>
                  <span>Zoom</span>
                  <button onClick={() => handleZoom(0.1)} title="Zoom In">+</button>
                </div>
                <div className="visible-count">
                  Showing: {visibleNodes.length} events
                </div>
              </div>

              <HierarchicalTree
                width={containerSize.width}
                height={containerSize.height}
              />
            </>
          )}

          {viewMode === 'daily-diary' && (
            <DailyDiary />
          )}
        </main>

        {/* Right Sidebar - Detail Panel */}
        <aside className="sidebar sidebar-right">
          <DetailPanel />
        </aside>
      </div>

      {/* Legend */}
      <footer className="app-legend">
        <div className="legend-section">
          <span className="legend-title">Hierarchy:</span>
          <span className="legend-item">
            <span className="legend-shape circle"></span> Parent Event
          </span>
          <span className="legend-item">
            <span className="legend-shape rect"></span> Sub-Event
          </span>
          <span className="legend-item">
            <span className="legend-shape triangle"></span> Atomic Event
          </span>
        </div>
        <div className="legend-section">
          <span className="legend-title">Categories:</span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#8B5CF6' }}></span> Persona
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#2E86AB' }}></span> Career
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#DC3545' }}></span> Family
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#6A4C93' }}></span> Personal
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#F18F01' }}></span> Relationships
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#06A77D' }}></span> Health
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#C73E1D' }}></span> Education
          </span>
          <span className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#198754' }}></span> Finance
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
