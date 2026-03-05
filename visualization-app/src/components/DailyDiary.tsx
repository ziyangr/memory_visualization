// src/components/DailyDiary.tsx

import React, { useMemo } from 'react';
import { useEventTreeStore } from '../store/eventTreeStore';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../types/event';
import { format } from 'date-fns';

interface DailyEvent {
  event_id: string;
  name: string;
  date: string[];
  type: string;
  description: string;
  participant: { name: string; relation: string }[];
  location: string;
  atomic_id: string[];
}

export const DailyDiary: React.FC = () => {
  const { filters, actions, atomicEventMap, dailyEvents } = useEventTreeStore();
  const [selectedEvent, setSelectedEvent] = React.useState<DailyEvent | null>(null);

  // Filter daily events using the same filters as knowledge graph
  const filteredEvents = useMemo(() => {
    return dailyEvents.filter(event => {
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(event.type)) {
        return false;
      }

      // Time filter
      if (filters.timeRange.enabled) {
        const eventDate = new Date(event.date[0].split('至')[0].trim());
        const startDate = new Date(filters.timeRange.start);
        const endDate = new Date(filters.timeRange.end);
        if (eventDate < startDate || eventDate > endDate) {
          return false;
        }
      }

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = event.name.toLowerCase().includes(query);
        const matchesDesc = event.description.toLowerCase().includes(query);
        const matchesParticipant = event.participant.some(p =>
          p.name.toLowerCase().includes(query)
        );
        const matchesLocation = event.location.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesParticipant && !matchesLocation) {
          return false;
        }
      }

      // Participant filter
      if (filters.participants.length > 0) {
        const hasParticipant = event.participant.some(p =>
          filters.participants.includes(p.name)
        );
        if (!hasParticipant) return false;
      }

      return true;
    });
  }, [dailyEvents, filters]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, DailyEvent[]> = {};
    filteredEvents.forEach(event => {
      const dateKey = event.date[0].split('至')[0].trim().split(' ')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [filteredEvents]);

  // Sort dates (newest first)
  const sortedDates = Object.keys(eventsByDate).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Get linked KG nodes for an event
  const getLinkedKGNodes = (atomicIds: string[]) => {
    return atomicIds
      .map(id => atomicEventMap.get(id))
      .filter(Boolean);
  };

  // Handle event click - navigate to KG
  const handleEventClick = (event: DailyEvent) => {
    setSelectedEvent(event);
    if (event.atomic_id && event.atomic_id.length > 0) {
      const linkedNodes = getLinkedKGNodes(event.atomic_id);
      if (linkedNodes.length > 0) {
        const targetNode = linkedNodes[0];
        if (targetNode?.parentId) {
          actions.toggleNode(targetNode.parentId);
        }
        actions.selectNode(targetNode?.event_id || null);
      }
    }
  };

  // Calculate stats
  const linkedCount = filteredEvents.filter(e => e.atomic_id?.length > 0).length;
  const totalEvents = filteredEvents.length;

  return (
    <div className="daily-diary-container">
      {/* Daily Diary Header */}
      <div className="diary-header-section">
        <div className="diary-title-section">
          <h2>📔 Daily Diary</h2>
          <p className="diary-subtitle">
            View and filter your daily events, linked to knowledge graph
          </p>
        </div>

        <div className="diary-stats">
          <div className="stat-item">
            <span className="stat-value">{totalEvents}</span>
            <span className="stat-label">Events</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{linkedCount}</span>
            <span className="stat-label">Linked to KG</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{sortedDates.length}</span>
            <span className="stat-label">Days</span>
          </div>
        </div>
      </div>

      <div className="diary-content-wrapper">
        {/* Events Timeline */}
        <div className="diary-timeline">
          {sortedDates.length === 0 ? (
            <div className="empty-state">
              <h3>No events found</h3>
              <p>Try adjusting your filters to see more events</p>
            </div>
          ) : (
            sortedDates.map(date => {
              const dateEvents = eventsByDate[date];
              const dateObj = new Date(date);
              const isToday = format(dateObj, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <div key={date} className="date-group">
                  <div className={`date-header ${isToday ? 'today' : ''}`}>
                    <div className="date-info">
                      <span className="date-weekday">
                        {format(dateObj, 'EEEE')}
                      </span>
                      <span className="date-full">
                        {format(dateObj, 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <span className="event-count-badge">
                      {dateEvents.length} events
                    </span>
                  </div>

                  <div className="events-grid">
                    {dateEvents.map(event => {
                      const colors = CATEGORY_COLORS[event.type] || CATEGORY_COLORS['Personal Life'];
                      const hasLink = event.atomic_id?.length > 0;
                      const linkedNodes = getLinkedKGNodes(event.atomic_id || []);
                      const timeStr = event.date[0].split('至')[0].trim().split(' ')[1]?.substring(0, 5) || '';

                      return (
                        <div
                          key={event.event_id}
                          className={`event-card ${hasLink ? 'has-link' : ''} ${selectedEvent?.event_id === event.event_id ? 'selected' : ''}`}
                          onClick={() => handleEventClick(event)}
                          style={{ borderLeftColor: colors.main }}
                        >
                          <div className="event-card-top">
                            <span
                              className="event-type-badge"
                              style={{ backgroundColor: colors.light, color: colors.dark }}
                            >
                              {CATEGORY_ICONS[event.type] || '📌'} {event.type}
                            </span>
                            {hasLink && (
                              <span className="link-indicator" title="Linked to KG">
                                🔗
                              </span>
                            )}
                          </div>

                          <div className="event-time">{timeStr}</div>

                          <h4 className="event-card-title">{event.name}</h4>

                          <p className="event-card-desc">{event.description}</p>

                          <div className="event-card-meta">
                            <div className="meta-item">
                              <span className="meta-icon">👥</span>
                              <span className="meta-text">
                                {event.participant.map(p => p.name).join(', ')}
                              </span>
                            </div>
                            <div className="meta-item">
                              <span className="meta-icon">📍</span>
                              <span className="meta-text location-text">{event.location}</span>
                            </div>
                          </div>

                          {hasLink && linkedNodes.length > 0 && (
                            <div className="kg-links">
                              <span className="kg-link-label">Linked to:</span>
                              <div className="kg-link-tags">
                                {linkedNodes.slice(0, 3).map((node, idx) => (
                                  <span key={idx} className="kg-tag">{node?.name || 'Unknown'}</span>
                                ))}
                                {linkedNodes.length > 3 && (
                                  <span className="kg-tag more">+{linkedNodes.length - 3}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
