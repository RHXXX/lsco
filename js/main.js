// メインJavaScriptファイル

// DOMの読み込みが完了してから実行
document.addEventListener('DOMContentLoaded', function() {
    // モバイルメニューの制御
    initializeMobileMenu();
    
    // スムーズスクロール
    initializeSmoothScroll();
    
    // お問い合わせフォームのバリデーション
    initializeContactForm();
    
    // スクロール時のヘッダー制御
    initializeScrollHeader();
    
    // フォームのプレースホルダーアニメーション
    initializeFormAnimation();
});

// モバイルメニュー制御
function initializeMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const nav = document.getElementById('nav');
    
    if (!mobileMenuToggle || !nav) return;
    
    mobileMenuToggle.addEventListener('click', function() {
        mobileMenuToggle.classList.toggle('active');
        nav.classList.toggle('active');
        
        // メニューの開閉状態に応じてボタンのテキストを変更
        const isExpanded = nav.classList.contains('active');
        mobileMenuToggle.setAttribute('aria-label', 
            isExpanded ? 'メニューを閉じる' : 'メニューを開く'
        );
    });
    
    // メニュー項目をクリックしたらメニューを閉じる
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenuToggle.classList.remove('active');
            nav.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-label', 'メニューを開く');
        });
    });
    
    // 画面外をクリックしたらメニューを閉じる
    document.addEventListener('click', function(event) {
        if (!nav.contains(event.target) && 
            !mobileMenuToggle.contains(event.target) && 
            nav.classList.contains('active')) {
            mobileMenuToggle.classList.remove('active');
            nav.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-label', 'メニューを開く');
        }
    });
}

// スムーズスクロール
function initializeSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // 外部リンクや空のリンクは無視
            if (!href || href === '#' || href.startsWith('http')) {
                return;
            }
            
            e.preventDefault();
            
            const targetElement = document.querySelector(href);
            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// スクロール時のヘッダー制御
function initializeScrollHeader() {
    const header = document.querySelector('.header');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', function() {
        const currentScrollY = window.scrollY;
        
        // 下にスクロールしたらヘッダーを隠す
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            header.style.transform = 'translateY(-100%)';
        } else {
            // 上にスクロールしたらヘッダーを表示
            header.style.transform = 'translateY(0)';
        }
        
        // スクロール位置が0の場合は常に表示
        if (currentScrollY === 0) {
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    });
}

// お問い合わせフォーム制御
function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // フォームのバリデーション
        if (validateForm(this)) {
            // フォーム送信処理
            submitForm(this);
        }
    });
}

// フォームバリデーション
function validateForm(form) {
    let isValid = true;
    const errors = [];
    
    // 必須項目のチェック
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'この項目は必須です');
            isValid = false;
            errors.push(`${getFieldLabel(field)}は必須です`);
        } else {
            clearFieldError(field);
        }
    });
    
    // メールアドレスの形式チェック
    const emailField = form.querySelector('input[type="email"]');
    if (emailField && emailField.value.trim()) {
        if (!isValidEmail(emailField.value)) {
            showFieldError(emailField, '有効なメールアドレスを入力してください');
            isValid = false;
            errors.push('メールアドレスの形式が正しくありません');
        }
    }
    
    // 電話番号の形式チェック（任意項目）
    const phoneField = form.querySelector('input[type="tel"]');
    if (phoneField && phoneField.value.trim()) {
        if (!isValidPhone(phoneField.value)) {
            showFieldError(phoneField, '有効な電話番号を入力してください');
            isValid = false;
            errors.push('電話番号の形式が正しくありません');
        }
    }
    
    // エラーがあれば表示
    if (!isValid) {
        showFormError(errors.join('<br>'));
    }
    
    return isValid;
}

// フィールドエラーの表示
function showFieldError(field, message) {
    // エラーメッセージを作成
    let errorElement = field.parentNode.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.className = 'error-message';
        field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    field.classList.add('error');
    
    // アニメーション効果
    field.style.borderColor = '#ef4444';
    errorElement.style.color = '#ef4444';
    errorElement.style.fontSize = '0.9rem';
    errorElement.style.marginTop = '0.25rem';
    errorElement.style.display = 'block';
}

// フィールドエラーのクリア
function clearFieldError(field) {
    const errorElement = field.parentNode.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
    field.classList.remove('error');
    field.style.borderColor = '#e2e8f0';
}

// フォーム全体のエラー表示
function showFormError(message) {
    // 既存のエラーメッセージをクリア
    const existingError = document.querySelector('.form-error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 新しいエラーメッセージを作成
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message form-error-message';
    errorDiv.innerHTML = message;
    errorDiv.style.backgroundColor = '#fee2e2';
    errorDiv.style.color = '#991b1b';
    errorDiv.style.padding = '1rem';
    errorDiv.style.borderRadius = '8px';
    errorDiv.style.marginBottom = '1rem';
    errorDiv.style.border = '1px solid #fecaca';
    
    const form = document.getElementById('contact-form');
    form.insertBefore(errorDiv, form.firstChild);
    
    // 3秒後に自動的に消える
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// メールアドレスの形式チェック
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 電話番号の形式チェック
function isValidPhone(phone) {
    const phoneRegex = /^[0-9０-９ー\-\s()（）]+$/;
    return phoneRegex.test(phone.replace(/[\s\-()（）]/g, ''));
}

// フィールドラベルの取得
function getFieldLabel(field) {
    const label = field.parentNode.querySelector('label');
    return label ? label.textContent.replace('*', '').trim() : 'この項目';
}

// フォーム送信処理
function submitForm(form) {
    const submitButton = form.querySelector('.submit-button');
    const originalButtonText = submitButton.textContent;
    
    // ボタンを無効化して送信中にする
    submitButton.disabled = true;
    submitButton.textContent = '送信中...⏳';
    
    // フォームデータの収集
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    // 実際の送信処理（デモ用）
    setTimeout(() => {
        // 成功メッセージの表示
        showSuccessMessage('お問い合わせを受け付けました。\n担当者よりご連絡いたします。\n<br>ありがとうございました。✨');
        
        // フォームをリセット
        form.reset();
        
        // ボタンを元に戻す
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        
    }, 2000); // 2秒の遅延（実際の送信処理のシミュレーション）
}

// 成功メッセージの表示
function showSuccessMessage(message) {
    // 既存のメッセージをクリア
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 新しい成功メッセージを作成
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = message;
    successDiv.style.display = 'block';
    
    const form = document.getElementById('contact-form');
    form.insertBefore(successDiv, form.firstChild);
    
    // 5秒後に自動的に消える
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
}

// フォームアニメーション
function initializeFormAnimation() {
    const formInputs = document.querySelectorAll('.form-group input, .form-group textarea');
    
    formInputs.forEach(input => {
        // フォーカス時のエフェクト
        input.addEventListener('focus', function() {
            this.parentNode.classList.add('focused');
        });
        
        // フォーカスが外れた時
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentNode.classList.remove('focused');
            }
        });
        
        // 入力時のエフェクト
        input.addEventListener('input', function() {
            if (this.value) {
                this.parentNode.classList.add('has-value');
            } else {
                this.parentNode.classList.remove('has-value');
            }
        });
    });
}

// スクロールアニメーション（オプション）
function initializeScrollAnimation() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);
    
    // 監視対象の要素を追加
    const animatedElements = document.querySelectorAll('.service-card, .stat-item, .about-text');
    animatedElements.forEach(el => observer.observe(el));
}