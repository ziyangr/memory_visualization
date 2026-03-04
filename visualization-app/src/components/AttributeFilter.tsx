// src/components/AttributeFilter.tsx

import React from 'react';
import { useEventTreeStore } from '../store/eventTreeStore';
import { CATEGORY_ICONS, LOCATION_ICONS } from '../types/event';
import { LocationType } from '../types/event';

export const AttributeFilter: React.FC = () => {
  const { filters, availableCategories, availableParticipants, actions } = useEventTreeStore();
  
  const toggleCategory = (category: string) => {
    const current = filters.categories;
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    actions.setFilter('categories', updated);
  };
  
  const toggleParticipant = (participant: string) => {
    const current = filters.participants;
    const updated = current.includes(participant)
      ? current.filter(p => p !== participant)
      : [...current, participant];
    actions.setFilter('participants', updated);
  };
  
  const toggleLocationType = (locationType: LocationType) => {
    const current = filters.locationTypes;
    const updated = current.includes(locationType)
      ? current.filter(l => l !== locationType)
      : [...current, locationType];
    actions.setFilter('locationTypes', updated);
  };
  
  const toggleHierarchyLevel = (level: number) => {
    const current = filters.hierarchyLevels;
    const updated = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level];
    actions.setFilter('hierarchyLevels', updated);
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setFilter('searchQuery', e.target.value);
  };
  
  const handleReset = () => {
    actions.resetFilters();
  };
  
  return (
    <div className="attribute-filter">
      <div className="filter-header">
        <h3>🔍 Filters</h3>
        <button className="btn-reset" onClick={handleReset}>
          Reset All
        </button>
      </div>
      
      {/* Search */}
      <div className="filter-section">
        <label className="section-label">Search</label>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search events, people, locations..."
            value={filters.searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="filter-section">
        <label className="section-label">📊 Category</label>
        <div className="checkbox-group">
          {availableCategories.map(category => (
            <label key={category} className="checkbox-item">
              <input
                type="checkbox"
                checked={!filters.categories.length || filters.categories.includes(category)}
                onChange={() => toggleCategory(category)}
              />
              <span className="category-icon">{CATEGORY_ICONS[category] || '📌'}</span>
              <span className="category-name">{category}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Hierarchy Level Filter */}
      <div className="filter-section">
        <label className="section-label">🌳 Hierarchy Level</label>
        <div className="checkbox-group">
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={filters.hierarchyLevels.includes(0)}
              onChange={() => toggleHierarchyLevel(0)}
            />
            <span className="level-indicator circle">○</span>
            <span>Parent Events</span>
          </label>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={filters.hierarchyLevels.includes(1)}
              onChange={() => toggleHierarchyLevel(1)}
            />
            <span className="level-indicator rect">▢</span>
            <span>Sub-Events</span>
          </label>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={filters.hierarchyLevels.includes(2)}
              onChange={() => toggleHierarchyLevel(2)}
            />
            <span className="level-indicator triangle">△</span>
            <span>Atomic Events</span>
          </label>
        </div>
      </div>
      
      {/* Location Type Filter */}
      <div className="filter-section">
        <label className="section-label">📍 Location Type</label>
        <div className="checkbox-group">
          {(['home', 'work', 'public', 'remote', 'unknown'] as LocationType[]).map(type => (
            <label key={type} className="checkbox-item">
              <input
                type="checkbox"
                checked={!filters.locationTypes.length || filters.locationTypes.includes(type)}
                onChange={() => toggleLocationType(type)}
              />
              <span className="location-icon">{LOCATION_ICONS[type]}</span>
              <span className="location-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Participant Filter */}
      <div className="filter-section">
        <label className="section-label">👥 Participants</label>
        <div className="participant-list">
          {availableParticipants.slice(0, 15).map(participant => (
            <button
              key={participant}
              className={`participant-tag ${filters.participants.includes(participant) ? 'active' : ''}`}
              onClick={() => toggleParticipant(participant)}
            >
              {participant}
            </button>
          ))}
          {availableParticipants.length > 15 && (
            <span className="more-count">+{availableParticipants.length - 15} more</span>
          )}
        </div>
      </div>
      
      {/* Active Filters Summary */}
      {(filters.categories.length > 0 || 
        filters.participants.length > 0 || 
        filters.locationTypes.length > 0 ||
        filters.searchQuery) && (
        <div className="active-filters-summary">
          <h4>Active Filters:</h4>
          <div className="filter-tags">
            {filters.categories.length > 0 && (
              <span className="filter-tag">
                📊 {filters.categories.length} categories
              </span>
            )}
            {filters.participants.length > 0 && (
              <span className="filter-tag">
                👥 {filters.participants.length} people
              </span>
            )}
            {filters.locationTypes.length > 0 && (
              <span className="filter-tag">
                📍 {filters.locationTypes.length} locations
              </span>
            )}
            {filters.searchQuery && (
              <span className="filter-tag">
                🔍 "{filters.searchQuery}"
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
