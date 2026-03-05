// src/types/event.ts

export interface Participant {
  name: string;
  relation: string;
}

export interface Persona {
  name: string;
  birth: string;
  age: number;
  nationality: string;
  home_address: {
    province: string;
    city: string;
    district: string;
    street_name: string;
    street_number: string;
  };
  birth_place: {
    province: string;
    city: string;
    district?: string;
  };
  gender: string;
  education: string;
  job: string;
  occupation: string;
  workplace: {
    province: string;
    city: string;
    district: string;
    street_name: string;
    street_number: string;
  };
  belief: string;
  salary: number;
  body: {
    height: number;
    weight: number;
    BMI: number;
  };
  family: string;
  personality: {
    mbti: string;
    traits: string[];
  };
  hobbies: string[];
  favorite_foods: string[];
  memory_date: string[];
  aim: string[];
  healthy_desc: string;
  lifestyle_desc: string;
  economic_desc: string;
  work_desc: string;
  experience_desc: string;
  description: string;
  relation: Array<Array<{
    name: string;
    relation: string;
    "social circle": string;
    gender: string;
    age: number;
    birth_date: string;
    home_address: {
      province: string;
      city: string;
      district: string;
      street_name: string;
      street_number: string;
    };
    birth_place: {
      province: string;
      city: string;
      district?: string;
    };
    personality: string;
    economic_level: string;
    occupation: string;
    organization: string;
    nickname: string;
    relation_description: string;
  }>>;
}

export interface SubEvent {
  event_id: string;
  name: string;
  date: string[];
  type: string;
  description: string;
  participant: Participant[];
  location: string;
  decompose: 0 | 1;
}

export interface EventNode {
  // Raw attributes from JSON
  event_id: number | string;
  name: string;
  description: string;
  date: string[];
  type: string;
  participant: Participant[];
  location: string;
  decompose: 0 | 1;
  subevent?: SubEvent[];
  
  // Derived attributes
  depth: number;
  subeventCount: number;
  participantCount: number;
  duration: number;  // in hours
  startDate: Date;
  endDate: Date;
  locationType: 'home' | 'work' | 'public' | 'remote' | 'unknown';
  category: string;
  parentId?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'CONTAINS' | 'PARTICIPATED_IN' | 'OCCURRED_AT' | 'PRECEDES';
  attributes: {
    order?: number;
    temporalGap?: number;
    relation?: string;
  };
}

export interface GraphData {
  nodes: Map<string, EventNode>;
  edges: GraphEdge[];
}

export type LocationType = 'home' | 'work' | 'public' | 'remote' | 'unknown';

export const CATEGORY_COLORS: Record<string, { main: string; light: string; dark: string; glow: string }> = {
  Career: {
    main: '#2E86AB',
    light: '#DBEAFE',
    dark: '#1E5A7A',
    glow: 'rgba(46, 134, 171, 0.5)'
  },
  'Family&Living Situation': {
    main: '#DC3545',
    light: '#FEE2E2',
    dark: '#B91C1C',
    glow: 'rgba(220, 53, 69, 0.5)'
  },
  'Personal Life': {
    main: '#6A4C93',
    light: '#E9D5FF',
    dark: '#4C326E',
    glow: 'rgba(106, 76, 147, 0.5)'
  },
  Relationships: {
    main: '#F18F01',
    light: '#FEF3C7',
    dark: '#C67300',
    glow: 'rgba(241, 143, 1, 0.5)'
  },
  Health: {
    main: '#06A77D',
    light: '#D1FAE5',
    dark: '#047857',
    glow: 'rgba(6, 167, 125, 0.5)'
  },
  Education: {
    main: '#C73E1D',
    light: '#FED7D7',
    dark: '#9B2C15',
    glow: 'rgba(199, 62, 29, 0.5)'
  },
  Finance: {
    main: '#198754',
    light: '#A7F3D0',
    dark: '#0F5132',
    glow: 'rgba(25, 135, 84, 0.5)'
  },
  Persona: {
    main: '#8B5CF6',
    light: '#EDE9FE',
    dark: '#6D28D9',
    glow: 'rgba(139, 92, 246, 0.5)'
  }
};

export const LOCATION_COLORS: Record<LocationType, string> = {
  home: '#6F42C1',
  work: '#20C997',
  public: '#E83E8C',
  remote: '#6C757D',
  unknown: '#9CA3AF'
};

export const CATEGORY_ICONS: Record<string, string> = {
  Career: '💼',
  'Family&Living Situation': '🏠',
  'Personal Life': '🎯',
  Relationships: '👥',
  Health: '🏃',
  Education: '📚',
  Finance: '💰',
  Persona: '👤'
};

export const LOCATION_ICONS: Record<LocationType, string> = {
  home: '🏠',
  work: '🏢',
  public: '🍽️',
  remote: '🌍',
  unknown: '❓'
};
