/** React entry point for the Nook Messenger browser application. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../css/style.css';

// Mounts the single-page messenger interface into the document shell.
createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
