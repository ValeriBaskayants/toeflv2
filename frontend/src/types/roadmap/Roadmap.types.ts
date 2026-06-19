

export interface ExternalResource {
  title:       string;
  url:         string;
  type:        'video' | 'website' | 'podcast';
  description: string;
}

export interface SkillTask {
  skill:       string;
  label:       string;
  required:    number;
  completed:   number;
  remaining:   number;
  accuracy:    number;
  accuracyMin: number;
  sms:         number;   
  route:       string;   
  cta:         string;   
  isBlocking:  boolean;  
}

export type NodeStatus = 'completed' | 'current' | 'locked';

export interface RoadmapLevelNode {
  level:            string;
  displayName:      string;          
  status:           NodeStatus;
  readinessPercent: number;
  isReadyForTest:   boolean;
  estimatedDays:    [number, number]; 
  skills:           SkillTask[];
  bonusResources:   ExternalResource[];
}

export interface RoadmapResponse {
  nodes:         RoadmapLevelNode[];
  currentLevel:  string;
  totalProgress: number;             
  projectedDate: string | null;      
}