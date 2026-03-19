// ========================================
// スムーススクロール
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        // ハッシュのみのリンクの場合
        if (href !== '#' && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// ========================================
// ヘッダースクロール効果
// ========================================
let lastScroll = 0;
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // スクロール時にヘッダーに影を追加
    if (currentScroll > 100) {
        header.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    }

    lastScroll = currentScroll;
});

// ========================================
// モバイルメニュー
// ========================================
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const nav = document.querySelector('.nav');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });

    // メニューアイテムをクリックしたらメニューを閉じる
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        });
    });

    // メニュー外をクリックしたらメニューを閉じる
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            nav.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    });
}

// モバイルメニュー用のスタイルを追加（CSSに追加すべきだが、ここで動的に追加）
const style = document.createElement('style');
style.textContent = `
    @media (max-width: 768px) {
        .nav {
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            background: white;
            flex-direction: column;
            gap: 0;
            padding: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transform: translateY(-100%);
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s ease;
        }

        .nav.active {
            transform: translateY(0);
            opacity: 1;
            pointer-events: all;
        }

        .nav-link {
            display: block;
            padding: 1rem;
            border-bottom: 1px solid #e5e7eb;
        }

        .nav-link:last-child {
            border-bottom: none;
        }

        .mobile-menu-btn.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }

        .mobile-menu-btn.active span:nth-child(2) {
            opacity: 0;
        }

        .mobile-menu-btn.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
    }
`;
document.head.appendChild(style);

// ========================================
// FAQアコーディオン
// ========================================
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
        // 他のFAQを閉じる
        faqItems.forEach(otherItem => {
            if (otherItem !== item && otherItem.classList.contains('active')) {
                otherItem.classList.remove('active');
            }
        });

        // クリックされたFAQをトグル
        item.classList.toggle('active');
    });
});

// ========================================
// フォーム送信処理
// ========================================
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // フォームデータの取得
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries());

        // 実際のアプリケーションでは、ここでAPIにデータを送信します
        console.log('フォームデータ:', data);

        // 成功メッセージを表示
        alert('お問い合わせありがとうございます。\n担当者より2営業日以内にご連絡いたします。');

        // フォームをリセット
        contactForm.reset();

        // 実際の実装例:
        /*
        fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            alert('お問い合わせありがとうございます。');
            contactForm.reset();
        })
        .catch(error => {
            alert('送信中にエラーが発生しました。もう一度お試しください。');
            console.error('Error:', error);
        });
        */
    });
}

// ========================================
// スクロールアニメーション（要素が画面に入ったらフェードイン）
// ========================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// アニメーション対象の要素を設定
const animateElements = document.querySelectorAll(`
    .problem-card,
    .feature-card,
    .process-step,
    .pricing-card,
    .testimonial-card,
    .faq-item
`);

animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ========================================
// 統計カウンターアニメーション
// ========================================
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }

        // 数値のフォーマット
        if (element.textContent.includes('万円')) {
            element.textContent = Math.floor(current) + '万円';
        } else if (element.textContent.includes('ヶ月')) {
            element.textContent = Math.floor(current) + 'ヶ月';
        } else if (element.textContent.includes('%')) {
            element.textContent = Math.floor(current) + '%';
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// 統計要素の監視
const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
            entry.target.dataset.animated = 'true';
            const text = entry.target.textContent;
            const number = parseInt(text.replace(/[^\d]/g, ''));

            if (!isNaN(number)) {
                animateCounter(entry.target, number);
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(stat => {
    statObserver.observe(stat);
});

// ========================================
// ページ読み込み時の初期化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('IT資産監査サービス LP - Ready');

    // ヒーローセクションのアニメーション
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(30px)';

        setTimeout(() => {
            heroContent.style.transition = 'opacity 1s ease, transform 1s ease';
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 100);
    }
});

// ========================================
// パフォーマンス最適化: 画像の遅延読み込み
// ========================================
if ('loading' in HTMLImageElement.prototype) {
    // ネイティブのlazyloadingをサポート
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src;
    });
} else {
    // Intersection Observer APIを使用したフォールバック
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
    });
}

