// LSCO 管理画面 JavaScript

// ============================================
// 初期設定
// ============================================

// 4段階パスワード権限システム
const USER_ROLES = {
    OWNER: {
        name: 'Owner',
        level: 4,
        password: '=j#4374;vU',
        description: '統制管理者／所有者'
    },
    ADMIN: {
        name: 'Admin',
        level: 3,
        password: 'euSR9bQKwT',
        description: '管理者'
    },
    OPERATOR: {
        name: 'Operator',
        level: 2,
        password: 'wdaWxyNtVc',
        description: '運用者'
    },
    VIEWER: {
        name: 'Viewer',
        level: 1,
        password: 'LSCO2026',
        description: '閲覧者'
    }
};

// 現在のユーザー権限を保持
let currentUserRole = null;

// LocalStorageキー
const STORAGE_KEYS = {
    PASSWORD: 'lsco_admin_password',
    TEMPLATES: 'lsco_templates',
    CATEGORIES: 'lsco_categories',
    SESSION: 'lsco_admin_session',
    CALC_SETTINGS: 'lsco_calc_settings',
    USER_ROLE: 'lsco_user_role'
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
        // 保存された権限情報を復元
        const savedRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE);
        if (savedRole) {
            currentUserRole = JSON.parse(savedRole);
        }
        showAdminPanel();
        if (currentUserRole) {
            updateUIForRole(currentUserRole);
        }
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
            // サブメニュー付きの場合はトグル
            if (this.classList.contains('has-submenu')) {
                this.classList.toggle('open');
            } else {
                const section = this.getAttribute('data-section');
                showSection(section);
            }
        });
    });

    // サブメニューのナビゲーション
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
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
    document.getElementById('copy-title-btn').addEventListener('click', copyTemplateTitle);
    document.getElementById('copy-content-btn').addEventListener('click', copyTemplateContent);

    // ダッシュボードのカテゴリーフィルター
    document.getElementById('dashboard-category-filter').addEventListener('change', filterDashboardTemplates);

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

    // 4段階パスワードチェック
    let matchedRole = null;
    for (const [key, role] of Object.entries(USER_ROLES)) {
        if (password === role.password) {
            matchedRole = role;
            break;
        }
    }

    if (matchedRole) {
        currentUserRole = matchedRole;
        sessionStorage.setItem(STORAGE_KEYS.SESSION, 'active');
        sessionStorage.setItem(STORAGE_KEYS.USER_ROLE, JSON.stringify(matchedRole));
        showAdminPanel();
        updateUIForRole(matchedRole);
        showNotification(`${matchedRole.description}としてログインしました`, 'success');
    } else {
        document.getElementById('login-error').style.display = 'block';
        document.getElementById('admin-password').value = '';
    }
}

function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    currentUserRole = null;
    showLoginScreen();
    showNotification('ログアウトしました', 'info');
}

// 権限レベルに応じたUI更新
function updateUIForRole(role) {
    // 権限表示を更新
    const roleDisplay = document.getElementById('current-role-display');
    if (roleDisplay) {
        roleDisplay.textContent = `${role.description} (${role.name})`;
    }

    // Admin未満の場合、設定変更を制限
    if (role.level < USER_ROLES.ADMIN.level) {
        disableSettingsForLowerRoles();
    } else {
        enableSettingsForAdminAndAbove();
    }
}

// Admin未満の権限で設定変更を無効化
function disableSettingsForLowerRoles() {
    // 集計設定の保存ボタンを無効化
    const saveCalcSettingsBtn = document.querySelector('button[onclick="saveCalcSettings()"]');
    if (saveCalcSettingsBtn) {
        saveCalcSettingsBtn.disabled = true;
        saveCalcSettingsBtn.title = '設定の保存にはAdmin以上の権限が必要です';
        saveCalcSettingsBtn.style.opacity = '0.5';
        saveCalcSettingsBtn.style.cursor = 'not-allowed';
    }

    // 集計設定の入力フィールドを読み取り専用に
    document.querySelectorAll('.settings-commission-rate, .settings-ap-rate').forEach(input => {
        input.disabled = true;
        input.title = '設定の変更にはAdmin以上の権限が必要です';
    });

    // パスワード変更フォームを無効化
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.querySelectorAll('input, button').forEach(el => {
            el.disabled = true;
        });
    }

    // カテゴリー管理を無効化
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.disabled = true;
    }
    document.querySelectorAll('.category-list button').forEach(btn => {
        btn.disabled = true;
    });
}

