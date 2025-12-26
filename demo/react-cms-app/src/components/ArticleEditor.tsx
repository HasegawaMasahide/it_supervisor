import React, { Component } from 'react';
import { getArticle, updateArticle, uploadMedia } from '../services/api';
import _ from 'lodash';
import moment from 'moment';

// 問題1: クラスコンポーネントの使用（React 16系の古いパターン） (Medium Code Quality)
// 問題2: propsとstateの型定義なし (Medium Code Quality)
class ArticleEditor extends Component<any, any> {
  // 問題3: コンストラクタでのbind忘れ (Low Code Quality)
  constructor(props: any) {
    super(props);

    // 問題4: 初期状態が複雑すぎる (Medium Code Quality)
    this.state = {
      id: null,
      title: '',
      content: '',
      excerpt: '',
      status: 'draft',
      categories: [],
      tags: [],
      featuredImage: null,
      author: null,
      publishedAt: null,
      updatedAt: null,
      isLoading: false,
      isSaving: false,
      errors: {},
      isDirty: false,
      autoSaveTimer: null,
      previewMode: false,
      revisions: [],
      metadata: {},
      seo: {
        title: '',
        description: '',
        keywords: []
      }
    };
  }

  // 問題5: componentDidMountでエラーハンドリング不足 (High Code Quality)
  async componentDidMount() {
    const articleId = this.props.match.params.id;

    if (articleId) {
      this.setState({ isLoading: true });

      // エラーハンドリングなし
      const article = await getArticle(articleId);

      this.setState({
        ...article,
        isLoading: false
      });
    }

    // 問題6: メモリリーク - タイマーのクリアなし (High Code Quality)
    const timer = setInterval(() => {
      this.autoSave();
    }, 30000); // 30秒ごとに自動保存

    this.setState({ autoSaveTimer: timer });
  }

  // 問題7: componentWillUnmountでのクリーンアップ不足 (High Code Quality)
  componentWillUnmount() {
    // autoSaveTimerをclearしていない
  }

  // 問題8: shouldComponentUpdateの実装なし - 不要な再レンダリング (High Performance)

  // 問題9: 巨大なメソッド（100行超） (High Code Quality)
  handleContentChange = (event: any) => {
    const content = event.target.value;

    // 問題10: 同期的なsetStateを複数回呼び出し (Medium Performance)
    this.setState({ content });
    this.setState({ isDirty: true });
    this.setState({ updatedAt: new Date() });

    // 問題11: 計算をメモ化していない (Medium Performance)
    const wordCount = content.split(' ').length;
    const characterCount = content.length;
    const readingTime = Math.ceil(wordCount / 200);

    // 問題12: 不要な計算 (Low Performance)
    const allWords = content.split(' ');
    const uniqueWords = [...new Set(allWords)];
    const wordFrequency: any = {};

    for (let i = 0; i < allWords.length; i++) {
      const word = allWords[i].toLowerCase();
      if (wordFrequency[word]) {
        wordFrequency[word]++;
      } else {
        wordFrequency[word] = 1;
      }
    }

    // 問題13: メタデータに不要な情報を保存 (Low Code Quality)
    this.setState({
      metadata: {
        wordCount,
        characterCount,
        readingTime,
        uniqueWords: uniqueWords.length,
        wordFrequency,
        lastEditedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
        editorVersion: '1.2.3',
        browserInfo: navigator.userAgent
      }
    });

    // 問題14: XSS脆弱性の可能性 (Critical Security)
    // contentをそのままHTMLとして挿入する可能性
    this.updatePreview(content);
  };

  // 問題15: XSS脆弱性 (Critical Security)
  updatePreview = (content: string) => {
    const previewElement = document.getElementById('preview');
    if (previewElement) {
      // dangerouslySetInnerHTMLと同等
      previewElement.innerHTML = content;
    }
  };

  // 問題16: 入力バリデーション不足 (High Security)
  handleTitleChange = (event: any) => {
    // 長さチェックなし、特殊文字チェックなし
    this.setState({
      title: event.target.value,
      isDirty: true
    });
  };

  // 問題17: ファイルアップロードのバリデーション不足 (High Security)
  handleImageUpload = async (event: any) => {
    const file = event.target.files[0];

    // サイズチェックなし、ファイルタイプチェックなし
    const response = await uploadMedia(file);

    this.setState({
      featuredImage: response.url,
      isDirty: true
    });
  };

