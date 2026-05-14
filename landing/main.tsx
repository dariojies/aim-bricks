import React from 'react';
import ReactDOM from 'react-dom/client';
import { LandingPage } from './LandingPage';
import './styles.css';

try {
  if (localStorage.getItem('aim_bricks_user')) {
    window.location.replace('/app');
  }
} catch (e) {}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <LandingPage />
);
