// LSCO 管理画面 JavaScript

// ============================================
// 初期設定
// ============================================

// デフォルトパスワード（初回のみ使用、変更可能）
const DEFAULT_PASSWORD = 'lsco2024';

// LocalStorageキー
const STORAGE_KEYS = {
    PASSWORD: 'lsco_admin_password',
    TEMPLATES: 'lsco_templates',
    CATEGORIES: 'lsco_categories',
    SESSION: 'lsco_admin_session'
};

// デフォルトカテゴリー
const DEFAULT_CATEGORIES = [
    'お問い合わせ対応',
    '見積り関連',
    'サポート対応',
    '営業関連',
    'その他'
];

// ============================================
// 初期化
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initializeStorage();
    checkSession();
    initializeEventListeners();
});

// ストレージの初期化
function initializeStorage() {
    // パスワードの初期化
    if (!localStorage.getItem(STORAGE_KEYS.PASSWORD)) {
        localStorage.setItem(STORAGE_KEYS.PASSWORD, DEFAULT_PASSWORD);
    }

    // カテゴリーの初期化
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }

    // テンプレートの初期化
    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
        // サンプルテンプレートを追加
        const sampleTemplates = [
            {
                id: generateId(),
                title: 'お問い合わせありがとうございます',
                category: 'お問い合わせ対応',
                content: `お問い合わせいただき、誠にありがとうございます。

ご質問の件について、以下の通りご回答いたします。

【回答内容】
（ここに回答を記入）

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともLSCOをよろしくお願いいたします。`,
                tags: ['お問い合わせ', '返信'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: generateId(),
                title: 'お見積りのご案内',
                category: '見積り関連',
                content: `お世話になっております。
LSCOの○○でございます。

この度はお見積りのご依頼をいただき、誠にありがとうございます。

ご依頼いただきました件について、下記の通りお見積りをご案内いたします。

【件名】
【金額】 ¥○○○,○○○（税込）
【有効期限】 本見積り発行日より30日間

詳細は添付のお見積書をご確認ください。

ご検討のほど、よろしくお願いいたします。`,
                tags: ['見積り', '営業'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: generateId(),
                title: 'サポート完了のご報告',
                category: 'サポート対応',
                content: `お世話になっております。
LSCOサポートチームでございます。

ご報告いただいておりました件について、対応が完了いたしましたのでご連絡いたします。

【対応内容】
・（対応した内容を記入）

【確認のお願い】
お手数ですが、問題が解決されているかご確認いただけますと幸いです。

引き続き何かございましたら、お気軽にご連絡ください。`,
                tags: ['サポート', '完了報告'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(sampleTemplates));
    }
}

// セッションチェック
function checkSession() {
    const session = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    if (session === 'active') {
        showAdminPanel();
    } else {
        showLoginScreen();
    }
}

// イベントリスナーの初期化
function initializeEventListeners() {
    // ログインフォーム
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // パスワード表示切り替え
    document.getElementById('toggle-password').addEventListener('click', togglePasswordVisibility);

    // ログアウト
    document.getElementById('logout-button').addEventListener('click', handleLogout);

    // サイドバートグル
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);

    // ナビゲーション
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });

    // テンプレート追加ボタン
    document.getElementById('add-template-btn').addEventListener('click', openAddTemplateModal);

    // モーダル閉じるボタン
    document.getElementById('modal-close').addEventListener('click', closeModal);

    // テンプレートフォーム
    document.getElementById('template-form').addEventListener('submit', handleTemplateSubmit);

    // テンプレート検索
    document.getElementById('template-search').addEventListener('input', filterTemplates);

    // カテゴリーフィルター
    document.getElementById('category-filter').addEventListener('change', filterTemplates);

    // パスワード変更フォーム
    document.getElementById('change-password-form').addEventListener('submit', handlePasswordChange);

    // カテゴリー追加
    document.getElementById('add-category-btn').addEventListener('click', addCategory);

    // データエクスポート
    document.getElementById('export-data-btn').addEventListener('click', exportData);

    // データインポート
    document.getElementById('import-data-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importData);

    // コピーボタン
    document.getElementById('copy-template-btn').addEventListener('click', copyTemplateContent);

    // モーダル外クリックで閉じる
    document.getElementById('template-modal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    document.getElementById('use-template-modal').addEventListener('click', function(e) {
        if (e.target === this) closeUseModal();
    });
}

