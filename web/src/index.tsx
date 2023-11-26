// https://github.com/dlemstra/Magick.NET/blob/main/docs/ResizeImage.md

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { setFetchAdapter, setSessionId } from './lib/fetchadapter';
import { FetchAdapterWeb } from './lib/fetchadapterweb';

setFetchAdapter(new FetchAdapterWeb());
setSessionId('42')
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
