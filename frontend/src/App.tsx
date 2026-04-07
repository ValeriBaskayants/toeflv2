import { BrowserRouter } from 'react-router-dom';
import AppRouter from './router/AppRouter';
import './i18n';
import './styles/globals.css';

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
