import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles/main.css';

// 問題1: React.StrictModeを使用していない (Low Code Quality)
ReactDOM.render(
  <App />,
  document.getElementById('root')
);
