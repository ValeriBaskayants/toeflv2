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
import styles from './AdminPage.module.css';


const EXAMPLES: Record<ContentType, string> = {
  exercises: JSON.stringify([
    {
      topic: 'Present Simple',
      level: 'A1',
      difficulty: 'EASY',
      sentence: 'She _____ to school every day.',
      blanks: [{ position: 0, answer: 'goes', options: ['go', 'goes', 'going', 'gone'] }],
      explanation: 'Use -s/-es with he/she/it in Present Simple.',
      tags: ['a1', 'present-simple'],
    },
    {
      topic: 'Past Simple',
      level: 'A2',
      difficulty: 'MEDIUM',
      sentence: 'They _____ dinner before the movie started.',
      blanks: [{ position: 0, answer: 'ate', options: ['eat', 'ate', 'eaten', 'eating'] }],
      explanation: 'Past Simple uses the past form of the verb.',
      tags: ['a2', 'past-simple'],
    },
  ], null, 2),

  grammarRules: JSON.stringify([
    {
      topic: 'Present Simple',
      slug: 'present-simple',
      level: 'A1',
      summary: 'Used for habits, routines, facts and general truths.',
      coreConcept: 'Subject + base verb (+ s/es for he/she/it)',
      structure: 'I/You/We/They + V1 | He/She/It + V1+s/es',
      usages: [
        {
          title: 'Habits & Routines',
          explanation: 'Actions that happen regularly or repeatedly.',
          examples: [
            { sentence: 'She drinks coffee every morning.', translation: 'Она пьёт кофе каждое утро.' },
          ],
        },
        {
          title: 'General Truths',
          explanation: 'Facts that are always true.',
          examples: [{ sentence: 'Water boils at 100°C.' }],
        },
      ],
      sections: [
        {
          title: 'Negative form',
          content: "Use do not (don't) or does not (doesn't) + base verb.",
          examples: [
            { sentence: "He does not play tennis." },
            { sentence: "They don't watch TV." },
          ],
        },
      ],
      commonMistakes: [
        'She go to school. ✗ → She goes to school. ✓',
        "He don't like it. ✗ → He doesn't like it. ✓",
      ],
      signalWords: ['always', 'usually', 'often', 'every day', 'never'],
      relatedTopics: ['present-continuous', 'past-simple'],
    },
  ], null, 2),

  vocabulary: JSON.stringify([
    {
      word: 'accomplish',
      level: 'B1',
      type: 'VERB',
      pronunciation: '/əˈkɒmplɪʃ/',
      definition: 'To succeed in doing something difficult.',
      definitionRu: 'Достигать, выполнять',
      examples: [
        'She accomplished her goal in record time.',
        'The team accomplished what seemed impossible.',
      ],
      synonyms: ['achieve', 'complete', 'fulfill'],
      antonyms: ['fail', 'abandon'],
      forms: {
        base: 'accomplish',
        past: 'accomplished',
        pastParticiple: 'accomplished',
        thirdPerson: 'accomplishes',
        presentParticiple: 'accomplishing',
      },
      isIrregularVerb: false,
    },
    {
      word: 'innovative',
      level: 'B2',
      type: 'ADJECTIVE',
      pronunciation: '/ˈɪnəveɪtɪv/',
      definition: 'Featuring new methods; advanced and original.',
      definitionRu: 'Инновационный, передовой',
      examples: ['The company is known for its innovative products.'],
      synonyms: ['creative', 'original', 'pioneering'],
      antonyms: ['conventional', 'traditional'],
    },
  ], null, 2),

  readings: JSON.stringify([
    {
      title: 'The Water Cycle',
      level: 'A2',
      topic: 'Science',
      description: 'A short passage about how water moves through nature.',
      content: 'Water is constantly moving around Earth in a process called the water cycle. The sun heats water in rivers, lakes, and oceans, causing it to evaporate and rise into the atmosphere. As the water vapor rises, it cools and condenses to form clouds. When enough droplets gather, precipitation occurs as rain or snow.',
      tags: ['science', 'nature'],
      questions: [
        {
          text: 'What causes water to evaporate?',
          explanation: 'The sun provides heat energy that turns liquid water into vapor.',
          options: [
            { text: 'Heat from the sun', isCorrect: true },
            { text: 'Strong winds', isCorrect: false },
            { text: 'Cold temperatures', isCorrect: false },
            { text: 'Ocean currents', isCorrect: false },
          ],
        },
      ],
      vocabulary: [
        { word: 'evaporate', translation: 'испаряться', contextSentence: 'Water evaporates when heated.' },
        { word: 'precipitation', translation: 'осадки' },
      ],
    },
  ], null, 2),

  multipleChoice: JSON.stringify([
    {
      question: 'Which tense describes an action happening right now?',
      options: ['Present Simple', 'Past Simple', 'Present Continuous', 'Future Simple'],
      correctIndex: 2,
      explanation: 'Present Continuous (am/is/are + -ing) describes actions currently in progress.',
      topic: 'Tenses',
      level: 'A1',
      difficulty: 'EASY',
    },
    {
      question: 'Choose the correct sentence:',
      options: [
        "She don't like coffee.",
        "She doesn't likes coffee.",
        "She doesn't like coffee.",
        'She not like coffee.',
      ],
      correctIndex: 2,
      explanation: "With he/she/it use \"doesn't\" + base verb.",
      topic: 'Present Simple',
      level: 'A1',
      difficulty: 'EASY',
    },
  ], null, 2),

  writingPrompts: JSON.stringify([
    {
      prompt: 'Describe your daily routine in detail. What do you do in the morning, afternoon, and evening?',
      level: 'A2',
      type: 'PARAGRAPH',
      minWords: 80,
      maxWords: 150,
      topic: 'Daily Life',
      instructions: 'Use Present Simple. Include at least 3 time expressions.',
    },
    {
      prompt: 'Do you think social media has a positive or negative impact on society? Give reasons and examples.',
      level: 'B2',
      type: 'ESSAY',
      minWords: 250,
      maxWords: 400,
      topic: 'Technology & Society',
      instructions: 'Write a balanced argument. Use discourse markers. Include two specific examples.',
    },
  ], null, 2),

  listening: JSON.stringify([
    {
      title: 'Campus Tour',
      topic: 'University Life',
      level: 'B1',
      type: 'CONVERSATION',
      fullText: 'Welcome to the university. My name is Sarah and I will be your guide today. On your left is the library, open from 8am to 10pm. Straight ahead is the main lecture hall for first-year classes.',
      segments: [
        { index: 0, text: 'Welcome to the university.', startSec: 0, endSec: 2.5, speaker: 'Sarah' },
        { index: 1, text: 'My name is Sarah and I will be your guide today.', startSec: 2.5, endSec: 6.0, speaker: 'Sarah' },
        { index: 2, text: 'On your left is the library, open from 8am to 10pm.', startSec: 6.0, endSec: 10.5, speaker: 'Sarah' },
      ],
      speakerRate: 0.95,
      speakerLang: 'en-US',
      speakerPitch: 1.0,
      allowedModes: ['EASY', 'MEDIUM', 'HARD'],
      questions: [
        {
          question: 'What is the name of the tour guide?',
          options: ['Sarah', 'Emma', 'Laura', 'Kate'],
          correctIndex: 0,
          explanation: 'Sarah introduces herself at the beginning.',
          referenceStartSec: 2.5,
          referenceEndSec: 6.0,
        },
        {
          question: 'Until what time is the library open?',
          options: ['8pm', '9pm', '10pm', '11pm'],
          correctIndex: 2,
          explanation: 'The library is open until 10pm.',
          referenceStartSec: 6.0,
          referenceEndSec: 10.5,
        },
      ],
    },
  ], null, 2),
};

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