// ============================================
// 認証機能
// ============================================

function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    const storedPassword = localStorage.getItem(STORAGE_KEYS.PASSWORD);

    if (password === storedPassword) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION, 'active');
        showAdminPanel();
        showNotification('ログインしました', 'success');
    } else {
        document.getElementById('login-error').style.display = 'block';
        document.getElementById('admin-password').value = '';
    }
}

function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    showLoginScreen();
    showNotification('ログアウトしました', 'info');
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('admin-password');
    const toggleIcon = document.querySelector('#toggle-password i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const storedPassword = localStorage.getItem(STORAGE_KEYS.PASSWORD);

    if (currentPassword !== storedPassword) {
        showNotification('現在のパスワードが正しくありません', 'error');
        return;
    }

    if (newPassword.length < 4) {
        showNotification('パスワードは4文字以上で設定してください', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('新しいパスワードが一致しません', 'error');
        return;
    }

    localStorage.setItem(STORAGE_KEYS.PASSWORD, newPassword);
    showNotification('パスワードを変更しました', 'success');

    // フォームをリセット
    document.getElementById('change-password-form').reset();
}

// ============================================
// 画面表示制御
// ============================================

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-password').value = '';
    document.getElementById('login-error').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';

    // ダッシュボードを表示
    showSection('dashboard');

    // データを読み込み
    loadDashboard();
    loadTemplates();
    loadCategories();
}

function showSection(sectionName) {
    // ナビゲーションのアクティブ状態を更新
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
        }
    });

    // セクションの表示を切り替え
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');

    // ページタイトルを更新
    const titles = {
        dashboard: 'ダッシュボード',
        templates: 'テンプレート管理',
        settings: '設定'
    };
    document.getElementById('page-title').textContent = titles[sectionName] || sectionName;

    // モバイルでサイドバーを閉じる
    if (window.innerWidth <= 1024) {
        document.querySelector('.admin-sidebar').classList.remove('open');
    }
}

function toggleSidebar() {
    document.querySelector('.admin-sidebar').classList.toggle('open');
}

// ============================================
// ダッシュボード
// ============================================

function loadDashboard() {
    const templates = getTemplates();
    const categories = getCategories();

    // 統計情報を更新
    document.getElementById('template-count').textContent = templates.length;
    document.getElementById('category-count').textContent = categories.length;

    // 最終更新日を表示
    if (templates.length > 0) {
        const sortedTemplates = [...templates].sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        const lastUpdate = new Date(sortedTemplates[0].updatedAt);
        document.getElementById('last-update').textContent = formatDate(lastUpdate);
    } else {
        document.getElementById('last-update').textContent = '-';
    }

    // 最近のテンプレートを表示
    renderRecentTemplates(templates.slice(0, 3));
}

