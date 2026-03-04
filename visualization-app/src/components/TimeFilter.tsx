// src/components/TimeFilter.tsx

import React, { useState } from 'react';
import { useEventTreeStore } from '../store/eventTreeStore';
import { format } from 'date-fns';

export const TimeFilter: React.FC = () => {
  const { filters, actions } = useEventTreeStore();
  const { timeRange } = filters;
  
  const [localStart, setLocalStart] = useState(timeRange.start);
  const [localEnd, setLocalEnd] = useState(timeRange.end);
  
  const presets = [
    { label: 'All Time', start: '2025-01-01', end: '2025-03-31' },
    { label: 'January', start: '2025-01-01', end: '2025-01-31' },
    { label: 'February', start: '2025-02-01', end: '2025-02-28' },
    { label: 'March', start: '2025-03-01', end: '2025-03-31' },
    { label: 'Last 2 Weeks', start: '2025-03-17', end: '2025-03-31' }
  ];
  
  const handleApply = () => {
    actions.setFilter('timeRange', {
      ...timeRange,
      start: localStart,
      end: localEnd,
      enabled: true
    });
  };
  
  const handlePreset = (preset: typeof presets[0]) => {
    setLocalStart(preset.start);
    setLocalEnd(preset.end);
    actions.setFilter('timeRange', {
      start: preset.start,
      end: preset.end,
      enabled: true
    });
  };
  
  const handleReset = () => {
    setLocalStart('2025-01-01');
    setLocalEnd('2025-03-31');
    actions.setFilter('timeRange', {
      start: '2025-01-01',
      end: '2025-03-31',
      enabled: false
    });
  };
  
  return (
    <div className="time-filter">
      <div className="filter-header">
        <h3>⏰ Time Filter</h3>
        <button 
          className="btn-reset" 
          onClick={handleReset}
          title="Reset time filter"
        >
          Reset
        </button>
      </div>
      
      <div className="presets">
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className={`btn-preset ${timeRange.start === preset.start && timeRange.end === preset.end && timeRange.enabled ? 'active' : ''}`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      <div className="range-inputs">
        <div className="input-group">
          <label>Start Date</label>
          <input
            type="date"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            min="2025-01-01"
            max="2025-03-31"
          />
        </div>
        
        <span className="separator">to</span>
        
        <div className="input-group">
          <label>End Date</label>
          <input
            type="date"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            min="2025-01-01"
            max="2025-03-31"
          />
        </div>
      </div>
      
      <div className="filter-actions">
        <button 
          onClick={handleApply} 
          className="btn-apply"
        >
          Apply Filter
        </button>
      </div>
      
      {timeRange.enabled && (
        <div className="active-filter-info">
          <span className="badge">
            Active: {format(new Date(timeRange.start), 'MMM d')} - {format(new Date(timeRange.end), 'MMM d, yyyy')}
          </span>
        </div>
      )}
    </div>
  );
};
