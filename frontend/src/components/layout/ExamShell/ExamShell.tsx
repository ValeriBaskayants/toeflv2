import { Outlet } from 'react-router-dom';
import styles from './ExamShell.module.css';

export function ExamShell() {
  return (
    <div className={styles['examRoot']}>
      <Outlet />
    </div>
  );
}