import { useTranslation } from 'react-i18next';
import {
  BookOpen, PenLine, Headphones, HelpCircle, SpellCheck, BookMarked, Mic, Shuffle,
  type LucideIcon,
} from 'lucide-react';
import type { SkillBreakdown } from '@/types/progress/Progress.types';
import styles from './SkillBreakdownGrid.module.css';

interface SkillConfigItem {
  key: string;
  Icon: LucideIcon;
  color: string;
  labelKey: string;
}

const SKILL_CONFIG: SkillConfigItem[] = [
  { key: 'grammar', Icon: SpellCheck, color: '#14b8a6', labelKey: 'skills.grammar' },
  { key: 'vocabulary', Icon: BookMarked, color: '#8b5cf6', labelKey: 'skills.vocabulary' },
  { key: 'reading', Icon: BookOpen, color: '#22c55e', labelKey: 'skills.reading' },
  { key: 'writing', Icon: PenLine, color: '#f59e0b', labelKey: 'skills.writing' },
  { key: 'listening', Icon: Headphones, color: '#3b82f6', labelKey: 'skills.listening' },
  { key: 'quiz', Icon: HelpCircle, color: '#6366f1', labelKey: 'skills.quiz' },
  { key: 'speaking', Icon: Mic, color: '#ec4899', labelKey: 'skills.speaking' },
  { key: 'scramble', Icon: Shuffle, color: '#0d9488', labelKey: 'skills.scramble' },
];

interface SkillBreakdownCardProps {
  config: SkillConfigItem;
  breakdown: SkillBreakdown;
}

function SkillBreakdownCard({ config, breakdown }: SkillBreakdownCardProps) {
  const { t } = useTranslation();
  const { Icon, color, labelKey } = config;
  const isPercentOnly = breakdown.required === 0;
  const footLeft = isPercentOnly
    ? `${Math.round(breakdown.accuracy)}%`
    : `${breakdown.completed}/${breakdown.required}`;

  return (
    <div className={`${styles['skillCard']} ${breakdown.isBottleneck ? styles['skillCardBottleneck'] : ''}`}>
      <div className={styles['skillCardHead']}>
        <div className={styles['skillCardIco']} style={{ color, background: `${color}18` }}>
          <Icon size={15} />
        </div>
        <span className={styles['skillCardLabel']}>{t(labelKey)}</span>
        {breakdown.isBottleneck && <span className={styles['skillCardBadge']}>{t('progress.bottleneck')}</span>}
      </div>
      <div className={styles['skillCardBar']}>
        <div className={styles['skillCardBarFill']} style={{ width: `${breakdown.sms}%`, background: color }} />
      </div>
      <div className={styles['skillCardFoot']}>
        <span>{footLeft}</span>
        <span>{breakdown.sms}%</span>
      </div>
    </div>
  );
}

interface SkillBreakdownGridProps {
  skillBreakdown: Record<string, SkillBreakdown>;
}

export function SkillBreakdownGrid({ skillBreakdown }: SkillBreakdownGridProps) {
  const { t } = useTranslation();

  return (
    <div className={`${styles['section']} ${styles['skillSection']}`}>
      <h2 className={styles['sectionHeading']}>{t('progress.skillBreakdown')}</h2>
      <div className={styles['skillGrid']}>
        {SKILL_CONFIG.map((config) => {
          const breakdown = skillBreakdown[config.key];
          if (breakdown === undefined) return null;
          return <SkillBreakdownCard key={config.key} config={config} breakdown={breakdown} />;
        })}
      </div>
    </div>
  );
}