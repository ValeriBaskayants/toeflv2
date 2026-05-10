import { useState, useEffect, useCallback, useId } from 'react';
import {
  ShieldAlert, Users, Upload, CheckCircle2, XCircle,
  Loader2, ChevronDown, BookOpen, CheckCheck, Layers,
  PenLine, Headphones, Target, FileText, Trash2, Copy, RotateCcw,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import {
  fetchAdminStats, importContent, clearLog, resetImportState,
  selectAdminStats, selectAdminStatsStatus, selectAdminLog,
  selectImportState, selectTotalInserted, selectErrorCount,
} from '@/store/Slices/AdminSlice';
import type { ContentType, ImportLog } from '@/types/admin/Admin.types';
import { EXAMPLES } from '@/constants/example';
import styles from './AdminPage.module.css';


// ─── Config ───────────────────────────────────────────────────────────────────

interface ContentConfig {
  key: ContentType;
  label: string;
  Icon: React.ComponentType<any>;
  color: string;
  description: string;
}

const CONFIGS: ContentConfig[] = [
  { key: 'exercises',      label: 'Exercises',       Icon: CheckCheck, color: '#14b8a6', description: 'Fill-in-the-blank grammar exercises' },
  { key: 'grammarRules',   label: 'Grammar Rules',   Icon: BookOpen,   color: '#22c55e', description: 'Reference cards with examples & comparisons' },
  { key: 'vocabulary',     label: 'Vocabulary',      Icon: Layers,     color: '#8b5cf6', description: 'Flashcard words with SM-2 spaced repetition' },
  { key: 'readings',       label: 'Readings',        Icon: FileText,   color: '#f59e0b', description: 'Passages with questions & vocabulary glossary' },
  { key: 'multipleChoice', label: 'Multiple Choice', Icon: Target,     color: '#6366f1', description: 'Quiz questions with 4+ options' },
  { key: 'writingPrompts', label: 'Writing Prompts', Icon: PenLine,    color: '#ec4899', description: 'Essay/paragraph tasks with AI scoring' },
  { key: 'listening',      label: 'Listening',       Icon: Headphones, color: '#f43f5e', description: 'Audio materials with TTS + comprehension questions' },
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── ImportPanel ──────────────────────────────────────────────────────────────

function ImportPanel({ config }: { config: ContentConfig }) {
  const dispatch   = useAppDispatch();
  const iState     = useAppSelector(selectImportState(config.key));
  const textareaId = useId();

  const [json,      setJson]      = useState('');
  const [expanded,  setExpanded]  = useState(false);
  const [showEx,    setShowEx]    = useState(false);
  const [jsonErr,   setJsonErr]   = useState<string | null>(null);

  const isIdle    = iState.status === 'idle';
  const isLoading = iState.status === 'loading';
  const isSuccess = iState.status === 'success';
  const isError   = iState.status === 'error';

  const handleImport = useCallback(async () => {
    setJsonErr(null);
    let parsed: unknown[];
    try {
      const raw: unknown = JSON.parse(json);
      if (!Array.isArray(raw))   { throw new Error('Root must be a JSON array [ … ]'); }
      if (raw.length === 0)      { throw new Error('Array is empty — add at least one item'); }
      parsed = raw;
    } catch (err) {
      setJsonErr(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }
    await dispatch(importContent({ type: config.key, data: parsed }));
    setJson('');
  }, [json, config.key, dispatch]);

  const handleReset = useCallback(() => {
    dispatch(resetImportState(config.key));
    setJson('');
    setJsonErr(null);
  }, [config.key, dispatch]);

  return (
    <div
      className={[
        styles['panel'],
        expanded  && styles['panelOpen'],
        isSuccess && styles['panelSuccess'],
        isError   && styles['panelError'],
      ].filter(Boolean).join(' ')}
      style={{ '--pc': config.color } as React.CSSProperties}
    >
      {/* Header */}
      <button type="button" className={styles['panelHeader']} onClick={() => setExpanded(p => !p)}>
        <div className={styles['phl']}>
          <div className={styles['panelIcon']}><config.Icon size={15} /></div>
          <div>
            <span className={styles['panelLabel']}>{config.label}</span>
            <span className={styles['panelDesc']}>{config.description}</span>
          </div>
        </div>
        <div className={styles['phr']}>
          {isLoading && <span className={styles['pillLoading']}><Loader2 size={10} className={styles['spin']} /> Importing…</span>}
          {isSuccess && iState.result !== null && (
            <span className={styles['pillSuccess']}>
              <CheckCircle2 size={10} /> +{iState.result.inserted}
              {iState.result.skipped > 0 && ` · ${iState.result.skipped} skip`}
            </span>
          )}
          {isError && <span className={styles['pillError']}><XCircle size={10} /> Error</span>}
          <ChevronDown size={14} className={`${styles['chevron']} ${expanded ? styles['chevronOpen'] : ''}`} />
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className={styles['panelBody']}>

          {/* Success banner */}
          {isSuccess && iState.result !== null && (
            <div className={styles['resultBox']}>
              <CheckCircle2 size={14} />
              <span>
                <strong>{iState.result.inserted}</strong> inserted ·{' '}
                <strong>{iState.result.skipped}</strong> skipped ·{' '}
                <strong>{iState.result.totalProcessed}</strong> total processed
              </span>
              <button type="button" className={styles['inlineBtn']} onClick={handleReset}>
                <RotateCcw size={11} /> New import
              </button>
            </div>
          )}

          {/* Error banner */}
          {isError && iState.error !== null && (
            <div className={styles['errorBox']}>
              <XCircle size={14} />
              <span>{iState.error}</span>
              <button type="button" className={styles['inlineBtn']} onClick={handleReset}>
                <RotateCcw size={11} /> Try again
              </button>
            </div>
          )}

          {/* Example bar */}
          <div className={styles['exBar']}>
            <button type="button" className={styles['exToggle']} onClick={() => setShowEx(p => !p)}>
              {showEx ? '▲ Hide' : '▼ Show'} example
            </button>
            {showEx && (
              <>
                <button
                  type="button"
                  className={styles['exAction']}
                  onClick={() => void navigator.clipboard.writeText(EXAMPLES[config.key])}
                >
                  <Copy size={11} /> Copy
                </button>
                <button
                  type="button"
                  className={styles['exAction']}
                  onClick={() => { setJson(EXAMPLES[config.key]); setShowEx(false); setJsonErr(null); }}
                >
                  <Upload size={11} /> Paste into editor
                </button>
              </>
            )}
          </div>

          {showEx && <pre className={styles['exPre']}>{EXAMPLES[config.key]}</pre>}

          {/* Editor — hidden when success (user must reset) */}
          {(isIdle || isError || isLoading) && (
            <>
              <label htmlFor={textareaId} className={styles['fieldLabel']}>JSON array</label>
              <textarea
                id={textareaId}
                className={`${styles['textarea']} ${jsonErr !== null ? styles['textareaErr'] : ''}`}
                value={json}
                onChange={e => { setJson(e.target.value); setJsonErr(null); }}
                placeholder={'[\n  { ... }\n]'}
                spellCheck={false}
                rows={9}
                disabled={isLoading}
              />
              {jsonErr !== null && <p className={styles['jsonErr']}>{jsonErr}</p>}

              <div className={styles['panelActions']}>
                {json.trim().length > 0 && (
                  <button type="button" className={styles['clearBtn']} onClick={() => { setJson(''); setJsonErr(null); }} disabled={isLoading}>
                    <Trash2 size={12} /> Clear
                  </button>
                )}
                <button
                  type="button"
                  className={styles['importBtn']}
                  onClick={() => { void handleImport(); }}
                  disabled={isLoading || json.trim().length === 0}
                >
                  {isLoading
                    ? <><Loader2 size={12} className={styles['spin']} /> Importing…</>
                    : <><Upload size={12} /> Import</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LogEntry ─────────────────────────────────────────────────────────────────

function LogEntry({ log }: { log: ImportLog }) {
  const cfg = CONFIGS.find(c => c.key === log.type);
  return (
    <div className={`${styles['logEntry']} ${log.status === 'error' ? styles['logEntryErr'] : ''}`}>
      <div className={styles['logLeft']}>
        {log.status === 'success'
          ? <CheckCircle2 size={11} className={styles['logOk']} />
          : <XCircle      size={11} className={styles['logFail']} />
        }
        <span className={styles['logType']}>{cfg?.label ?? log.type}</span>
        {log.status === 'success' && (
          <span className={styles['logDetail']}>
            <span className={styles['logIns']}>+{log.result.inserted}</span>
            {log.result.skipped > 0 && <span className={styles['logSkip']}> · {log.result.skipped} skip</span>}
          </span>
        )}
        {log.status === 'error' && <span className={styles['logErrTxt']}>{log.errorMessage}</span>}
      </div>
      <span className={styles['logTs']}>{fmtTime(log.timestamp)}</span>
    </div>
  );
}


export default function AdminPage() {
  const dispatch       = useAppDispatch();
  const user           = useAppSelector(selectUser);
  const stats          = useAppSelector(selectAdminStats);
  const statsStatus    = useAppSelector(selectAdminStatsStatus);
  const log            = useAppSelector(selectAdminLog);
  const totalInserted  = useAppSelector(selectTotalInserted);
  const errorCount     = useAppSelector(selectErrorCount);

  useEffect(() => { void dispatch(fetchAdminStats()); }, [dispatch]);

  if (user === null || user.role !== 'ADMIN') { return null; }

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <div className={styles['headerLeft']}>
          <div className={styles['adminIcon']}><ShieldAlert size={18} /></div>
          <div>
            <h1 className={styles['pageTitle']}>Admin Panel</h1>
            <p className={styles['pageSubtitle']}>{user.email}</p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className={styles['statsRow']}>
        {[
          { icon: Users,         label: 'Total Users',        value: statsStatus === 'loading' ? '…' : (stats?.platformStats.totalUsers ?? '—'), color: '#6366f1' },
          { icon: Upload,        label: 'Successful Imports', value: log.filter(l => l.status === 'success').length, color: '#22c55e' },
          { icon: CheckCircle2,  label: 'Items Inserted',     value: totalInserted, color: '#14b8a6' },
          { icon: XCircle,       label: 'Errors',             value: errorCount,    color: '#ef4444' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={styles['statCard']}>
            <div className={styles['statIcon']} style={{ '--sc': color } as React.CSSProperties}><Icon size={16} /></div>
            <div className={styles['statBody']}>
              <span className={styles['statVal']}>{value}</span>
              <span className={styles['statLbl']}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles['layout']}>
        <section>
          <h2 className={styles['sectionTitle']}>Content Import</h2>
          <div className={styles['panelList']}>
            {CONFIGS.map(cfg => <ImportPanel key={cfg.key} config={cfg} />)}
          </div>
        </section>

        <aside className={styles['logAside']}>
          <div className={styles['logHead']}>
            <h2 className={styles['sectionTitle']}>Import Log</h2>
            {log.length > 0 && (
              <button type="button" className={styles['clearLogBtn']} onClick={() => dispatch(clearLog())}>
                Clear
              </button>
            )}
          </div>
          <div className={styles['logList']}>
            {log.length === 0 && <p className={styles['logEmpty']}>No imports yet this session.</p>}
            {log.map(l => <LogEntry key={l.id} log={l} />)}
          </div>
        </aside>
      </div>
    </div>
  );
}