  // 問題18: エラーハンドリング不足 (High Code Quality)
  autoSave = async () => {
    if (this.state.isDirty && this.state.id) {
      // エラーハンドリングなし
      await updateArticle(this.state.id, {
        title: this.state.title,
        content: this.state.content,
        status: 'draft'
      });

      this.setState({ isDirty: false });
    }
  };

  // 問題19: 複雑すぎるバリデーションロジック (High Code Quality)
  validateForm = () => {
    const errors: any = {};

    // 問題20: マジックナンバー (Low Code Quality)
    if (this.state.title.length < 5) {
      errors.title = 'Title must be at least 5 characters';
    }

    if (this.state.title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }

    if (this.state.content.length < 100) {
      errors.content = 'Content must be at least 100 characters';
    }

    if (this.state.excerpt.length > 500) {
      errors.excerpt = 'Excerpt must be less than 500 characters';
    }

    // 問題21: 重複コード (Medium Code Quality)
    if (this.state.seo.title.length < 30) {
      errors.seoTitle = 'SEO title must be at least 30 characters';
    }

    if (this.state.seo.title.length > 60) {
      errors.seoTitle = 'SEO title must be less than 60 characters';
    }

    if (this.state.seo.description.length < 120) {
      errors.seoDescription = 'SEO description must be at least 120 characters';
    }

    if (this.state.seo.description.length > 160) {
      errors.seoDescription = 'SEO description must be less than 160 characters';
    }

    this.setState({ errors });

    return Object.keys(errors).length === 0;
  };

  // 問題22: 複雑すぎるメソッド - 循環的複雑度が高い (High Code Quality)
  handleSubmit = async (event: any) => {
    event.preventDefault();

    if (!this.validateForm()) {
      return;
    }

    this.setState({ isSaving: true });

    try {
      const data = {
        title: this.state.title,
        content: this.state.content,
        excerpt: this.state.excerpt,
        status: this.state.status,
        categories: this.state.categories,
        tags: this.state.tags,
        featuredImage: this.state.featuredImage,
        seo: this.state.seo,
        metadata: this.state.metadata
      };

      if (this.state.id) {
        await updateArticle(this.state.id, data);
      } else {
        // createArticle is not defined - バグ
        // await createArticle(data);
      }

      this.setState({
        isSaving: false,
        isDirty: false
      });

      // 問題23: ハードコードされたURL (Low Code Quality)
      window.location.href = '/articles';
    } catch (error) {
      // 問題24: エラー情報の不適切な表示 (Medium Security)
      alert('Error: ' + JSON.stringify(error));

      this.setState({ isSaving: false });
    }
  };

  // 問題25: 巨大なrenderメソッド (High Code Quality)
  render() {
    // 問題26: renderメソッド内での計算 (Medium Performance)
    const publishedDate = this.state.publishedAt
      ? moment(this.state.publishedAt).format('YYYY-MM-DD HH:mm:ss')
      : 'Not published';

    const wordCount = this.state.content.split(' ').length;

    return (
      <div className="article-editor">
        <h1>Article Editor</h1>

        {this.state.isLoading && <div>Loading...</div>}

        <form onSubmit={this.handleSubmit}>
          <div>
            <label>Title</label>
            <input
              type="text"
              value={this.state.title}
              onChange={this.handleTitleChange}
            />
            {this.state.errors.title && (
              <span className="error">{this.state.errors.title}</span>
            )}
          </div>

          <div>
            <label>Content</label>
            {/* 問題27: dangerouslySetInnerHTMLの使用 (Critical Security) */}
            <textarea
              value={this.state.content}
              onChange={this.handleContentChange}
              rows={20}
            />
            <div
              dangerouslySetInnerHTML={{ __html: this.state.content }}
            />
            {this.state.errors.content && (
              <span className="error">{this.state.errors.content}</span>
            )}
          </div>

          <div>
            <label>Featured Image</label>
            <input
              type="file"
              onChange={this.handleImageUpload}
            />
            {this.state.featuredImage && (
              <img src={this.state.featuredImage} alt="Featured" />
            )}
          </div>

          <div>
            <label>Status</label>
            <select
              value={this.state.status}
              onChange={(e) => this.setState({ status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div>
            <p>Word count: {wordCount}</p>
            <p>Published: {publishedDate}</p>
          </div>

          <button type="submit" disabled={this.state.isSaving}>
            {this.state.isSaving ? 'Saving...' : 'Save'}
          </button>
        </form>

        {/* 問題28: プレビューでのXSS (Critical Security) */}
        <div id="preview" className="preview"></div>
      </div>
    );
  }
}

export default ArticleEditor;
