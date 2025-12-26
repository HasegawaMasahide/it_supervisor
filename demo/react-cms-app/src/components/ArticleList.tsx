import React, { Component } from 'react';
import { getAllArticles, deleteArticle } from '../services/api';
import _ from 'lodash';

// 問題1: 不要な再レンダリング (High Performance)
class ArticleList extends Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      articles: [],
      isLoading: false,
      searchQuery: '',
      selectedCategory: 'all'
    };
  }

  async componentDidMount() {
    this.loadArticles();
  }

  // 問題2: エラーハンドリング不足 (High Code Quality)
  loadArticles = async () => {
    this.setState({ isLoading: true });

    // 問題3: 大量データを一度に取得 (High Performance)
    const articles = await getAllArticles();

    this.setState({
      articles,
      isLoading: false
    });
  };

  // 問題4: 削除確認なし (Medium Security)
  handleDelete = async (id: number) => {
    await deleteArticle(id);
    this.loadArticles();
  };

  // 問題5: 検索処理がメモ化されていない (Medium Performance)
  filterArticles = () => {
    const { articles, searchQuery, selectedCategory } = this.state;

    // 問題6: 非効率的なフィルタリング (Medium Performance)
    let filtered = articles;

    if (searchQuery) {
      filtered = filtered.filter((article: any) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((article: any) =>
        article.categories.includes(selectedCategory)
      );
    }

    return filtered;
  };

  // 問題7: renderメソッド内での計算 (Medium Performance)
  render() {
    const filteredArticles = this.filterArticles();

    return (
      <div className="article-list">
        <h1>Articles</h1>

        <div className="filters">
          <input
            type="text"
            placeholder="Search..."
            value={this.state.searchQuery}
            onChange={(e) => this.setState({ searchQuery: e.target.value })}
          />

          <select
            value={this.state.selectedCategory}
            onChange={(e) => this.setState({ selectedCategory: e.target.value })}
          >
            <option value="all">All Categories</option>
            <option value="tech">Tech</option>
            <option value="business">Business</option>
          </select>
        </div>

        {this.state.isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="articles">
            {filteredArticles.map((article: any) => (
              <div key={article.id} className="article-item">
                <h2>{article.title}</h2>
                {/* 問題8: XSS脆弱性 (Critical Security) */}
                <div dangerouslySetInnerHTML={{ __html: article.excerpt }} />
                <button onClick={() => this.handleDelete(article.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default ArticleList;
