export type GuideLevel = "beginner" | "intermediate" | "advanced";
export type SessionResult = "completed" | "abandoned" | "fail" | "success";
export type SessionEventType =
  | "collision"
  | "lane"
  | "reaction"
  | "parking"
  | "feedback"
  | "state";

export interface AppMetadata {
  appName: string;
  version: string;
  projectAlias: string;
  targetVehicle: string;
  platform: string;
  sensors: string[];
  isPilot: boolean;
}

export interface UserProfile {
  nickname?: string;
  createdAt: string;
  updatedAt: string;
  privacyConsented?: boolean;
  settings?: {
    gyroSensitivity: "low" | "medium" | "high";
    parkingAssistAuto?: boolean;
  };
}

export interface Scenario {
  scenarioId: string;
  name: string;
  difficulty: GuideLevel;
  order: number;
  isPublished: boolean;
  description: string;
  learningGoals: string[];
  guideProfile: GuideLevel;
}

export interface GuideProfile {
  level: GuideLevel;
  name: string;
  handleTimingGuide: boolean;
  bodyRangeVisualization: boolean;
  reverseGuideText: boolean;
  steeringAngleMeter: boolean;
  distanceWarning: string;
  notes: string;
}

export interface CollisionMetrics {
  pedestrian: number;
  wall: number;
  vehicle: number;
}

export interface SessionMetrics {
  collision: CollisionMetrics;
  laneDeviationSec: number;
  stoplineViolation: number;
  reactionMs: number;
  parkingErrorCm?: number;
}

export interface ScoreByCategory {
  안전운전: number;
  감정조절: number;
  주차정확도: number;
}

export interface SessionFeedback {
  messages: string[];
  highlights: string[];
  scoreByCategory: ScoreByCategory;
}

export interface SessionRecord {
  userId: string;
  scenarioId: string;
  guideLevel: GuideLevel;
  vehicleType: string;
  device: {
    platform: "ios" | "android";
    sensorSensitivity: "low" | "medium" | "high";
  };
  startedAt: string;
  endedAt?: string;
  durationSec: number;
  result: SessionResult;
  totalScore: number;
  metrics: SessionMetrics;
  feedback: SessionFeedback;
  createdAt: string;
  updatedAt: string;
}

export interface SessionEvent {
  userId: string;
  sessionId: string;
  scenarioId: string;
  t: number;
  type: SessionEventType;
  data: Record<string, unknown>;
  createdAt: string;
}