// Admin以上の権限で設定変更を有効化
function enableSettingsForAdminAndAbove() {
    const saveCalcSettingsBtn = document.querySelector('button[onclick="saveCalcSettings()"]');
    if (saveCalcSettingsBtn) {
        saveCalcSettingsBtn.disabled = false;
        saveCalcSettingsBtn.title = '';
        saveCalcSettingsBtn.style.opacity = '1';
        saveCalcSettingsBtn.style.cursor = 'pointer';
    }

    document.querySelectorAll('.settings-commission-rate, .settings-ap-rate').forEach(input => {
        input.disabled = false;
        input.title = '';
    });

    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.querySelectorAll('input, button').forEach(el => {
            el.disabled = false;
        });
    }

    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.disabled = false;
    }
}

// 権限チェック関数
function hasPermission(requiredLevel) {
    if (!currentUserRole) return false;
    return currentUserRole.level >= requiredLevel;
}

// Admin以上の権限が必要な操作のチェック
function requireAdminPermission() {
    if (!hasPermission(USER_ROLES.ADMIN.level)) {
        showNotification('この操作にはAdmin以上の権限が必要です', 'error');
        return false;
    }
    return true;
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

    // サブメニューのアクティブ状態を更新
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
            // 親メニューを開く
            const parentMenu = item.closest('.has-submenu');
            if (parentMenu) {
                parentMenu.classList.add('open');
            }
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
        'calculator-dashboard': '集計ダッシュボード',
        'calculator-1': '集計 - 担当者1',
        'calculator-2': '集計 - 担当者2',
        'calculator-3': '集計 - 担当者3',
        'calculator-settings': '集計設定',
        calendar: 'カレンダー',
        settings: '設定'
    };

    // 集計ページの初期化
    if (sectionName.startsWith('calculator-')) {
        const calcId = sectionName.split('-')[1];
        if (calcId === 'dashboard') {
            updateCalcDashboard();
        } else if (calcId === 'settings') {
            loadCalcSettings();
        } else {
            initCalculatorPage(parseInt(calcId));
        }
    }
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

    // ダッシュボードのカテゴリーフィルターを更新
    loadDashboardCategoryFilter();

    // テンプレートを表示
    renderRecentTemplates(templates);
}

