import { useState, useEffect, useCallback, useId } from 'react';
import {
  ShieldAlert, Users, Upload, CheckCircle2, XCircle, Loader2,
  BookOpen, CheckCheck, Layers, PenLine, Headphones, Target,
  FileText, Trash2, Copy, Check, AlertCircle, BarChart2, TerminalSquare,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import {
  fetchAdminStats,
  importContent,
  clearLog,
  resetImportState,
  selectAdminStats,
  selectAdminStatsStatus,
  selectAdminLog,
  selectImportState,
  selectTotalInserted,
  selectErrorCount,
} from '@/store/Slices/AdminSlice';
import type { ContentType } from '@/types/admin/Admin.types';
import { EXAMPLES } from '@/constants/example';
import styles from './AdminPage.module.css';

// ─── Config ───────────────────────────────────────────────────────────────────

interface ContentConfig {
  key: ContentType;
  label: string;
  short: string;
  Icon: React.ComponentType<any>;
  color: string;
}

const CONTENT_CONFIGS: ContentConfig[] = [
  { key: 'exercises',      label: 'Exercises',       short: 'EX',  Icon: CheckCheck, color: '#14b8a6' },
  { key: 'grammarRules',   label: 'Grammar Rules',   short: 'GR',  Icon: BookOpen,   color: '#22c55e' },
  { key: 'vocabulary',     label: 'Vocabulary',      short: 'VOC', Icon: Layers,     color: '#8b5cf6' },
  { key: 'readings',       label: 'Readings',        short: 'RD',  Icon: FileText,   color: '#f59e0b' },
  { key: 'multipleChoice', label: 'Multiple Choice', short: 'MC',  Icon: Target,     color: '#6366f1' },
  { key: 'writingPrompts', label: 'Writing Prompts', short: 'WR',  Icon: PenLine,    color: '#ec4899' },
  { key: 'listening',      label: 'Listening',       short: 'LS',  Icon: Headphones, color: '#f43f5e' },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ─── ImportTerminal ───────────────────────────────────────────────────────────

function ImportTerminal() {
  const textareaId = useId();
  const dispatch = useAppDispatch();

  const [activeType, setActiveType] = useState<ContentType>('exercises');
  const [json, setJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const slot = useAppSelector(selectImportState(activeType));
  const cfg = CONTENT_CONFIGS.find((c) => c.key === activeType)!;
  const isLoading = slot.status === 'loading';

  const handleTypeSwitch = useCallback((type: ContentType) => {
    setActiveType(type);
    setParseError(null);
  }, []);

  const handleJsonChange = useCallback((val: string) => {
    setJson(val);
    setParseError(null);
    if (slot.status !== 'idle') {
      dispatch(resetImportState(activeType));
    }
  }, [slot.status, dispatch, activeType]);

  const handleCopyExample = useCallback(async () => {
    await navigator.clipboard.writeText(EXAMPLES[activeType]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeType]);

  const handleLoadExample = useCallback(() => {
    setJson(EXAMPLES[activeType]);
    setParseError(null);
    dispatch(resetImportState(activeType));
  }, [activeType, dispatch]);

  const handleImport = useCallback(async () => {
    const trimmed = json.trim();
    if (trimmed.length === 0) { return; }
    setParseError(null);

    let parsed: unknown[];
    try {
      const raw: unknown = JSON.parse(trimmed);
      if (!Array.isArray(raw)) {
        throw new Error('Root must be a JSON array [ ... ]');
      }
      parsed = raw;
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }

    const result = await dispatch(importContent({ type: activeType, data: parsed }));
    if (importContent.fulfilled.match(result)) {
      setJson('');
    }
  }, [json, activeType, dispatch]);

  const handleClear = useCallback(() => {
    setJson('');
    setParseError(null);
    dispatch(resetImportState(activeType));
  }, [activeType, dispatch]);

  const hasError = parseError !== null || slot.status === 'error';

  return (
    <div className={styles['terminal']}>
      {/* ── Chrome bar ── */}
      <div className={styles['termBar']}>
        <div className={styles['termBrand']}>
          <TerminalSquare size={14} className={styles['termIcon']} />
          <span className={styles['termTitle']}>Console</span>
          <span className={styles['termDivider']}>/</span>
          <span className={styles['termPath']}>import_data</span>
        </div>
        <span className={styles['termBadge']}>ADMIN ACCESS</span>
      </div>

      {/* ── Tab strip ── */}
      <div className={styles['tabStrip']} role="tablist">
        {CONTENT_CONFIGS.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={activeType === c.key}
            className={`${styles['tab']} ${activeType === c.key ? styles['tabActive'] : ''}`}
            style={{ '--tc': c.color } as React.CSSProperties}
            onClick={() => handleTypeSwitch(c.key)}
          >
            <c.Icon size={14} />
            <span className={styles['tabLong']}>{c.label}</span>
            <span className={styles['tabShort']}>{c.short}</span>
          </button>
        ))}
      </div>

      {/* ── Split panes ── */}
      <div className={styles['splitPane']}>

        {/* Example pane — read only */}
        <div className={styles['pane']}>
          <div className={styles['paneHead']}>
            <span className={styles['panePrompt']}>
              <span className={styles['dollar']}>~</span> example
              <span className={styles['paneTypeLabel']} style={{ color: cfg.color }}>
                :{cfg.label}
              </span>
            </span>
            <div className={styles['paneHeadActions']}>
              <button type="button" className={styles['paneBtn']} onClick={handleLoadExample}>
                <Upload size={12} /> Load
              </button>
              <button type="button" className={styles['paneBtn']} onClick={() => { void handleCopyExample(); }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className={styles['editorWrapper']}>
            <pre className={styles['examplePre']}>{EXAMPLES[activeType]}</pre>
          </div>
        </div>

        <div className={styles['splitDivider']} />

        {/* Input pane — editable */}
        <div className={styles['pane']}>
          <div className={styles['paneHead']}>
            <span className={styles['panePrompt']}>
              <span className={styles['dollar']}>~</span> payload.json
            </span>
            {json.length > 0 && (
              <span className={styles['charCount']}>{json.length} chars</span>
            )}
          </div>
          <div className={styles['editorWrapper']}>
            <label htmlFor={textareaId} className={styles['srOnly']}>
              JSON for {cfg.label}
            </label>
            <textarea
              id={textareaId}
              className={`${styles['inputTA']} ${hasError ? styles['inputTAErr'] : ''}`}
              value={json}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder={'[\n  {\n    "key": "value"\n  }\n]'}
              spellCheck={false}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* ── Status + actions footer ── */}
      <div className={styles['termFooter']}>
        <div className={styles['footerLeft']}>
          {parseError !== null && (
            <span className={styles['fErr']}>
              <AlertCircle size={14} /> {parseError}
            </span>
          )}
          {slot.status === 'error' && slot.error !== null && parseError === null && (
            <span className={styles['fErr']}>
              <AlertCircle size={14} /> {slot.error}
            </span>
          )}
          {slot.status === 'success' && slot.result !== null && (
            <span className={styles['fOk']}>
              <CheckCircle2 size={14} /> 
              +{slot.result.inserted} inserted
              {slot.result.skipped > 0 && ` (${slot.result.skipped} skipped)`}
            </span>
          )}
          {isLoading && (
            <span className={styles['fLoad']}>
              <Loader2 size={14} className={styles['spin']} /> Processing...
            </span>
          )}
          {slot.status === 'idle' && !isLoading && parseError === null && (
            <span className={styles['fIdle']}>Status: Ready</span>
          )}
        </div>

        <div className={styles['footerRight']}>
          {json.trim().length > 0 && (
            <button
              type="button"
              className={styles['clearBtn']}
              onClick={handleClear}
              disabled={isLoading}
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
          <button
            type="button"
            className={styles['importBtn']}
            style={{ '--bc': cfg.color } as React.CSSProperties}
            onClick={() => { void handleImport(); }}
            disabled={isLoading || json.trim().length === 0}
          >
            {isLoading
              ? <Loader2 size={14} className={styles['spin']} />
              : <Upload size={14} />
            }
            {isLoading ? 'Importing…' : `Import ${cfg.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AdminPage (остался без изменений, только импорт TerminalSquare) ─────────

export default function AdminPage() {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectAdminStats);
  const statsStatus = useAppSelector(selectAdminStatsStatus);
  const log = useAppSelector(selectAdminLog);

  const totalInserted = useAppSelector(selectTotalInserted);
  const errorCount = useAppSelector(selectErrorCount);

  if (user === null || user.role !== 'ADMIN') { return null; }

  useEffect(() => {
    if (statsStatus === 'idle') {
      void dispatch(fetchAdminStats());
    }
  }, [statsStatus, dispatch]);

  return (
    <div className={styles['page']}>
      {/* Header */}
      <header className={styles['header']}>
        <div className={styles['headerLeft']}>
          <div className={styles['adminIcon']}><ShieldAlert size={20} /></div>
          <div>
            <h1 className={styles['pageTitle']}>Admin Panel</h1>
            <p className={styles['pageSubtitle']}>{user.email}</p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className={styles['statsRow']}>
        <div className={styles['statCard']}>
          <div className={`${styles['statIcon']} ${styles['purple']}`}><Users size={16} /></div>
          <div>
            <div className={styles['statVal']}>
              {statsStatus === 'loading' ? '…' : (stats?.platformStats.totalUsers ?? '—')}
            </div>
            <div className={styles['statLbl']}>Total users</div>
          </div>
        </div>

        <div className={styles['statCard']}>
          <div className={`${styles['statIcon']} ${styles['green']}`}><CheckCircle2 size={16} /></div>
          <div>
            <div className={styles['statVal']}>{log.filter((l) => l.status === 'success').length}</div>
            <div className={styles['statLbl']}>Imports this session</div>
          </div>
        </div>

        <div className={styles['statCard']}>
          <div className={`${styles['statIcon']} ${styles['teal']}`}><BarChart2 size={16} /></div>
          <div>
            <div className={styles['statVal']}>{totalInserted}</div>
            <div className={styles['statLbl']}>Items inserted</div>
          </div>
        </div>

        <div className={styles['statCard']}>
          <div className={`${styles['statIcon']} ${styles['red']}`}><XCircle size={16} /></div>
          <div>
            <div className={styles['statVal']}>{errorCount}</div>
            <div className={styles['statLbl']}>Errors</div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className={styles['layout']}>
        <section><ImportTerminal /></section>

        {/* Log sidebar */}
        <aside className={styles['logSidebar']}>
          <div className={styles['logHead']}>
            <h2 className={styles['logTitle']}>Import Log</h2>
            {log.length > 0 && (
              <button
                type="button"
                className={styles['clearLogBtn']}
                onClick={() => dispatch(clearLog())}
              >
                Clear
              </button>
            )}
          </div>

          <div className={styles['logList']}>
            {log.length === 0 && (
              <p className={styles['logEmpty']}>No imports yet.</p>
            )}
            {log.map((entry) => {
              const c = CONTENT_CONFIGS.find((x) => x.key === entry.type);
              return (
                <div
                  key={entry.id}
                  className={`${styles['logEntry']} ${entry.status === 'error' ? styles['lErr'] : styles['lOk']}`}
                >
                  <div className={styles['logEntryLeft']}>
                    {entry.status === 'success'
                      ? <CheckCircle2 size={12} className={styles['iconGreen']} />
                      : <XCircle     size={12} className={styles['iconRed']} />
                    }
                    <div>
                      <div className={styles['logType']}>{c?.label ?? entry.type}</div>
                      {entry.status === 'success' && (
                        <div className={styles['logMeta']}>
                          <span className={styles['logIns']}>+{entry.result.inserted}</span>
                          {entry.result.skipped > 0 && (
                            <span className={styles['logSkip']}> · {entry.result.skipped} skip</span>
                          )}
                        </div>
                      )}
                      {entry.status === 'error' && (
                        <div className={styles['logErrTxt']}>{entry.errorMessage}</div>
                      )}
                    </div>
                  </div>
                  <span className={styles['logTime']}>{formatTime(entry.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}