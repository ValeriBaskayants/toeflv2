import { Lock, Circle, Play, CheckCircle2, RotateCcw, type LucideIcon } from 'lucide-react';
import type { RoadmapTopicNode, TopicNodeStatus } from '@/types/roadmap/Roadmap.types';

export interface TopicStatusStyle {
  color: string;
  bg: string;
  Icon: LucideIcon;
}

export const TOPIC_STATUS_STYLE: Record<TopicNodeStatus, TopicStatusStyle> = {
  locked: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', Icon: Lock },
  available: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', Icon: Circle },
  in_progress: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: Play },
  mastered: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', Icon: CheckCircle2 },
  needs_review: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', Icon: RotateCcw },
};

export const LEVEL_COLOR: Record<string, string> = {
  'A1': '#22c55e', 'A1+': '#16a34a',
  'A2': '#14b8a6', 'A2+': '#0d9488',
  'B1': '#3b82f6', 'B1+': '#2563eb',
  'B2': '#8b5cf6', 'B2+': '#7c3aed',
  'C1': '#f59e0b', 'C2': '#ef4444',
};

export function topicPct(node: RoadmapTopicNode): number {
  const p = node.progress;
  const items = [
    p.grammar.required > 0 ? (p.grammar.completed / p.grammar.required) * 100 : 100,
    p.quiz.required > 0 ? (p.quiz.completed / p.quiz.required) * 100 : 100,
    p.reading.required > 0 ? (p.reading.completed / p.reading.required) * 100 : 100,
    p.listening.required > 0 ? (p.listening.completed / p.listening.required) * 100 : 100,
  ];
  return Math.min(100, Math.round(items.reduce((a, v) => a + v, 0) / items.length));
}