// ========================================
// お客様の声モーダル
// ========================================
const caseStudies = {
    case1: {
        company: "製造業A社（従業員300名）",
        title: "レガシーな業務システムの技術的負債を3ヶ月で解消",
        stats: [
            { value: "127件", label: "発見された課題" },
            { value: "3.2倍", label: "処理速度向上" },
            { value: "280万円", label: "年間コスト削減" }
        ],
        challenge: {
            title: "導入前の課題",
            content: "15年前に構築したPHP製の生産管理システムが肥大化し、新機能追加に膨大な時間がかかる状況でした。また、セキュリティ脆弱性の不安があり、開発担当者の退職により属人化リスクも高まっていました。",
            points: [
                "コードの複雑度が高く、新機能追加に3ヶ月以上かかる",
                "古いライブラリの脆弱性により、セキュリティリスクが増大",
                "開発担当者1名のみが全体を把握している状態"
            ]
        },
        solution: {
            title: "実施内容",
            content: "静的解析により127件の課題を抽出し、優先度をCritical/High/Medium/Lowの4段階で分類。Critical問題（セキュリティ脆弱性、データ整合性の問題）から順番に改善し、リファクタリングと自動テストを並行実施しました。",
            points: [
                "SemgrepとTrivyによる静的解析で全課題を可視化",
                "Critical問題12件をシニアエンジニアが優先対応",
                "AIを活用したリファクタリングで処理速度を3.2倍に改善",
                "ドキュメント自動生成により属人化を解消"
            ]
        },
        results: [
            { label: "コード複雑度", value: "32%改善", change: "Cyclomatic Complexity: 18 → 12" },
            { label: "セキュリティスコア", value: "A評価", change: "脆弱性ゼロを達成" },
            { label: "処理速度", value: "3.2倍向上", change: "平均レスポンス: 2.1s → 0.65s" },
            { label: "開発効率", value: "60%向上", change: "新機能追加: 3ヶ月 → 1.2ヶ月" }
        ],
        testimonial: "長年放置していた技術的負債が一気に解消されました。特にCritical問題を優先的に対応いただけたことで、安心して運用を継続できています。AIと人間のバランスが絶妙で、スピードと品質を両立できていると感じました。"
    },
    case2: {
        company: "サービス業B社（従業員150名）",
        title: "Webサイトのパフォーマンス改善と予算承認をスムーズに実現",
        stats: [
            { value: "89件", label: "改善提案" },
            { value: "4.8秒", label: "ページ読込時間短縮" },
            { value: "150万円", label: "年間サーバー費削減" }
        ],
        challenge: {
            title: "導入前の課題",
            content: "コーポレートサイトのページ読み込みが遅く、SEOスコアも低下。改善の必要性は認識していたものの、経営層への説明資料がなく予算承認が得られない状況でした。",
            points: [
                "ページ読み込み時間が7秒以上かかる",
                "Google PageSpeed Insightsスコア: 38点",
                "改善効果を数値で示せず、予算承認が進まない"
            ]
        },
        solution: {
            title: "実施内容",
            content: "スタンダードプランで診断・改善提案まで実施。ROI試算レポートを経営層に提示し、予算承認を取得。その後、画像最適化、キャッシュ戦略、不要なJavaScriptの削減などを実施しました。",
            points: [
                "詳細な診断レポートで改善余地を可視化",
                "ROI試算により年間150万円のコスト削減を提示",
                "経営層への説明資料として活用し、予算承認を取得",
                "画像最適化とCDN導入でページ速度を4.8秒改善"
            ]
        },
        results: [
            { label: "PageSpeedスコア", value: "93点", change: "38点 → 93点" },
            { label: "読み込み時間", value: "2.2秒", change: "7秒 → 2.2秒（68%短縮）" },
            { label: "サーバーコスト", value: "年150万円削減", change: "トラフィック最適化で削減" },
            { label: "コンバージョン率", value: "27%向上", change: "離脱率の低下により改善" }
        ],
        testimonial: "瑕疵担保があるので安心してお願いできました。診断レポートは経営層への説明資料としても使え、予算承認がスムーズに進みました。実装後の効果測定レポートも詳細で、経営会議での報告に活用しています。"
    },
    case3: {
        company: "商社C社（従業員200名）",
        title: "大手SIerの半額以下で基幹システムのセキュリティ診断を実現",
        stats: [
            { value: "53件", label: "セキュリティリスク検出" },
            { value: "350万円", label: "コスト削減" },
            { value: "100%", label: "瑕疵担保カバー率" }
        ],
        challenge: {
            title: "導入前の課題",
            content: "基幹システムのセキュリティ診断を大手SIerに依頼したところ、800万円の見積もりが提示され、中小企業には予算的に厳しい状況でした。",
            points: [
                "大手SIerの見積もり: 800万円（診断のみ）",
                "セキュリティ対策の必要性は認識しているが予算が不足",
                "実装まで依頼すると1,500万円以上の見積もり"
            ]
        },
        solution: {
            title: "実施内容",
            content: "プレミアムプランで診断から実装まで対応。AI活用により診断コストを大幅削減しつつ、Critical問題は必ず2名以上のシニアエンジニアがレビューする体制で品質を担保しました。",
            points: [
                "OWASP Top 10に準拠したセキュリティ診断",
                "Trivy、Gitleaksによる自動脆弱性検出",
                "Critical問題8件を優先対応（SQL Injection、XSS等）",
                "3ヶ月間の瑕疵担保で安心を提供"
            ]
        },
        results: [
            { label: "診断コスト", value: "350万円削減", change: "800万円 → 450万円" },
            { label: "Critical問題", value: "8件解決", change: "SQL Injection、XSS等を修正" },
            { label: "セキュリティスコア", value: "A評価", change: "脆弱性ゼロを達成" },
            { label: "実装期間", value: "2.5ヶ月", change: "予定通りに完了" }
        ],
        testimonial: "大手SIerの見積もりは高すぎて諦めていましたが、こちらは中小企業にちょうど良い価格帯でした。実装までお任せできて助かりました。瑕疵担保があるため、万が一の場合も安心です。"
    }
};

