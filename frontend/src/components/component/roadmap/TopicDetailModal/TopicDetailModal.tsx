// components/roadmap/TopicDetailModal/TopicDetailModal.tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink, Lock, ChevronRight } from 'lucide-react';
import { roadmapApi } from '@/api/services/roadmap';
import type { TopicDetailResponse } from '@/types/roadmap/Roadmap.types';
import { Spinner } from '@/components/ui/Spinner';
import styles from './TopicDetailModal.module.css';

interface TopicDetailModalProps {
  slug: string;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

const SOURCE_LABEL_KEY: Record<string, string> = {
  grammar: 'skills.grammar',
  quiz: 'skills.quiz',
  reading: 'skills.reading',
  scramble: 'skills.scramble',
};

export function TopicDetailModal({ slug, onClose, onNavigate }: TopicDetailModalProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<TopicDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData(null);

    roadmapApi
      .getTopicDetail(slug)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(t('topicDetail.error'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={styles['overlay']}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles['modal']}>
        <button type="button" className={styles['close']} onClick={onClose} aria-label={t('common.close')}>
          <X size={16} />
        </button>

        {isLoading && (
          <div className={styles['state']}>
            <Spinner size="md" label={t('topicDetail.loading')} />
          </div>
        )}

        {!isLoading && error !== null && (
          <div className={styles['state']}>
            <p className={styles['errorText']}>{error}</p>
          </div>
        )}

        {!isLoading && error === null && data !== null && (
          <>
            <div className={styles['head']}>
              <span className={styles['order']}>#{data.order}</span>
              <h2 className={styles['title']}>{data.title}</h2>
              <p className={styles['summary']}>{data.summary}</p>
            </div>

            {data.missingPrerequisites.length > 0 && (
              <div className={styles['prereqBox']}>
                <Lock size={13} />
                <div>
                  <div className={styles['prereqTitle']}>{t('topicDetail.missingPrereq')}</div>
                  <div className={styles['prereqList']}>{data.missingPrerequisites.join(', ')}</div>
                </div>
              </div>
            )}

            {data.hasAnyContent ? (
              <div className={styles['sourcesSection']}>
                <div className={styles['sectionLabel']}>{t('topicDetail.practiceSources')}</div>
                <div className={styles['sourcesList']}>
                  {data.practiceSources.map((source) => {
                    const pct =
                      source.totalCount > 0
                        ? Math.min(100, Math.round((source.completedCount / source.totalCount) * 100))
                        : 0;
                    const labelKey = SOURCE_LABEL_KEY[source.type];
                    return (
                      <button
                        key={source.type}
                        type="button"
                        className={styles['sourceRow']}
                        onClick={() => onNavigate(source.browseUrl)}
                      >
                        <div className={styles['sourceInfo']}>
                          <span className={styles['sourceLabel']}>
                            {labelKey !== undefined ? t(labelKey) : source.label}
                          </span>
                          <span className={styles['sourceCount']}>
                            {t('topicDetail.completedOf', {
                              completed: source.completedCount,
                              total: source.totalCount,
                            })}
                          </span>
                        </div>
                        <div className={styles['sourceBar']}>
                          <div className={styles['sourceBarFill']} style={{ width: `${pct}%` }} />
                        </div>
                        <ChevronRight size={14} className={styles['sourceArrow']} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={styles['noContent']}>
                <p>{t('topicDetail.noSources')}</p>
                <p className={styles['noContentHint']}>
                  {t('topicDetail.noSourcesHint', { title: data.title })}
                </p>
              </div>
            )}

            {data.internalPageUrl !== null && (
              <button
                type="button"
                className={styles['internalLinkBtn']}
                onClick={() => onNavigate(data.internalPageUrl as string)}
              >
                {t('topicDetail.ourPage')}
                <ChevronRight size={14} />
              </button>
            )}

            {data.resources.length > 0 && (
              <div className={styles['resourcesSection']}>
                <div className={styles['sectionLabel']}>{t('topicDetail.externalResources')}</div>
                <div className={styles['resourcesList']}>
                  {data.resources.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles['resourceLink']}
                    >
                      <ExternalLink size={12} />
                      <span>{r.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}