function loadDashboardCategoryFilter() {
    const categories = getCategories();
    const select = document.getElementById('dashboard-category-filter');

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

function filterDashboardTemplates() {
    const categoryFilter = document.getElementById('dashboard-category-filter').value;
    let templates = getTemplates();

    if (categoryFilter) {
        templates = templates.filter(t => t.category === categoryFilter);
    }

    renderRecentTemplates(templates);
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
                    ${template.manager ? `<span><i class="fas fa-user"></i> ${escapeHtml(template.manager)}</span>` : ''}
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
                    ${template.manager ? `<span><i class="fas fa-user"></i> ${escapeHtml(template.manager)}</span>` : ''}
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
    document.getElementById('template-manager').value = template.manager || '';

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
    const manager = document.getElementById('template-manager').value.trim();

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
                manager,
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
            manager,
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

    document.getElementById('preview-title').value = template.title;
    document.getElementById('preview-content').value = template.content;
    document.getElementById('copy-success').style.display = 'none';
    document.getElementById('use-template-modal').classList.add('active');
}

function closeUseModal() {
    document.getElementById('use-template-modal').classList.remove('active');
}

function copyTemplateTitle() {
    const title = document.getElementById('preview-title').value;

    navigator.clipboard.writeText(title).then(() => {
        showCopySuccess('タイトルをコピーしました');
    }).catch(err => {
        // フォールバック
        const input = document.getElementById('preview-title');
        input.select();
        document.execCommand('copy');
        showCopySuccess('タイトルをコピーしました');
    });
}

function copyTemplateContent() {
    const content = document.getElementById('preview-content').value;

    navigator.clipboard.writeText(content).then(() => {
        showCopySuccess('本文をコピーしました');
    }).catch(err => {
        // フォールバック：テキストエリアを選択
        const textarea = document.getElementById('preview-content');
        textarea.select();
        document.execCommand('copy');
        showCopySuccess('本文をコピーしました');
    });
}

function showCopySuccess(message) {
    const successDiv = document.getElementById('copy-success');
    successDiv.innerHTML = `<i class="fas fa-check"></i> ${message}`;
    successDiv.style.display = 'block';
    showNotification(message, 'success');

    // 2秒後にコピー成功メッセージを非表示
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 2000);
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

// ============================================
// 集計機能（3人分対応版）- 修正版
// ============================================

function initCalculatorPage(calcId) {
    const container = document.querySelector(`[data-calc-id="${calcId}"]`);
    if (!container) return;

    // 日付を今日に設定
    const today = new Date().toISOString().split('T')[0];
    const dateInput = container.querySelector('.calc-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = today;
    }

    // 各入力フィールドにイベントリスナーを追加（重複防止）
    if (!container.dataset.initialized) {
        // 本数・別担当・経費の変更時に計算
        container.querySelectorAll('.calc-b-quantity, .calc-b-other, .calc-expense').forEach(input => {
            input.addEventListener('input', () => {
                updateCommissionDisplay(calcId);  // 歩合を自動計算
                calculateAllForCalc(calcId);
            });
        });

        // 担当者名と日付の変更時にもプレビュー更新
        container.querySelector('.calc-staff-name').addEventListener('input', () => {
            updateCalculatorOutputForCalc(calcId);
            updatePreviewTitle(calcId);
        });
        container.querySelector('.calc-date').addEventListener('change', () => updateCalculatorOutputForCalc(calcId));

        // AP担当の変更時にもプレビュー更新
        const apNameInput = container.querySelector('.calc-ap-name');
        if (apNameInput) {
            apNameInput.addEventListener('input', () => updateCalculatorOutputForCalc(calcId));
        }

        container.dataset.initialized = 'true';

        // 設定ページで保存された歩合設定値を適用し、歩合を自動計算
        applyCalcSettingsToPage(calcId);
    }

    // 初回計算
    updateCommissionDisplay(calcId);  // 歩合を自動計算
    calculateAllForCalc(calcId);
    // プレビュータイトルの初期化
    updatePreviewTitle(calcId);
}

function calculateAllForCalc(calcId) {
    const container = document.querySelector(`[data-calc-id="${calcId}"]`);
    if (!container) return;

    let totalQuantity = 0;
    let grandTotalA = 0; // 担当者Aの総合計（50%）

    // 担当者Bのデータから担当者Aを計算
    container.querySelectorAll('.calc-table-b tbody tr').forEach((rowB, index) => {
        const price = parseInt(rowB.dataset.price) || 0;
        const quantityB = parseInt(rowB.querySelector('.calc-b-quantity').value) || 0;

        // 担当者Aの計算（本数は同じ、金額は50%）
        const subtotalA = Math.floor(price * quantityB * 0.5);

        // 担当者Aテーブルに反映
        const rowsA = container.querySelectorAll('.calc-table-a tbody tr');
        if (rowsA[index]) {
            rowsA[index].querySelector('.a-quantity').textContent = quantityB;
            rowsA[index].querySelector('.a-subtotal').textContent = formatCurrency(subtotalA);
        }

        totalQuantity += quantityB;
        grandTotalA += subtotalA;
    });

    // 経費を取得
    const expense = parseInt(container.querySelector('.calc-expense').value) || 0;

    // 担当者A: 合計金額 = 総合計 + 経費（Aは経費を上乗せで受け取る）
    const finalTotal = grandTotalA + expense;

    // 担当者B: 送り = 総合計 - 経費（Bが経費を負担するので、Bに行く金額は総合計から経費を引いた額）
    const sendAmount = grandTotalA - expense;

    // 結果を表示
    container.querySelector('.total-quantity').textContent = totalQuantity + '本';
    container.querySelector('.grand-total').textContent = formatCurrency(grandTotalA);
    container.querySelector('.final-total').textContent = formatCurrency(finalTotal);
    container.querySelector('.send-amount').textContent = formatCurrency(sendAmount);

    // 出力プレビューを更新
    updateCalculatorOutputForCalc(calcId);

    // ダッシュボードを更新
    updateCalcDashboard();
}

// 修正版: 出力プレビュー生成関数
function updateCalculatorOutputForCalc(calcId) {
    const container = document.querySelector(`[data-calc-id="${calcId}"]`);
    if (!container) return;

    const settings = getCalcSettings(calcId);
    const commissionRate = settings ? settings.commissionRate : 0;
    const apRate = settings ? settings.apRate : 0;

    const staffName = container.querySelector('.calc-staff-name').value || '担当者名';
    const apName = container.querySelector('.calc-ap-name') ? container.querySelector('.calc-ap-name').value || 'AP担当者名' : 'AP担当者名';
    const dateInput = container.querySelector('.calc-date').value;
    const date = dateInput ? dateInput : '日付';

    let totalQuantity = 0;
    let detailsA = [];
    let detailsB = [];
    let ruikei = 0;  // 累計 = 金額 × 本数 の合計
    let grandTotalA = 0;  // 担当者Aの総合計（50%）
    let totalApAmount = 0;  // AP設定による計算用
    let totalCommission = 0;  // 歩合合計

    container.querySelectorAll('.calc-table-b tbody tr').forEach(rowB => {
        const price = parseInt(rowB.dataset.price) || 0;
        const quantityB = parseInt(rowB.querySelector('.calc-b-quantity').value) || 0;
        const otherB = parseInt(rowB.querySelector('.calc-b-other').value) || 0;

        // 歩合は自動計算: (本数 + 別担当) × 歩合設定値
        const commissionB = (quantityB + otherB) * commissionRate;

        if (quantityB > 0 || otherB > 0) {
            // 累計 = 金額 × 本数 の合計
            ruikei += price * quantityB;

            // 担当者A: 金額の50%
            const subtotalA = Math.floor(price * quantityB * 0.5);
            if (quantityB > 0) {
                detailsA.push(`${price}×${quantityB}：${subtotalA}`);
            }
            grandTotalA += subtotalA;
            totalQuantity += quantityB;

            // 担当者B: AP設定を使用
            // AP金額 = (本数 + 別担当) × AP設定値
            const apAmount = (quantityB + otherB) * apRate;
            // 歩合金額
            const rowCommission = commissionB;
            // 合計 = AP金額 + 歩合金額
            const rowTotalB = apAmount + rowCommission;

            if (quantityB > 0 || otherB > 0) {
                detailsB.push(`${price}×${quantityB}（${otherB}）（${apAmount}/${rowCommission}/${rowTotalB}）`);
            }
            totalApAmount += apAmount;
            totalCommission += rowCommission;
        }
    });

    const expense = parseInt(container.querySelector('.calc-expense').value) || 0;

    // 担当者A: 合計 = 総合計 + 経費
    const finalTotalA = grandTotalA + expense;

    // 担当者B: 送り = 総合計 - 経費
    const sendAmount = grandTotalA - expense;

    // AP担当者のTOTAL
    const totalBWithCommission = totalApAmount + totalCommission;

    // ===== 修正後のフォーマット =====

    // 担当者Aブロック出力（修正版）- 「担当者A」ラベル削除
    let outputA = `―――――――――――\n`;
    outputA += `${staffName}\n`;  // 「担当者名：」を削除、入力値のみ表示
    outputA += `${date}：${String(totalQuantity).padStart(2, '0')}本\n`;
    outputA += `累計：${ruikei}\n`;  // 累計 = 金額 × 本数 の合計
    outputA += `詳細\n`;  // 「詳細」を追加
    detailsA.forEach(d => outputA += `${d}\n`);
    outputA += `経費：${expense}\n`;
    outputA += `合計：${finalTotalA}\n`;  // 「合計金額」→「合計」
    outputA += `送り：${sendAmount}\n`;  // 送りは1回のみ表示
    outputA += `―――――――――――\n`;
    outputA += `${sendAmount}送りでお願いします\n`;  // 「○○送りでお願いします」を追加

    // 担当者Bブロック出力（修正版）- 「担当者B」ラベル削除
    let outputB = `\n―――――――――――\n`;
    outputB += `${apName}\n`;  // AP担当の入力値を表示
    detailsB.forEach(d => outputB += `${d}\n`);
    outputB += `（TOTAL/${totalBWithCommission}-${expense}＝${totalBWithCommission - expense}）\n`;
    outputB += `―――――――――――`;

    // 全体出力（プレビュー用）
    const output = outputA + outputB;

    // 各出力要素に設定
    container.querySelector('.calc-output').textContent = output;

    // 個別コピー用に保存
    const outputAElement = container.querySelector('.calc-output-a');
    const outputBElement = container.querySelector('.calc-output-b');
    if (outputAElement) outputAElement.textContent = outputA;
    if (outputBElement) outputBElement.textContent = outputB;
}

function updateCalcDashboard() {
    // 各担当者の集計データをダッシュボードに反映
    for (let i = 1; i <= 5; i++) {
        const container = document.querySelector(`[data-calc-id="${i}"]`);
        if (container) {
            const staffName = container.querySelector('.calc-staff-name').value || `担当者${i}`;
            const quantity = container.querySelector('.total-quantity').textContent || '0本';
            const total = container.querySelector('.grand-total').textContent || '¥0';
            const send = container.querySelector('.send-amount').textContent || '¥0';

            const dashStaffName = document.getElementById(`dash-staff-name-${i}`);
            const dashQuantity = document.getElementById(`dash-quantity-${i}`);
            const dashTotal = document.getElementById(`dash-total-${i}`);
            const dashSend = document.getElementById(`dash-send-${i}`);

            if (dashStaffName) dashStaffName.textContent = staffName;
            if (dashQuantity) dashQuantity.textContent = quantity;
            if (dashTotal) dashTotal.textContent = total;
            if (dashSend) dashSend.textContent = send;
        }
    }

    // 全員の出力を更新
    updateAllCalcOutput();
}

function updateAllCalcOutput() {
    let allOutput = '';

    for (let i = 1; i <= 5; i++) {
        const container = document.querySelector(`[data-calc-id="${i}"]`);
        if (container) {
            const output = container.querySelector('.calc-output');
            if (output && output.textContent.trim()) {
                allOutput += output.textContent + '\n\n';
            }
        }
    }

    const allOutputElement = document.getElementById('calc-all-output');
    if (allOutputElement) {
        allOutputElement.textContent = allOutput.trim() || '各担当者のデータを入力してください';
    }
}

function clearCalculator(calcId) {
    const container = document.querySelector(`[data-calc-id="${calcId}"]`);
    if (!container) return;

    // 入力フィールドをクリア
    container.querySelector('.calc-staff-name').value = '';
    const apNameInput = container.querySelector('.calc-ap-name');
    if (apNameInput) apNameInput.value = '';
    container.querySelector('.calc-date').value = new Date().toISOString().split('T')[0];

    // 本数と別担当をクリア（歩合は自動計算なのでクリア不要）
    container.querySelectorAll('.calc-b-quantity, .calc-b-other').forEach(input => {
        input.value = '0';
    });

    container.querySelector('.calc-expense').value = '0';

    // 歩合表示をリセット
    container.querySelectorAll('.calc-b-commission-display').forEach(display => {
        display.textContent = '0';
    });

    // 再計算
    updateCommissionDisplay(calcId);
    calculateAllForCalc(calcId);

    showNotification('入力をクリアしました', 'info');
}

// 担当者Aの結果をコピー
function copyCalculatorResultA(calcId) {
    const container = document.querySelector(`[data-calc-id="${calcId}"]`);
    if (!container) return;

    const outputA = container.querySelector('.calc-output-a');
    if (!outputA) return;

    const text = outputA.textContent;

    navigator.clipboard.writeText(text).then(() => {
        showNotification('担当者Aの結果をコピーしました', 'success');
    }).catch(err => {
        // フォールバック
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('担当者Aの結果をコピーしました', 'success');
    });
}

// 担当者Bの結果をコピー
function copyCalculatorResultB(calcId) {
    const container = document.querySelector(`[data-calc-id="${calcId}"]`);
    if (!container) return;

    const outputB = container.querySelector('.calc-output-b');
    if (!outputB) return;

    const text = outputB.textContent;

    navigator.clipboard.writeText(text).then(() => {
        showNotification('担当者Bの結果をコピーしました', 'success');
    }).catch(err => {
        // フォールバック
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('担当者Bの結果をコピーしました', 'success');
    });
}

// 旧コピー関数（互換性のため残す）
function copyCalculatorResult(calcId) {
    const container = document.querySelector(`[data-calc-id="${calcId}"]`);
    if (!container) return;

    const output = container.querySelector('.calc-output').textContent;

    navigator.clipboard.writeText(output).then(() => {
        showNotification('結果をコピーしました', 'success');
    }).catch(err => {
        // フォールバック
        const textarea = document.createElement('textarea');
        textarea.value = output;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('結果をコピーしました', 'success');
    });
}

function copyAllCalculatorResults() {
    const output = document.getElementById('calc-all-output').textContent;

    navigator.clipboard.writeText(output).then(() => {
        showNotification('全ての結果をコピーしました', 'success');
    }).catch(err => {
        // フォールバック
        const textarea = document.createElement('textarea');
        textarea.value = output;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('全ての結果をコピーしました', 'success');
    });
}

function formatCurrency(amount) {
    return '¥' + amount.toLocaleString();
}

// プレビュータイトルを担当者名で更新
function updatePreviewTitle(calcId) {
    const container = document.querySelector(`[data-calc-id="${calcId}"]`);
    if (!container) return;

    const staffName = container.querySelector('.calc-staff-name').value || '担当者A';
    const previewTitleElement = container.querySelector('.preview-title-name');
    if (previewTitleElement) {
        previewTitleElement.textContent = staffName;
    }
}

// ============================================
// 集計設定（歩合・AP設定）の保存・読み込み
// ============================================

// 集計設定を保存
function saveCalcSettings() {
    // Admin以上の権限チェック
    if (!requireAdminPermission()) {
        return;
    }

    const settings = {};

    for (let calcId = 1; calcId <= 5; calcId++) {
        const commissionRateInput = document.querySelector(`.settings-commission-rate[data-settings-id="${calcId}"]`);
        const apRateInput = document.querySelector(`.settings-ap-rate[data-settings-id="${calcId}"]`);

        if (commissionRateInput && apRateInput) {
            settings[calcId] = {
                commissionRate: parseInt(commissionRateInput.value) || 0,  // 歩合（1本単価）
                apRate: parseInt(apRateInput.value) || 0  // AP設定（1本単価）
            };
        }
    }

    localStorage.setItem(STORAGE_KEYS.CALC_SETTINGS, JSON.stringify(settings));
    showNotification('集計設定を保存しました', 'success');
}

// 集計設定を読み込み（設定ページ用）
function loadCalcSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.CALC_SETTINGS);
    if (!data) return;

    const settings = JSON.parse(data);

    for (let calcId = 1; calcId <= 5; calcId++) {
        if (!settings[calcId]) continue;

        const commissionRateInput = document.querySelector(`.settings-commission-rate[data-settings-id="${calcId}"]`);
        const apRateInput = document.querySelector(`.settings-ap-rate[data-settings-id="${calcId}"]`);

        if (commissionRateInput) {
            commissionRateInput.value = settings[calcId].commissionRate || 0;
        }
        if (apRateInput) {
            apRateInput.value = settings[calcId].apRate || 0;
        }
    }
}

