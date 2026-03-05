// src/components/DetailPanel.tsx

import React from 'react';
import { useEventTreeStore } from '../store/eventTreeStore';
import { CATEGORY_ICONS, LOCATION_ICONS, CATEGORY_COLORS } from '../types/event';
import { format } from 'date-fns';

export const DetailPanel: React.FC = () => {
  const { view, nodes, actions, persona } = useEventTreeStore();
  const { selectedNode } = view;

  if (!selectedNode) {
    return (
      <div className="detail-panel empty">
        <div className="empty-state">
          <h3>📋 Event Details</h3>
          <p>Click on an event node to view its details</p>
        </div>
      </div>
    );
  }

  // Check if selected node is the persona root
  if (selectedNode === 'persona-root' && persona) {
    return (
      <div className="detail-panel">
        <div className="panel-header">
          <button className="btn-close" onClick={() => actions.selectNode(null)}>
            ✕
          </button>
        </div>

        <div className="panel-content">
          {/* Persona Header */}
          <div
            className="event-header"
            style={{ borderLeftColor: '#6A4C93' }}
          >
            <span className="category-icon" style={{ fontSize: '24px' }}>👤</span>
            <h2 className="event-title">{persona.name}</h2>
            <span className="event-category" style={{ backgroundColor: '#E9D5FF', color: '#4C326E' }}>
              Persona
            </span>
          </div>

          {/* Basic Info */}
          <div className="info-section">
            <h3>Basic Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name</span>
                <span className="info-value">{persona.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value">{persona.gender}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Age</span>
                <span className="info-value">{persona.age}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Birth Date</span>
                <span className="info-value">{persona.birth}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Nationality</span>
                <span className="info-value">{persona.nationality}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Education</span>
                <span className="info-value">{persona.education}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="info-section">
            <h3>Description</h3>
            <p className="event-description">{persona.description}</p>
          </div>

          {/* Job & Occupation */}
          <div className="info-section">
            <h3>💼 Occupation</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Job</span>
                <span className="info-value">{persona.job}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Organization</span>
                <span className="info-value">{persona.occupation}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Workplace</span>
                <span className="info-value">
                  {persona.workplace.province}{persona.workplace.city}{persona.workplace.district}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Salary</span>
                <span className="info-value">¥{persona.salary.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Home Address */}
          <div className="info-section">
            <h3>🏠 Home Address</h3>
            <div className="location-detail">
              <span className="location-icon">🏠</span>
              <div>
                <span className="location-name">
                  {persona.home_address.province}{persona.home_address.city}{persona.home_address.district}{persona.home_address.street_name}{persona.home_address.street_number}
                </span>
              </div>
            </div>
          </div>

          {/* Personality */}
          <div className="info-section">
            <h3>🧠 Personality</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">MBTI</span>
                <span className="info-value">{persona.personality.mbti}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Traits</span>
                <span className="info-value">{persona.personality.traits.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Body Stats */}
          <div className="info-section">
            <h3>💪 Body Statistics</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Height</span>
                <span className="info-value">{persona.body.height} cm</span>
              </div>
              <div className="info-item">
                <span className="info-label">Weight</span>
                <span className="info-value">{persona.body.weight} kg</span>
              </div>
              <div className="info-item">
                <span className="info-label">BMI</span>
                <span className="info-value">{persona.body.BMI.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Hobbies */}
          <div className="info-section">
            <h3>🎯 Hobbies</h3>
            <div className="participant-list-detail">
              {persona.hobbies.map((hobby, idx) => (
                <div key={idx} className="participant-item">
                  <span className="participant-name">{hobby}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Favorite Foods */}
          <div className="info-section">
            <h3>🍽️ Favorite Foods</h3>
            <div className="participant-list-detail">
              {persona.favorite_foods.map((food, idx) => (
                <div key={idx} className="participant-item">
                  <span className="participant-name">{food}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aims */}
          <div className="info-section">
            <h3>🎯 Life Aims</h3>
            <div className="participant-list-detail">
              {persona.aim.map((aim, idx) => (
                <div key={idx} className="participant-item">
                  <span className="participant-name">{aim}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Health Description */}
          <div className="info-section">
            <h3>💚 Health Status</h3>
            <p className="event-description">{persona.healthy_desc}</p>
          </div>

          {/* Lifestyle Description */}
          <div className="info-section">
            <h3>🏡 Lifestyle</h3>
            <p className="event-description">{persona.lifestyle_desc}</p>
          </div>

          {/* Economic Description */}
          <div className="info-section">
            <h3>💰 Economic Status</h3>
            <p className="event-description">{persona.economic_desc}</p>
          </div>

          {/* Work Description */}
          <div className="info-section">
            <h3>💼 Work Life</h3>
            <p className="event-description">{persona.work_desc}</p>
          </div>

          {/* Experience Description */}
          <div className="info-section">
            <h3>📖 Life Experience</h3>
            <p className="event-description">{persona.experience_desc}</p>
          </div>

          {/* Family Status */}
          <div className="info-section">
            <h3>👨‍👩‍👧 Family Status</h3>
            <div className="info-item">
              <span className="info-value">{persona.family}</span>
            </div>
          </div>

          {/* Belief */}
          <div className="info-section">
            <h3>🙏 Belief</h3>
            <div className="info-item">
              <span className="info-value">{persona.belief}</span>
            </div>
          </div>

          {/* Relations Summary */}
          <div className="info-section">
            <h3>👥 Social Relations</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{persona.relation.length}</span>
                <span className="stat-label">Social Circles</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {persona.relation.reduce((sum, circle) => sum + circle.length, 0)}
                </span>
                <span className="stat-label">Total Relations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const node = nodes.get(selectedNode);
  
  if (!node) {
    return null;
  }
  
  const colors = CATEGORY_COLORS[node.type] || CATEGORY_COLORS['Personal Life'];
  
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr.split('至')[0].trim()), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };
  
  const calculateDuration = () => {
    if (node.duration >= 24) {
      return `${Math.round(node.duration / 24)} days`;
    } else if (node.duration >= 1) {
      return `${node.duration.toFixed(1)} hours`;
    } else {
      return `${Math.round(node.duration * 60)} minutes`;
    }
  };
  
  return (
    <div className="detail-panel">
      <div className="panel-header">
        <button className="btn-close" onClick={() => actions.selectNode(null)}>
          ✕
        </button>
      </div>
      
      <div className="panel-content">
        {/* Header with category color */}
        <div 
          className="event-header"
          style={{ borderLeftColor: colors.main }}
        >
          <span className="category-icon" style={{ fontSize: '24px' }}>
            {CATEGORY_ICONS[node.type] || '📌'}
          </span>
          <h2 className="event-title">{node.name}</h2>
          <span className="event-category" style={{ backgroundColor: colors.light, color: colors.dark }}>
            {node.type}
          </span>
        </div>
        
        {/* Basic Info */}
        <div className="info-section">
          <h3>Basic Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Event ID</span>
              <span className="info-value">{node.event_id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Hierarchy Level</span>
              <span className="info-value">
                {node.depth === 0 ? 'Parent Event' : node.depth === 1 ? 'Sub-Event' : 'Atomic Event'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Date</span>
              <span className="info-value">{formatDate(node.date[0])}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Duration</span>
              <span className="info-value">{calculateDuration()}</span>
            </div>
          </div>
        </div>
        
        {/* Description */}
        <div className="info-section">
          <h3>Description</h3>
          <p className="event-description">{node.description}</p>
        </div>
        
        {/* Participants */}
        <div className="info-section">
          <h3>👥 Participants ({node.participantCount})</h3>
          <div className="participant-list-detail">
            {node.participant.map((p, idx) => (
              <div key={idx} className="participant-item">
                <span className="participant-name">{p.name}</span>
                <span className="participant-relation">{p.relation}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Location */}
        <div className="info-section">
          <h3>📍 Location</h3>
          <div className="location-detail">
            <span className="location-icon">{LOCATION_ICONS[node.locationType]}</span>
            <div>
              <span className="location-name">{node.location || 'Unknown'}</span>
              <span className="location-type">{node.locationType}</span>
            </div>
          </div>
        </div>
        
        {/* Hierarchy Info */}
        {node.decompose === 1 && node.subevent && (
          <div className="info-section">
            <h3>🌳 Sub-Events ({node.subevent.length})</h3>
            <div className="subevent-list">
              {node.subevent.map((sub, idx) => (
                <div 
                  key={idx} 
                  className="subevent-item"
                  onClick={() => {
                    const subId = String(sub.event_id);
                    if (nodes.has(subId)) {
                      actions.selectNode(subId);
                    }
                  }}
                  style={{ cursor: nodes.has(String(sub.event_id)) ? 'pointer' : 'default' }}
                >
                  <span className="subevent-number">{idx + 1}</span>
                  <span className="subevent-name">{sub.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Parent Event Link */}
        {node.parentId && (
          <div className="info-section">
            <h3>⬆️ Parent Event</h3>
            <button 
              className="btn-link"
              onClick={() => actions.selectNode(node.parentId!)}
            >
              View Parent: {nodes.get(node.parentId)?.name || node.parentId}
            </button>
          </div>
        )}
        
        {/* Statistics */}
        <div className="info-section">
          <h3>📊 Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{node.depth + 1}</span>
              <span className="stat-label">Hierarchy Depth</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{node.participantCount}</span>
              <span className="stat-label">Participants</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{node.subeventCount}</span>
              <span className="stat-label">Sub-Events</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
