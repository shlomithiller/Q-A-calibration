import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import './styles/customer-zero.css';
import { CustomerZero } from './CustomerZero';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CustomerZero />
  </StrictMode>,
);
