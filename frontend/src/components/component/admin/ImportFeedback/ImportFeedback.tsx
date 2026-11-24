import { AlertTriangle, Info } from 'lucide-react';
import type { ImportIssue } from '@/types/admin/Admin.types';
import styles from './ImportFeedback.module.css';

export function ImportIssues({ issues }: { issues: ImportIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <div className={styles['issues']} role="alert">
      <div className={styles['issuesHead']}>
        <AlertTriangle size={14} />
        <span>
          {issues.length} {issues.length === 1 ? 'item was' : 'items were'} rejected and not saved. Valid items
          from the same import are already saved — importing again skips them. Your JSON was kept so you can fix it.
        </span>
      </div>
      <ul className={styles['issuesList']}>
        {issues.map((issue, i) => (
          <li key={i} className={styles['issue']}>
            <strong className={styles['issueName']}>{issue.title ?? issue.scenario ?? `Item ${i + 1}`}</strong>
            <span className={styles['issueReason']}>{issue.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LooseJsonHint() {
  return (
    <p className={styles['hint']}>
      <Info size={12} />
      <span>
        Comments (<code>// …</code> and <code>/* … */</code>) and trailing commas are allowed — they are removed
        before sending.
      </span>
    </p>
  );
}