function renderRecentTemplates(templates) {
    const container = document.getElementById('recent-template-list');

    if (templates.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>テンプレートがありません</p>
            </div>
        `;
        return;
    }

    container.innerHTML = templates.map(template => `
        <div class="template-item">
            <div class="template-info">
                <h3>${escapeHtml(template.title)}</h3>
                <div class="template-meta">
                    <span><i class="fas fa-folder"></i> ${escapeHtml(template.category || 'なし')}</span>
                    <span><i class="fas fa-clock"></i> ${formatDate(new Date(template.updatedAt))}</span>
                </div>
            </div>
            <div class="template-actions">
                <button class="use-btn" onclick="openUseModal('${template.id}')">
                    <i class="fas fa-copy"></i> 使用
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// テンプレート管理
// ============================================

function getTemplates() {
    const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return data ? JSON.parse(data) : [];
}

function saveTemplates(templates) {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
}

function loadTemplates() {
    const templates = getTemplates();
    renderTemplates(templates);
    loadCategoryFilter();
}

function renderTemplates(templates) {
    const container = document.getElementById('template-list');

    if (templates.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>テンプレートがありません</h3>
                <p>「新規テンプレート」ボタンから追加してください</p>
            </div>
        `;
        return;
    }

    container.innerHTML = templates.map(template => `
        <div class="template-item" data-id="${template.id}">
            <div class="template-info">
                <h3>${escapeHtml(template.title)}</h3>
                <div class="template-meta">
                    <span><i class="fas fa-folder"></i> ${escapeHtml(template.category || 'カテゴリーなし')}</span>
                    <span><i class="fas fa-clock"></i> ${formatDate(new Date(template.updatedAt))}</span>
                </div>
                <p class="template-preview-text">${escapeHtml(template.content.substring(0, 100))}...</p>
                ${template.tags && template.tags.length > 0 ? `
                    <div class="template-tags">
                        ${template.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="template-actions">
                <button class="use-btn" onclick="openUseModal('${template.id}')" title="コピーして使用">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="edit-btn" onclick="openEditTemplateModal('${template.id}')" title="編集">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteTemplate('${template.id}')" title="削除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function filterTemplates() {
    const searchTerm = document.getElementById('template-search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;

    let templates = getTemplates();

    // 検索フィルター
    if (searchTerm) {
        templates = templates.filter(t =>
            t.title.toLowerCase().includes(searchTerm) ||
            t.content.toLowerCase().includes(searchTerm) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }

    // カテゴリーフィルター
    if (categoryFilter) {
        templates = templates.filter(t => t.category === categoryFilter);
    }

    renderTemplates(templates);
}

function openAddTemplateModal() {
    document.getElementById('modal-title').innerHTML = '<i class="fas fa-file-alt"></i> 新規テンプレート';
    document.getElementById('template-form').reset();
    document.getElementById('template-id').value = '';
    loadModalCategories();
    document.getElementById('template-modal').classList.add('active');
}

function openEditTemplateModal(id) {
    const templates = getTemplates();
    const template = templates.find(t => t.id === id);

    if (!template) {
        showNotification('テンプレートが見つかりません', 'error');
        return;
    }

    document.getElementById('modal-title').innerHTML = '<i class="fas fa-edit"></i> テンプレートを編集';
    document.getElementById('template-id').value = template.id;
    document.getElementById('template-title').value = template.title;
    document.getElementById('template-content').value = template.content;
    document.getElementById('template-tags').value = template.tags ? template.tags.join(', ') : '';

    loadModalCategories();
    document.getElementById('template-category').value = template.category || '';

    document.getElementById('template-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('template-modal').classList.remove('active');
}

function handleTemplateSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('template-id').value;
    const title = document.getElementById('template-title').value.trim();
    const category = document.getElementById('template-category').value;
    const content = document.getElementById('template-content').value.trim();
    const tagsInput = document.getElementById('template-tags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    if (!title || !content) {
        showNotification('タイトルと内容は必須です', 'error');
        return;
    }

    const templates = getTemplates();

    if (id) {
        // 編集
        const index = templates.findIndex(t => t.id === id);
        if (index !== -1) {
            templates[index] = {
                ...templates[index],
                title,
                category,
                content,
                tags,
                updatedAt: new Date().toISOString()
            };
            showNotification('テンプレートを更新しました', 'success');
        }
    } else {
        // 新規追加
        const newTemplate = {
            id: generateId(),
            title,
            category,
            content,
            tags,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        templates.unshift(newTemplate);
        showNotification('テンプレートを追加しました', 'success');
    }

    saveTemplates(templates);
    closeModal();
    loadTemplates();
    loadDashboard();
}

function deleteTemplate(id) {
    if (!confirm('このテンプレートを削除しますか？')) {
        return;
    }

    let templates = getTemplates();
    templates = templates.filter(t => t.id !== id);
    saveTemplates(templates);

    showNotification('テンプレートを削除しました', 'success');
    loadTemplates();
    loadDashboard();
}

// ============================================
// テンプレート使用（コピー機能）
// ============================================

function openUseModal(id) {
    const templates = getTemplates();
    const template = templates.find(t => t.id === id);

    if (!template) {
        showNotification('テンプレートが見つかりません', 'error');
        return;
    }

    document.getElementById('preview-title').textContent = template.title;
    document.getElementById('preview-content').value = template.content;
    document.getElementById('copy-success').style.display = 'none';
    document.getElementById('use-template-modal').classList.add('active');
}

function closeUseModal() {
    document.getElementById('use-template-modal').classList.remove('active');
}

function copyTemplateContent() {
    const content = document.getElementById('preview-content').value;

    navigator.clipboard.writeText(content).then(() => {
        document.getElementById('copy-success').style.display = 'block';
        showNotification('クリップボードにコピーしました', 'success');

        // 2秒後にコピー成功メッセージを非表示
        setTimeout(() => {
            document.getElementById('copy-success').style.display = 'none';
        }, 2000);
    }).catch(err => {
        // フォールバック：テキストエリアを選択
        const textarea = document.getElementById('preview-content');
        textarea.select();
        document.execCommand('copy');

        document.getElementById('copy-success').style.display = 'block';
        showNotification('クリップボードにコピーしました', 'success');
    });
}

// ============================================
// カテゴリー管理
// ============================================

function getCategories() {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return data ? JSON.parse(data) : [];
}

function saveCategories(categories) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
}

function loadCategories() {
    const categories = getCategories();
    renderCategories(categories);
}

function renderCategories(categories) {
    const container = document.getElementById('category-list');

    if (categories.length === 0) {
        container.innerHTML = '<li>カテゴリーがありません</li>';
        return;
    }

    container.innerHTML = categories.map(category => `
        <li>
            <span>${escapeHtml(category)}</span>
            <button onclick="deleteCategory('${escapeHtml(category)}')" title="削除">
                <i class="fas fa-times"></i>
            </button>
        </li>
    `).join('');
}

function loadCategoryFilter() {
    const categories = getCategories();
    const select = document.getElementById('category-filter');

    // 既存のオプションをクリア（最初のオプションは残す）
    while (select.options.length > 1) {
        select.remove(1);
    }

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function loadModalCategories() {
    const categories = getCategories();
    const select = document.getElementById('template-category');

    // 既存のオプションをクリア（最初のオプションは残す）
    while (select.options.length > 1) {
        select.remove(1);
    }

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function addCategory() {
    const input = document.getElementById('new-category');
    const categoryName = input.value.trim();

    if (!categoryName) {
        showNotification('カテゴリー名を入力してください', 'error');
        return;
    }

    const categories = getCategories();

    if (categories.includes(categoryName)) {
        showNotification('このカテゴリーは既に存在します', 'error');
        return;
    }

    categories.push(categoryName);
    saveCategories(categories);

    input.value = '';
    showNotification('カテゴリーを追加しました', 'success');
    loadCategories();
    loadCategoryFilter();
    loadDashboard();
}

function deleteCategory(categoryName) {
    if (!confirm(`カテゴリー「${categoryName}」を削除しますか？\n※このカテゴリーを使用しているテンプレートのカテゴリーは「なし」になります`)) {
        return;
    }

    let categories = getCategories();
    categories = categories.filter(c => c !== categoryName);
    saveCategories(categories);

    // テンプレートのカテゴリーも更新
    let templates = getTemplates();
    templates = templates.map(t => {
        if (t.category === categoryName) {
            return { ...t, category: '' };
        }
        return t;
    });
    saveTemplates(templates);

    showNotification('カテゴリーを削除しました', 'success');
    loadCategories();
    loadCategoryFilter();
    loadTemplates();
    loadDashboard();
}

// ============================================
// データのエクスポート/インポート
// ============================================

function exportData() {
    const data = {
        templates: getTemplates(),
        categories: getCategories(),
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `lsco_templates_${formatDateForFile(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('データをエクスポートしました', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);

            if (!confirm('現在のデータを上書きしますか？')) {
                return;
            }

            if (data.templates) {
                saveTemplates(data.templates);
            }

            if (data.categories) {
                saveCategories(data.categories);
            }

            showNotification('データをインポートしました', 'success');
            loadTemplates();
            loadCategories();
            loadDashboard();

        } catch (error) {
            showNotification('ファイルの読み込みに失敗しました', 'error');
        }
    };
    reader.readAsText(file);

    // ファイル選択をリセット
    e.target.value = '';
}

// ============================================
// ユーティリティ関数
// ============================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function formatDateForFile(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// グローバル関数として公開（HTML内のonclickから呼び出し用）
window.showSection = showSection;
window.openAddTemplateModal = openAddTemplateModal;
window.openEditTemplateModal = openEditTemplateModal;
window.closeModal = closeModal;
window.openUseModal = openUseModal;
window.closeUseModal = closeUseModal;
window.deleteTemplate = deleteTemplate;
window.deleteCategory = deleteCategory;
