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
