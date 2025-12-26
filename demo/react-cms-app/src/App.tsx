import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ArticleList from './components/ArticleList';
import ArticleEditor from './components/ArticleEditor';
import Login from './components/Login';

// 問題1: 認証チェックなし (High Security)
function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/login" component={Login} />
          <Route exact path="/articles" component={ArticleList} />
          {/* 問題2: パスパラメータの検証なし (Medium Security) */}
          <Route exact path="/articles/:id/edit" component={ArticleEditor} />
          <Route exact path="/articles/new" component={ArticleEditor} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