// 集計設定を取得（集計ページ用）
function getCalcSettings(calcId) {
    const data = localStorage.getItem(STORAGE_KEYS.CALC_SETTINGS);
    if (!data) return null;

    const settings = JSON.parse(data);
    return settings[calcId] || null;
}

// 集計ページに設定値を適用（歩合自動計算）
function applyCalcSettingsToPage(calcId) {
    // 初回計算をトリガー
    updateCommissionDisplay(calcId);
}

// 歩合表示を自動更新（本数+別担当）×歩合設定値
function updateCommissionDisplay(calcId) {
    const settings = getCalcSettings(calcId);
    const container = document.querySelector(`[data-calc-id="${calcId}"]`);
    if (!container) return;

    const commissionRate = settings ? settings.commissionRate : 0;
    let totalQuantity = 0;
    let totalCommission = 0;

    container.querySelectorAll('.calc-table-b tbody tr').forEach(row => {
        const quantity = parseInt(row.querySelector('.calc-b-quantity').value) || 0;
        const other = parseInt(row.querySelector('.calc-b-other').value) || 0;

        // 歩合 = (本数 + 別担当) × 歩合設定値
        const commission = (quantity + other) * commissionRate;

        // 歩合表示を更新
        const commissionDisplay = row.querySelector('.calc-b-commission-display');
        if (commissionDisplay) {
            commissionDisplay.textContent = commission.toLocaleString();
        }

        totalQuantity += quantity;
        totalCommission += commission;
    });

    // 合計表示を更新
    const totalQuantityEl = container.querySelector('.calc-total-quantity');
    const totalCommissionEl = container.querySelector('.calc-total-commission');
    if (totalQuantityEl) totalQuantityEl.textContent = totalQuantity;
    if (totalCommissionEl) totalCommissionEl.textContent = totalCommission.toLocaleString();
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
window.clearCalculator = clearCalculator;
window.copyCalculatorResult = copyCalculatorResult;
window.copyCalculatorResultA = copyCalculatorResultA;
window.copyCalculatorResultB = copyCalculatorResultB;
window.copyAllCalculatorResults = copyAllCalculatorResults;
window.saveCalcSettings = saveCalcSettings;
window.loadCalcSettings = loadCalcSettings;
