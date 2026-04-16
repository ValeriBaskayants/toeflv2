import i18n from '@/i18n'
import styles from './AdminBoard.module.css'

export default function AdminBoard() {
    const redirectToGoogleOAuth = () => {
        window.location.href = 'http://localhost:3001/auth/google';
    }
  return (
    <div>
        <button onClick={redirectToGoogleOAuth} className={styles['googleButton']}>
            {i18n.t('auth.login')}
        </button>
    </div>
  )
}