const modal = document.getElementById('caseModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.querySelector('.modal-close');
const modalOverlay = document.querySelector('.modal-overlay');

// モーダルを開く
document.querySelectorAll('.testimonial-card').forEach(card => {
    card.addEventListener('click', () => {
        const caseId = card.dataset.caseId;
        const caseData = caseStudies[caseId];

        if (caseData) {
            // モーダルの内容を生成
            modalBody.innerHTML = `
                <div class="case-study-header">
                    <div class="case-study-company">${caseData.company}</div>
                    <h2 class="case-study-title">${caseData.title}</h2>
                    <div class="case-study-stats">
                        ${caseData.stats.map(stat => `
                            <div class="case-stat">
                                <div class="case-stat-value">${stat.value}</div>
                                <div class="case-stat-label">${stat.label}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="case-study-section">
                    <h3>${caseData.challenge.title}</h3>
                    <p>${caseData.challenge.content}</p>
                    <ul>
                        ${caseData.challenge.points.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>

                <div class="case-study-section">
                    <h3>${caseData.solution.title}</h3>
                    <p>${caseData.solution.content}</p>
                    <ul>
                        ${caseData.solution.points.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>

                <div class="case-results">
                    <h3>改善成果</h3>
                    <div class="results-grid">
                        ${caseData.results.map(result => `
                            <div class="result-item">
                                <div class="result-label">${result.label}</div>
                                <div class="result-value">${result.value}</div>
                                <div class="result-change">${result.change}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="case-study-section">
                    <h3>お客様の声</h3>
                    <p style="font-style: italic; font-size: 1.0625rem; color: var(--text-primary);">
                        "${caseData.testimonial}"
                    </p>
                </div>
            `;

            // モーダルのスクロール位置を上部にリセット
            const modalContent = document.querySelector('.modal-content');
            modalContent.scrollTop = 0;

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });
});

// モーダルを閉じる
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

// ========================================
// プロセスステップの詳細展開
// ========================================
const processSteps = document.querySelectorAll('.process-step');

processSteps.forEach(step => {
    const content = step.querySelector('.process-step-content');

    content.addEventListener('click', () => {
        const wasActive = step.classList.contains('active');

        // 他のステップを閉じる
        processSteps.forEach(otherStep => {
            if (otherStep !== step && otherStep.classList.contains('active')) {
                otherStep.classList.remove('active');
            }
        });

        // クリックされたステップをトグル
        step.classList.toggle('active');

        // 展開した場合のみ、スクロール位置を調整
        if (!wasActive && step.classList.contains('active')) {
            // アニメーション完了後にスクロール（0.4秒のアニメーション時間を考慮）
            setTimeout(() => {
                const header = document.querySelector('.header');
                const headerHeight = header ? header.offsetHeight : 0;
                const stepTop = step.getBoundingClientRect().top + window.pageYOffset;
                const scrollPosition = stepTop - headerHeight - 20;

                // 展開された詳細が画面内に収まるようにスクロール
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
            }, 100);
        }
    });
});

// ========================================
// 改善事例詳細モーダル
// ========================================
const caseDetails = {
    laravel: {
        icon: "🐘",
        title: "業務タスク管理システム",
        tech: "PHP / Laravel",
        techClass: "php",
        overview: "5年前に社内向けTODO管理アプリとして構築。当初は小規模だったが、機能追加を重ねるうちにコードが複雑化し、セキュリティ対策が後回しになっていた。現在は10部署で利用され、日々の業務に不可欠なシステムに成長。",
        stats: { critical: 5, high: 7, medium: 8, low: 2 },
        issues: {
            security: [
                "SQLインジェクション（5箇所）",
                "MD5パスワードハッシュ",
                "XSS脆弱性",
                "機密情報のハードコーディング",
                "CSRF対策の不備",
                "パストラバーサル",
                "認証・認可の不備"
            ],
            performance: [
                "N+1クエリ問題",
                "インデックス未設定",
                "不要なデータ取得（SELECT *）",
                "集約可能なクエリの分割"
            ],
            quality: [
                "循環的複雑度 > 15",
                "100行超の関数",
                "重複コード",
                "マジックナンバー",
                "エラーハンドリング不足"
            ],
            dependencies: [
                "古いLaravel 8.x（EOL済み）",
                "脆弱性のあるパッケージ"
            ]
        },
        estimate: "44-72時間（5.5-9営業日）"
    },
    react: {
        icon: "⚛️",
        title: "コンテンツ管理システム（CMS）",
        tech: "React / TypeScript",
        techClass: "react",
        overview: "React 16系で構築されたCMS。クラスコンポーネントベースのレガシーコードが多く、TypeScriptも中途半端に導入されている状態。パフォーマンス問題も顕著で、大量の記事を扱う際にレスポンスが悪化している。",
        stats: { critical: 6, high: 20, medium: 20, low: 8 },
        issues: {
            security: [
                "XSS脆弱性（dangerouslySetInnerHTML）",
                "APIキーのハードコーディング",
                "認証トークンのlocalStorage保存",
                "CORS設定の不備",
                "入力バリデーション不足"
            ],
            performance: [
                "不要な再レンダリング",
                "メモ化されていない計算",
                "大量データの一括取得",
                "画像の最適化不足",
                "バンドルサイズ肥大化"
            ],
            quality: [
                "古いクラスコンポーネント",
                "TypeScriptの中途半端な導入",
                "重複コード・コピペ",
                "500行超の巨大コンポーネント",
                "グローバル変数の多用",
                "エラーハンドリング不足"
            ],
            dependencies: [
                "古いReact 16.14.0",
                "脆弱性のあるaxios 0.21.1",
                "脆弱性のあるlodash 4.17.19",
                "非推奨のmoment.js"
            ]
        },
        estimate: "80-120時間（10-15営業日）"
    },
    django: {
        icon: "🐍",
        title: "ECサイト（オンラインショップ）",
        tech: "Python / Django",
        techClass: "python",
        overview: "Django 2.2で構築されたECサイト。サポート終了（EOL）済みのバージョンを使用しており、セキュリティリスクが非常に高い状態。決済処理も含まれるため、早急な対応が必要。",
        stats: { critical: 7, high: 22, medium: 15, low: 4 },
        issues: {
            security: [
                "SQLインジェクション（生クエリ使用）",
                "SECRET_KEYのハードコーディング",
                "DEBUG=True（本番環境）",
                "XSS脆弱性",
                "CSRF対策の無効化",
                "パスワードの平文保存",
                "セッション管理の不備"
            ],
            performance: [
                "N+1クエリ問題",
                "select_related/prefetch_related未使用",
                "不要なデータ取得",
                "インデックスの欠如",
                "キャッシュ未使用"
            ],
            quality: [
                "循環的複雑度が高い",
                "200行超の関数",
                "重複コード",
                "グローバル変数",
                "エラーハンドリング不足",
                "型ヒントなし"
            ],
            dependencies: [
                "Django 2.2.28（EOL済み）",
                "脆弱性のあるrequests 2.25.1",
                "脆弱性のあるPillow 8.1.0"
            ]
        },
        estimate: "72-100時間（9-12営業日）"
    },
    aspnet: {
        icon: "🔷",
        title: "社内業務管理システム",
        tech: "C# / ASP.NET Core",
        techClass: "dotnet",
        overview: ".NET Core 2.1で構築されたレガシーな社内システム。勤怠管理、経費精算、プロジェクト管理を一元化しているが、EOL済みフレームワークでセキュリティリスクが高い。巨大なコントローラーで保守性も低下。",
        stats: { critical: 7, high: 21, medium: 17, low: 3 },
        issues: {
            security: [
                "接続文字列のハードコーディング",
                "SQLインジェクション（ADO.NET生SQL）",
                "パスワードの平文保存",
                "XSS脆弱性",
                "認証・認可の不備",
                "セッション管理の不備",
                "DeveloperExceptionPage本番有効"
            ],
            performance: [
                "N+1クエリ問題",
                "同期的なDB操作（async/await未使用）",
                "キャッシュ未使用",
                "大量データの一括読み込み",
                "ViewBagの過度な使用"
            ],
            quality: [
                "1000行超の巨大コントローラー",
                "循環的複雑度が高い",
                "重複コード",
                "staticフィールドの多用",
                "catch-allの例外処理"
            ],
            dependencies: [
                ".NET Core 2.1（EOL済み）",
                "古いjQuery 2.2.4",
                "古いBootstrap 3.3.7"
            ]
        },
        estimate: "72-100時間（9-12営業日）"
    },
    vue: {
        icon: "💚",
        title: "予約・スケジュール管理システム",
        tech: "Vue.js / Node.js",
        techClass: "vue",
        overview: "Vue 2.xとNode.js/Expressで構築された予約管理アプリ。美容室やクリニック向けの予約カレンダー機能を提供。Options APIとComposition APIが混在し、Vuexの状態管理が複雑化。フロントエンドにAPIキーが露出するなどセキュリティ問題も散見。",
        stats: { critical: 4, high: 8, medium: 9, low: 2 },
        issues: {
            security: [
                "XSS脆弱性（v-html使用）",
                "APIキーのフロントエンド露出",
                "JWTトークンのlocalStorage保存",
                "認証バイパス可能なルートガード",
                "CORS設定の不備",
                "入力バリデーション不足"
            ],
            performance: [
                "不要な再レンダリング（computed未使用）",
                "SSR/CSRハイドレーション問題",
                "大量データの一括取得",
                "バンドルサイズ肥大化",
                "画像の最適化不足"
            ],
            quality: [
                "Options APIとComposition APIの混在",
                "Vuex状態管理の複雑化",
                "巨大なコンポーネント（600行超）",
                "Props drilling",
                "型定義の不備（any多用）",
                "エラーハンドリング不足",
                "重複コード"
            ],
            dependencies: [
                "古いVue 2.x",
                "非推奨のVuex",
                "脆弱性のあるaxios 0.21.1",
                "古いカレンダーライブラリ",
                "非推奨のmoment.js"
            ]
        },
        estimate: "60-88時間（7.5-11営業日）"
    },
    springboot: {
        icon: "☕",
        title: "顧客管理システム（CRM）",
        tech: "Java / Spring Boot",
        techClass: "java",
        overview: "Spring Framework 4.3.xで構築された顧客管理システム。顧客情報管理、商談・案件管理、営業活動履歴などを提供。EOL済みフレームワークでLog4j脆弱性が残存。God Class化したServiceクラスで保守性が低下。",
        stats: { critical: 6, high: 12, medium: 8, low: 2 },
        issues: {
            security: [
                "SQLインジェクション脆弱性",
                "機密情報のハードコーディング",
                "不適切な認証実装（Basic認証のみ）",
                "XSS脆弱性（th:utext使用）",
                "ログに機密情報出力",
                "CSRF対策の不備",
                "過度な権限付与"
            ],
            performance: [
                "N+1クエリ問題",
                "LazyInitializationException",
                "トランザクション境界の不適切な設定",
                "キャッシュ未使用",
                "コネクションプールの設定不備"
            ],
            quality: [
                "God Class（1200行超のServiceクラス）",
                "XML設定ファイルの肥大化",
                "レイヤー間の責務混在",
                "例外処理の不備（catch-all）",
                "重複コード",
                "マジックナンバー"
            ],
            dependencies: [
                "古いSpring Framework 4.x（EOL済み）",
                "古いJava 8",
                "脆弱性のあるJackson",
                "脆弱性のあるLog4j（CVE-2021-44228）",
                "非推奨のAPI使用"
            ]
        },
        estimate: "84-128時間（10.5-16営業日）"
    }
};

const caseDetailModal = document.getElementById('caseDetailModal');
const caseDetailBody = document.getElementById('caseDetailBody');

if (caseDetailModal) {
    const caseDetailClose = caseDetailModal.querySelector('.modal-close');
    const caseDetailOverlay = caseDetailModal.querySelector('.modal-overlay');

    // 事例カードのクリックイベント
    document.querySelectorAll('.case-card[data-case-detail]').forEach(card => {
        card.addEventListener('click', () => {
            const caseId = card.dataset.caseDetail;
            const data = caseDetails[caseId];

            if (data) {
                caseDetailBody.innerHTML = `
                    <div class="case-detail-header">
                        <div class="case-detail-icon">${data.icon}</div>
                        <div class="case-detail-title-section">
                            <h2>${data.title}</h2>
                            <span class="case-tech-badge ${data.techClass}">${data.tech}</span>
                        </div>
                    </div>

                    <div class="case-detail-overview">
                        <h3>システム概要</h3>
                        <p>${data.overview}</p>
                    </div>

                    <div class="case-detail-stats">
                        <div class="detail-stat-card critical">
                            <div class="detail-stat-number">${data.stats.critical}</div>
                            <div class="detail-stat-label">Critical</div>
                        </div>
                        <div class="detail-stat-card high">
                            <div class="detail-stat-number">${data.stats.high}</div>
                            <div class="detail-stat-label">High</div>
                        </div>
                        <div class="detail-stat-card medium">
                            <div class="detail-stat-number">${data.stats.medium}</div>
                            <div class="detail-stat-label">Medium</div>
                        </div>
                        <div class="detail-stat-card low">
                            <div class="detail-stat-number">${data.stats.low}</div>
                            <div class="detail-stat-label">Low</div>
                        </div>
                    </div>

                    <div class="case-detail-issues">
                        <h3>検出された主な問題</h3>

                        <div class="issue-category security">
                            <div class="issue-category-title">セキュリティ問題</div>
                            <div class="issue-list">
                                ${data.issues.security.map(issue => `<span class="issue-tag security">${issue}</span>`).join('')}
                            </div>
                        </div>

                        <div class="issue-category performance">
                            <div class="issue-category-title">パフォーマンス問題</div>
                            <div class="issue-list">
                                ${data.issues.performance.map(issue => `<span class="issue-tag performance">${issue}</span>`).join('')}
                            </div>
                        </div>

                        <div class="issue-category quality">
                            <div class="issue-category-title">コード品質問題</div>
                            <div class="issue-list">
                                ${data.issues.quality.map(issue => `<span class="issue-tag quality">${issue}</span>`).join('')}
                            </div>
                        </div>

                        <div class="issue-category dependencies">
                            <div class="issue-category-title">依存関係問題</div>
                            <div class="issue-list">
                                ${data.issues.dependencies.map(issue => `<span class="issue-tag dependencies">${issue}</span>`).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="case-detail-estimate">
                        <h3>推定改善工数</h3>
                        <div class="estimate-time">${data.estimate}</div>
                        <p class="estimate-note">※実際の工数はプロジェクトの状況により変動します</p>
                    </div>
                `;

                // モーダルのスクロール位置を上部にリセット
                const modalContent = caseDetailModal.querySelector('.modal-content');
                modalContent.scrollTop = 0;

                caseDetailModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // モーダルを閉じる
    function closeCaseDetailModal() {
        caseDetailModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    caseDetailClose.addEventListener('click', closeCaseDetailModal);
    caseDetailOverlay.addEventListener('click', closeCaseDetailModal);

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && caseDetailModal.classList.contains('active')) {
            closeCaseDetailModal();
        }
    });
}

// 事例カードにスクロールアニメーションを追加
document.querySelectorAll('.case-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});
