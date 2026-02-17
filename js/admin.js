// LSCO 管理画面 JavaScript

// ============================================
// 初期設定
// ============================================

// 4段階権限システム（認証は Supabase Auth で行う）
const USER_ROLES = {
    OWNER: {
        name: 'Owner',
        level: 4,
        description: '統制管理者／所有者'
    },
    ADMIN: {
        name: 'Admin',
        level: 3,
        description: '管理者'
    },
    OPERATOR: {
        name: 'Operator',
        level: 2,
        description: '運用者'
    },
    VIEWER: {
        name: 'Viewer',
        level: 1,
        description: '閲覧者'
    }
};

// 権限別アクセス制御設定（Ownerが変更可能）
const DEFAULT_PERMISSION_CONFIG = {
    // 各メニューの最小必要権限レベル
    dashboard: 1,        // Viewer以上
    templates: 1,        // Viewer以上
    calculator: 3,       // Admin以上
    calendar: 2,         // Operator以上
    settings: 3,         // Admin以上
    profile: 1,          // Viewer以上
    assetManagement: 4   // Ownerのみ
};

// 権限設定を取得
function getPermissionConfig() {
    const saved = localStorage.getItem('lsco_permission_config');
    if (saved) {
        return JSON.parse(saved);
    }
    return DEFAULT_PERMISSION_CONFIG;
}

// 権限設定を保存（Ownerのみ）
function savePermissionConfig(config) {
    if (!currentUserRole || currentUserRole.level < USER_ROLES.OWNER.level) {
        showNotification('この操作にはOwner権限が必要です', 'error');
        return false;
    }
    localStorage.setItem('lsco_permission_config', JSON.stringify(config));
    showNotification('権限設定を保存しました', 'success');
    return true;
}

// メニューへのアクセス権限をチェック
function canAccessMenu(menuName) {
    if (!currentUserRole) return false;
    const config = getPermissionConfig();
    const requiredLevel = config[menuName] || 4;
    return currentUserRole.level >= requiredLevel;
}

// 権限設定をUIから保存
function savePermissionSettings() {
    if (!currentUserRole || currentUserRole.level < USER_ROLES.OWNER.level) {
        showNotification('この操作にはOwner権限が必要です', 'error');
        return;
    }

    const config = {
        dashboard: parseInt(document.getElementById('perm-dashboard').value),
        templates: parseInt(document.getElementById('perm-templates').value),
        calculator: parseInt(document.getElementById('perm-calculator').value),
        calendar: parseInt(document.getElementById('perm-calendar').value),
        settings: parseInt(document.getElementById('perm-settings').value),
        profile: parseInt(document.getElementById('perm-profile').value),
        assetManagement: parseInt(document.getElementById('perm-assetManagement').value)
    };

    localStorage.setItem('lsco_permission_config', JSON.stringify(config));
    showNotification('権限設定を保存しました', 'success');

    // UIを更新
    updateUIForRole(currentUserRole);
}

// 権限設定をUIに読み込み
function loadPermissionSettings() {
    const config = getPermissionConfig();

    const permDashboard = document.getElementById('perm-dashboard');
    const permTemplates = document.getElementById('perm-templates');
    const permCalculator = document.getElementById('perm-calculator');
    const permCalendar = document.getElementById('perm-calendar');
    const permSettings = document.getElementById('perm-settings');
    const permProfile = document.getElementById('perm-profile');
    const permAssetManagement = document.getElementById('perm-assetManagement');

    if (permDashboard) permDashboard.value = config.dashboard;
    if (permTemplates) permTemplates.value = config.templates;
    if (permCalculator) permCalculator.value = config.calculator;
    if (permCalendar) permCalendar.value = config.calendar;
    if (permSettings) permSettings.value = config.settings;
    if (permProfile) permProfile.value = config.profile;
    if (permAssetManagement) permAssetManagement.value = config.assetManagement;
}

// グローバルに公開
window.savePermissionSettings = savePermissionSettings;

// 現在のユーザー権限を保持
let currentUserRole = null;
let currentUserId = null;
let supabaseClient = null;

// Supabase クライアント初期化
function initSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const config = window.__SUPABASE_CONFIG;
    if (!config || !config.url || !config.anonKey) {
        console.error('[LSCO Auth] Supabase config missing');
        return null;
    }
    if (!window.supabase || !window.supabase.createClient) {
        console.error('[LSCO Auth] Supabase library not loaded');
        return null;
    }
    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    console.log('[LSCO Auth] Supabase client initialized');
    return supabaseClient;
}

function requireSupabaseClient() {
    const client = initSupabaseClient();
    if (!client) {
        showNotification('Supabase の初期化に失敗しました', 'error');
    }
    return client;
}

// role 文字列 → USER_ROLES オブジェクトに変換
function mapRoleName(roleName) {
    if (!roleName) return null;
    const normalized = String(roleName).toLowerCase();
    if (normalized === 'owner') return USER_ROLES.OWNER;
    if (normalized === 'admin') return USER_ROLES.ADMIN;
    if (normalized === 'operator') return USER_ROLES.OPERATOR;
    if (normalized === 'viewer') return USER_ROLES.VIEWER;
    return null;
}

// Supabase user_roles テーブルから role を取得
async function fetchUserRole(userId) {
    const client = requireSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

    console.log('[role] uid=', userId, 'roleRow=', data, 'error=', error);
    if (error) {
        console.error('[LSCO Auth] role fetch error:', error);
        return null;
    }
    console.log('[LSCO Auth] role fetched:', data && data.role);
    const role = mapRoleName(data && data.role);
    if (!role) {
        console.error('[LSCO Auth] role value not recognized:', data && data.role);
        return null;
    }
    return role;
}

// LocalStorageキー
const STORAGE_KEYS = {
    TEMPLATES: 'lsco_templates',
    CATEGORIES: 'lsco_categories',
    CALC_SETTINGS: 'lsco_calc_settings',
    PORTFOLIO: 'lsco_portfolio',
    WATCHLIST: 'lsco_watchlist',
    CANDIDATES: 'lsco_candidates',
    INVESTMENT_NOTES: 'lsco_investment_notes',
    PROFILES: 'lsco_profiles'
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
    console.log('[LSCO Init] DOMContentLoaded fired');
    initializeStorage();
    initSupabaseClient();
    checkSession();
    initializeEventListeners();
    console.log('[LSCO Init] All initialization complete');
});

// ストレージの初期化
function initializeStorage() {
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
async function checkSession() {
    console.log('[LSCO Auth] checkSession start');
    const client = requireSupabaseClient();
    if (!client) {
        showLoginScreen();
        return;
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
        console.error('[LSCO Auth] getSession error:', error);
        showLoginScreen();
        return;
    }

    const session = data && data.session;
    if (!session || !session.user) {
        console.log('[LSCO Auth] No active session, showing login screen');
        showLoginScreen();
        return;
    }

    currentUserId = session.user.id;
    const role = await fetchUserRole(session.user.id);
    if (!role) {
        showNotification('権限が見つかりません。管理者に連絡してください。', 'error');
        await client.auth.signOut();
        showLoginScreen();
        return;
    }

    currentUserRole = role;
    showAdminPanel();
    updateUIForRole(currentUserRole);
    console.log('[LSCO Auth] Admin panel shown with role:', currentUserRole.name);
}

// 安全なイベントリスナー登録ヘルパー
function safeAddListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

// イベントリスナーの初期化
function initializeEventListeners() {
    // ログインフォーム
    safeAddListener('login-form', 'submit', handleLogin);

    // パスワード表示切り替え
    safeAddListener('toggle-password', 'click', togglePasswordVisibility);

    // ログアウト
    safeAddListener('logout-button', 'click', handleLogout);

    // サイドバートグル
    safeAddListener('sidebar-toggle', 'click', toggleSidebar);

    // ナビゲーション
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
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

    // テンプレート関連
    safeAddListener('add-template-btn', 'click', openAddTemplateModal);
    safeAddListener('modal-close', 'click', closeModal);
    safeAddListener('template-form', 'submit', handleTemplateSubmit);
    safeAddListener('template-search', 'input', filterTemplates);
    safeAddListener('category-filter', 'change', filterTemplates);

    // 設定関連
    safeAddListener('change-password-form', 'submit', handlePasswordChange);
    safeAddListener('add-category-btn', 'click', addCategory);
    safeAddListener('export-data-btn', 'click', exportData);

    // データインポート
    const importBtn = document.getElementById('import-data-btn');
    const importFile = document.getElementById('import-file');
    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', importData);
    }

    // コピーボタン
    safeAddListener('copy-title-btn', 'click', copyTemplateTitle);
    safeAddListener('copy-content-btn', 'click', copyTemplateContent);

    // ダッシュボードのカテゴリーフィルター
    safeAddListener('dashboard-category-filter', 'change', filterDashboardTemplates);

    // モーダル外クリックで閉じる
    const templateModal = document.getElementById('template-modal');
    if (templateModal) {
        templateModal.addEventListener('click', function(e) { if (e.target === this) closeModal(); });
    }
    const useTemplateModal = document.getElementById('use-template-modal');
    if (useTemplateModal) {
        useTemplateModal.addEventListener('click', function(e) { if (e.target === this) closeUseModal(); });
    }
}

// ============================================
// 認証機能
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    console.log('[LSCO Auth] handleLogin called');

    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    if (!emailInput || !passwordInput) {
        console.error('[LSCO Auth] Login inputs not found');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) {
        showNotification('メールアドレスとパスワードを入力してください', 'error');
        return;
    }

    const client = requireSupabaseClient();
    if (!client) return;

    const loginError = document.getElementById('login-error');
    if (loginError) loginError.style.display = 'none';

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data || !data.user) {
        console.error('[LSCO Auth] signIn error:', error);
        if (loginError) loginError.style.display = 'block';
        showNotification('ログインに失敗しました。認証情報を確認してください。', 'error');
        return;
    }

    currentUserId = data.user.id;
    const role = await fetchUserRole(data.user.id);
    if (!role) {
        showNotification('権限が見つかりません。管理者に連絡してください。', 'error');
        await client.auth.signOut();
        showLoginScreen();
        return;
    }

    currentUserRole = role;
    showAdminPanel();
    updateUIForRole(currentUserRole);
    showNotification(`${currentUserRole.description}としてログインしました`, 'success');
    console.log('[LSCO Auth] Login complete for:', currentUserRole.name);
}

async function handleLogout() {
    const client = requireSupabaseClient();
    if (client) {
        await client.auth.signOut();
    }
    currentUserRole = null;
    currentUserId = null;
    showLoginScreen();
    showNotification('ログアウトしました', 'info');
}

// 権限レベルに応じたUI更新
function updateUIForRole(role) {
    if (!role) {
        console.error('[LSCO Role] role is null/undefined');
        return;
    }
    console.log('[LSCO Role] Applying role:', role.name, 'level:', role.level);

    // 権限表示を更新
    const roleDisplay = document.getElementById('current-role-display');
    if (roleDisplay) {
        roleDisplay.textContent = `${role.description} (${role.name})`;
    }

    const config = getPermissionConfig();

    // ダッシュボードメニュー
    const dashboardMenu = document.querySelector('.nav-item[data-section="dashboard"]');
    if (dashboardMenu) {
        dashboardMenu.style.display = role.level >= config.dashboard ? 'block' : 'none';
    }

    // テンプレート管理メニュー
    const templatesMenu = document.querySelector('.nav-item[data-section="templates"]');
    if (templatesMenu) {
        templatesMenu.style.display = role.level >= config.templates ? 'block' : 'none';
    }

    // 集計メニュー（Admin以上）
    const calculatorMenu = document.querySelector('.nav-item[data-section="calculator"]');
    if (calculatorMenu) {
        calculatorMenu.style.display = role.level >= config.calculator ? 'block' : 'none';
    }

    // カレンダーメニュー（Operator以上）
    const calendarMenu = document.querySelector('.nav-item[data-section="calendar"]');
    if (calendarMenu) {
        calendarMenu.style.display = role.level >= config.calendar ? 'block' : 'none';
    }

    // 設定メニュー（Admin以上）
    const settingsMenu = document.querySelector('.nav-item[data-section="settings"]');
    if (settingsMenu) {
        settingsMenu.style.display = role.level >= config.settings ? 'block' : 'none';
    }

    // プロフィールメニュー
    const profileMenu = document.querySelector('.nav-item[data-section="profile"]');
    if (profileMenu) {
        profileMenu.style.display = role.level >= config.profile ? 'block' : 'none';
    }

    // 資産管理メニュー（Ownerのみ）
    const assetManagementMenu = document.getElementById('asset-management-menu');
    if (assetManagementMenu) {
        assetManagementMenu.style.display = role.level >= config.assetManagement ? 'block' : 'none';
    }

    // Owner限定: 権限設定メニューを表示
    const permissionSettingsMenu = document.getElementById('permission-settings-menu');
    if (permissionSettingsMenu) {
        permissionSettingsMenu.style.display = role.level >= USER_ROLES.OWNER.level ? 'block' : 'none';
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
    const emailInput = document.getElementById('admin-email');
    if (emailInput) emailInput.value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('login-error').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';

    // ダッシュボードを表示
    showSection('dashboard-main');

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
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn(`セクションが見つかりません: ${sectionName}-section`);
        // フォールバック: dashboard-main-section を表示
        const fallback = document.getElementById('dashboard-main-section');
        if (fallback) fallback.classList.add('active');
    }

    // ページタイトルを更新
    const titles = {
        'dashboard-main': 'メインダッシュボード',
        'dashboard-trade': 'トレード用ダッシュボード',
        'dashboard-work': '業務用ダッシュボード',
        'dashboard-analysis': '分析用ダッシュボード',
        templates: 'テンプレート管理',
        'calculator-dashboard': '集計ダッシュボード',
        'calculator-1': '集計 - 担当者1',
        'calculator-2': '集計 - 担当者2',
        'calculator-3': '集計 - 担当者3',
        'calculator-4': '集計 - 担当者4',
        'calculator-5': '集計 - 担当者5',
        'calculator-settings': '集計設定',
        calendar: 'カレンダー',
        settings: '設定',
        'asset-portfolio': 'ポートフォリオ',
        'asset-watchlist': 'ウォッチリスト',
        'asset-candidates': '候補銘柄',
        'profile': 'プロフィール',
        'permission-settings': '権限設定'
    };

    // 資産管理ページの初期化
    if (sectionName.startsWith('asset-')) {
        initAssetManagementPage(sectionName);
    }

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

    // 権限設定ページの初期化
    if (sectionName === 'permission-settings') {
        loadPermissionSettings();
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

// ============================================
// 資産管理機能（Owner限定）
// ============================================

let portfolioChart = null;
let distributionChart = null;

// 資産管理ページの初期化
function initAssetManagementPage(sectionName) {
    if (sectionName === 'asset-portfolio') {
        loadPortfolio();
        initPortfolioCharts();
    } else if (sectionName === 'asset-watchlist') {
        loadWatchlist();
    } else if (sectionName === 'asset-candidates') {
        loadCandidates();
        loadInvestmentNotes();
    }
}

// ============================================
// ポートフォリオ機能
// ============================================

function getPortfolio() {
    const data = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    return data ? JSON.parse(data) : [];
}

function savePortfolio(portfolio) {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
}

function loadPortfolio() {
    const portfolio = getPortfolio();
    renderPortfolioTable(portfolio);
    updatePortfolioSummary(portfolio);
    updateDistributionChart(portfolio);
}

function renderPortfolioTable(portfolio) {
    const tbody = document.getElementById('portfolio-table-body');
    const emptyState = document.getElementById('empty-portfolio');

    if (!tbody) return;

    if (portfolio.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = portfolio.map(asset => {
        const currentPrice = asset.currentPrice || asset.avgPrice;
        const marketValue = asset.quantity * currentPrice;
        const totalCost = asset.quantity * asset.avgPrice;
        const profit = marketValue - totalCost;
        const profitRate = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(2) : 0;
        const isPositive = profit >= 0;
        const bgColor = getAssetColor(asset.type);

        return `
            <tr>
                <td>
                    <div class="stock-name">
                        <div class="stock-icon" style="background: ${bgColor};">
                            ${asset.symbol.substring(0, 2).toUpperCase()}
                        </div>
                        <div class="stock-name-text">
                            <span class="symbol">${escapeHtml(asset.symbol)}</span>
                            <span class="name">${escapeHtml(asset.name)}</span>
                        </div>
                    </div>
                </td>
                <td>${formatNumber(asset.quantity)}</td>
                <td>¥${formatNumber(asset.avgPrice)}</td>
                <td>¥${formatNumber(currentPrice)}</td>
                <td>¥${formatNumber(marketValue)}</td>
                <td class="stock-change ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}¥${formatNumber(profit)}
                </td>
                <td class="stock-change ${isPositive ? 'positive' : 'negative'}">
                    <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                    ${isPositive ? '+' : ''}${profitRate}%
                </td>
                <td>
                    <div class="stock-actions">
                        <button class="stock-action-btn buy" onclick="openEditAssetModal('${asset.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="stock-action-btn remove" onclick="deleteAsset('${asset.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updatePortfolioSummary(portfolio) {
    let totalAssets = 0;
    let totalInvestment = 0;

    portfolio.forEach(asset => {
        const currentPrice = asset.currentPrice || asset.avgPrice;
        totalAssets += asset.quantity * currentPrice;
        totalInvestment += asset.quantity * asset.avgPrice;
    });

    const totalProfit = totalAssets - totalInvestment;
    const profitRate = totalInvestment > 0 ? ((totalProfit / totalInvestment) * 100).toFixed(2) : 0;
    const isPositive = totalProfit >= 0;

    const totalAssetsEl = document.getElementById('total-assets');
    const totalInvestmentEl = document.getElementById('total-investment');
    const totalProfitEl = document.getElementById('total-profit');
    const profitRateEl = document.getElementById('profit-rate');

    if (totalAssetsEl) totalAssetsEl.textContent = `¥${formatNumber(totalAssets)}`;
    if (totalInvestmentEl) totalInvestmentEl.textContent = `¥${formatNumber(totalInvestment)}`;
    if (totalProfitEl) totalProfitEl.textContent = `${isPositive ? '+' : ''}¥${formatNumber(totalProfit)}`;

    if (profitRateEl) {
        profitRateEl.className = `asset-card-change ${isPositive ? 'positive' : 'negative'}`;
        profitRateEl.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            <span>${isPositive ? '+' : ''}${profitRate}%</span>
            <span class="text-muted">損益率</span>
        `;
    }
}

function initPortfolioCharts() {
    initPortfolioLineChart();
    const portfolio = getPortfolio();
    updateDistributionChart(portfolio);
}

function initPortfolioLineChart() {
    const ctx = document.getElementById('portfolio-chart');
    if (!ctx) return;

    if (portfolioChart) {
        portfolioChart.destroy();
    }

    // サンプルデータ（実際のアプリでは過去のデータを使用）
    const labels = generateDateLabels(30);
    const portfolio = getPortfolio();
    const currentValue = portfolio.reduce((sum, asset) => {
        return sum + (asset.quantity * (asset.currentPrice || asset.avgPrice));
    }, 0);

    // シミュレートされた過去データ
    const data = generateHistoricalData(currentValue, 30);

    portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '資産総額',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#6366f1',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `¥${formatNumber(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        maxTicksLimit: 6
                    }
                },
                y: {
                    grid: {
                        color: '#1e293b'
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function(value) {
                            return '¥' + formatNumber(value);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function updateDistributionChart(portfolio) {
    const ctx = document.getElementById('distribution-chart');
    if (!ctx) return;

    if (distributionChart) {
        distributionChart.destroy();
    }

    // 資産タイプ別に集計
    const distribution = {};
    portfolio.forEach(asset => {
        const type = asset.type || 'other';
        const value = asset.quantity * (asset.currentPrice || asset.avgPrice);
        distribution[type] = (distribution[type] || 0) + value;
    });

    const typeLabels = {
        stock: '株式',
        crypto: '仮想通貨',
        fund: '投資信託',
        bond: '債券',
        other: 'その他'
    };

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];
    const labels = Object.keys(distribution).map(key => typeLabels[key] || key);
    const data = Object.values(distribution);
    const total = data.reduce((sum, val) => sum + val, 0);

    // 凡例を更新
    const legendEl = document.getElementById('distribution-legend');
    if (legendEl) {
        legendEl.innerHTML = Object.keys(distribution).map((key, index) => {
            const percentage = total > 0 ? ((distribution[key] / total) * 100).toFixed(1) : 0;
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background: ${colors[index]}"></div>
                    <span class="legend-label">${typeLabels[key] || key}</span>
                    <span class="legend-value">${percentage}%</span>
                </div>
            `;
        }).join('');
    }

    if (data.length === 0) return;

    distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#94a3b8',
                    callbacks: {
                        label: function(context) {
                            return `¥${formatNumber(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

function openAddAssetModal() {
    document.getElementById('asset-modal-title').innerHTML = '<i class="fas fa-plus"></i> 銘柄追加';
    document.getElementById('asset-form').reset();
    document.getElementById('asset-id').value = '';
    document.getElementById('asset-purchase-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('asset-modal').classList.add('active');
}

function openEditAssetModal(id) {
    const portfolio = getPortfolio();
    const asset = portfolio.find(a => a.id === id);

    if (!asset) {
        showNotification('銘柄が見つかりません', 'error');
        return;
    }

    document.getElementById('asset-modal-title').innerHTML = '<i class="fas fa-edit"></i> 銘柄編集';
    document.getElementById('asset-id').value = asset.id;
    document.getElementById('asset-symbol').value = asset.symbol;
    document.getElementById('asset-name').value = asset.name;
    document.getElementById('asset-type').value = asset.type || 'stock';
    document.getElementById('asset-market').value = asset.market || 'tse';
    document.getElementById('asset-quantity').value = asset.quantity;
    document.getElementById('asset-avg-price').value = asset.avgPrice;
    document.getElementById('asset-current-price').value = asset.currentPrice || '';
    document.getElementById('asset-purchase-date').value = asset.purchaseDate || '';
    document.getElementById('asset-memo').value = asset.memo || '';

    document.getElementById('asset-modal').classList.add('active');
}

function closeAssetModal() {
    document.getElementById('asset-modal').classList.remove('active');
}

function deleteAsset(id) {
    if (!confirm('この銘柄を削除しますか？')) return;

    let portfolio = getPortfolio();
    portfolio = portfolio.filter(a => a.id !== id);
    savePortfolio(portfolio);
    loadPortfolio();
    showNotification('銘柄を削除しました', 'success');
}

function refreshPortfolio() {
    loadPortfolio();
    initPortfolioCharts();
    showNotification('ポートフォリオを更新しました', 'info');
}

// ============================================
// ウォッチリスト機能
// ============================================

function getWatchlist() {
    const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    return data ? JSON.parse(data) : [];
}

function saveWatchlistData(watchlist) {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
}

function loadWatchlist() {
    const watchlist = getWatchlist();
    renderWatchlistTable(watchlist);
}

function renderWatchlistTable(watchlist) {
    const tbody = document.getElementById('watchlist-table-body');
    const emptyState = document.getElementById('empty-watchlist');

    if (!tbody) return;

    if (watchlist.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = watchlist.map(item => {
        const bgColor = getAssetColor(item.type);
        const change = item.change || 0;
        const isPositive = change >= 0;

        return `
            <tr>
                <td>
                    <div class="stock-name">
                        <div class="stock-icon" style="background: ${bgColor};">
                            ${item.symbol.substring(0, 2).toUpperCase()}
                        </div>
                        <div class="stock-name-text">
                            <span class="symbol">${escapeHtml(item.symbol)}</span>
                            <span class="name">${escapeHtml(item.name)}</span>
                        </div>
                    </div>
                </td>
                <td>¥${formatNumber(item.currentPrice || 0)}</td>
                <td class="stock-change ${isPositive ? 'positive' : 'negative'}">
                    <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                    ${isPositive ? '+' : ''}${change}%
                </td>
                <td>¥${formatNumber(item.high52 || '-')}</td>
                <td>¥${formatNumber(item.low52 || '-')}</td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(item.memo || '-')}
                </td>
                <td>
                    <div class="stock-actions">
                        <button class="stock-action-btn buy" onclick="addWatchlistToPortfolio('${item.id}')" title="ポートフォリオに追加">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="stock-action-btn remove" onclick="deleteWatchlistItem('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddWatchlistModal() {
    document.getElementById('watchlist-form').reset();
    document.getElementById('watchlist-id').value = '';
    document.getElementById('watchlist-modal').classList.add('active');
}

function closeWatchlistModal() {
    document.getElementById('watchlist-modal').classList.remove('active');
}

function deleteWatchlistItem(id) {
    if (!confirm('この銘柄をウォッチリストから削除しますか？')) return;

    let watchlist = getWatchlist();
    watchlist = watchlist.filter(w => w.id !== id);
    saveWatchlistData(watchlist);
    loadWatchlist();
    showNotification('ウォッチリストから削除しました', 'success');
}

function addWatchlistToPortfolio(id) {
    const watchlist = getWatchlist();
    const item = watchlist.find(w => w.id === id);

    if (!item) return;

    // ポートフォリオ追加モーダルを開き、情報をプリフィル
    document.getElementById('asset-modal-title').innerHTML = '<i class="fas fa-plus"></i> 銘柄追加';
    document.getElementById('asset-form').reset();
    document.getElementById('asset-id').value = '';
    document.getElementById('asset-symbol').value = item.symbol;
    document.getElementById('asset-name').value = item.name;
    document.getElementById('asset-type').value = item.type || 'stock';
    document.getElementById('asset-current-price').value = item.currentPrice || '';
    document.getElementById('asset-purchase-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('asset-modal').classList.add('active');
}

// ============================================
// 候補銘柄機能
// ============================================

function getCandidates() {
    const data = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
    return data ? JSON.parse(data) : [];
}

function saveCandidates(candidates) {
    localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
}

function loadCandidates() {
    const candidates = getCandidates();
    renderCandidatesTable(candidates);
}

function renderCandidatesTable(candidates) {
    const tbody = document.getElementById('candidates-table-body');
    const emptyState = document.getElementById('empty-candidates');

    if (!tbody) return;

    if (candidates.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const categoryLabels = {
        growth: '成長株',
        value: 'バリュー株',
        dividend: '高配当株',
        tech: 'テクノロジー',
        healthcare: 'ヘルスケア',
        finance: '金融',
        other: 'その他'
    };

    const priorityLabels = {
        high: { text: '高', class: 'danger' },
        medium: { text: '中', class: 'warning' },
        low: { text: '低', class: 'info' }
    };

    tbody.innerHTML = candidates.map(candidate => {
        const priority = priorityLabels[candidate.priority] || priorityLabels.medium;
        const category = categoryLabels[candidate.category] || candidate.category;

        return `
            <tr>
                <td>
                    <div class="stock-name">
                        <div class="stock-icon" style="background: var(--accent-primary);">
                            ${candidate.symbol.substring(0, 2).toUpperCase()}
                        </div>
                        <div class="stock-name-text">
                            <span class="symbol">${escapeHtml(candidate.symbol)}</span>
                            <span class="name">${escapeHtml(candidate.name)}</span>
                        </div>
                    </div>
                </td>
                <td><span class="tag">${category}</span></td>
                <td><span class="tag" style="background: rgba(var(--${priority.class}-rgb, 239, 68, 68), 0.15); color: var(--${priority.class});">${priority.text}</span></td>
                <td>¥${formatNumber(candidate.targetPrice || '-')}</td>
                <td>¥${formatNumber(candidate.currentPrice || '-')}</td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(candidate.memo || '-')}
                </td>
                <td>${candidate.addedAt ? formatDate(new Date(candidate.addedAt)) : '-'}</td>
                <td>
                    <div class="stock-actions">
                        <button class="stock-action-btn buy" onclick="addCandidateToPortfolio('${candidate.id}')" title="ポートフォリオに追加">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="stock-action-btn watch" onclick="addCandidateToWatchlist('${candidate.id}')" title="ウォッチリストに追加">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="stock-action-btn remove" onclick="deleteCandidate('${candidate.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddCandidateModal() {
    document.getElementById('candidate-form').reset();
    document.getElementById('candidate-id').value = '';
    document.getElementById('candidate-modal').classList.add('active');
}

function closeCandidateModal() {
    document.getElementById('candidate-modal').classList.remove('active');
}

function deleteCandidate(id) {
    if (!confirm('この候補銘柄を削除しますか？')) return;

    let candidates = getCandidates();
    candidates = candidates.filter(c => c.id !== id);
    saveCandidates(candidates);
    loadCandidates();
    showNotification('候補銘柄を削除しました', 'success');
}

function addCandidateToPortfolio(id) {
    const candidates = getCandidates();
    const candidate = candidates.find(c => c.id === id);

    if (!candidate) return;

    document.getElementById('asset-modal-title').innerHTML = '<i class="fas fa-plus"></i> 銘柄追加';
    document.getElementById('asset-form').reset();
    document.getElementById('asset-id').value = '';
    document.getElementById('asset-symbol').value = candidate.symbol;
    document.getElementById('asset-name').value = candidate.name;
    document.getElementById('asset-current-price').value = candidate.currentPrice || '';
    document.getElementById('asset-purchase-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('asset-modal').classList.add('active');
}

function addCandidateToWatchlist(id) {
    const candidates = getCandidates();
    const candidate = candidates.find(c => c.id === id);

    if (!candidate) return;

    const watchlist = getWatchlist();

    // すでにウォッチリストにあるか確認
    if (watchlist.some(w => w.symbol === candidate.symbol)) {
        showNotification('この銘柄はすでにウォッチリストにあります', 'info');
        return;
    }

    watchlist.push({
        id: generateId(),
        symbol: candidate.symbol,
        name: candidate.name,
        type: 'stock',
        currentPrice: candidate.currentPrice,
        targetPrice: candidate.targetPrice,
        memo: candidate.memo,
        addedAt: new Date().toISOString()
    });

    saveWatchlistData(watchlist);
    showNotification('ウォッチリストに追加しました', 'success');
}

// 投資メモ
function loadInvestmentNotes() {
    const notes = localStorage.getItem(STORAGE_KEYS.INVESTMENT_NOTES) || '';
    const notesEl = document.getElementById('investment-notes');
    if (notesEl) {
        notesEl.value = notes;
    }
}

function saveInvestmentNotes() {
    const notesEl = document.getElementById('investment-notes');
    if (notesEl) {
        localStorage.setItem(STORAGE_KEYS.INVESTMENT_NOTES, notesEl.value);
        showNotification('メモを保存しました', 'success');
    }
}

// ============================================
// ユーティリティ関数（資産管理用）
// ============================================

function getAssetColor(type) {
    const colors = {
        stock: '#6366f1',
        crypto: '#f59e0b',
        fund: '#10b981',
        bond: '#3b82f6',
        other: '#64748b'
    };
    return colors[type] || colors.other;
}

function formatNumber(num) {
    if (num === null || num === undefined || num === '-') return '-';
    return Number(num).toLocaleString();
}

function generateDateLabels(days) {
    const labels = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
    }
    return labels;
}

function generateHistoricalData(currentValue, days) {
    const data = [];
    let value = currentValue * 0.9; // 開始値は現在値の90%
    const dailyChange = (currentValue - value) / days;

    for (let i = 0; i < days; i++) {
        // ランダムな変動を加える
        const randomFactor = 1 + (Math.random() - 0.5) * 0.02;
        value = value * randomFactor + dailyChange;
        data.push(Math.round(value));
    }

    // 最後の値を現在値に調整
    data[data.length - 1] = currentValue;

    return data;
}

// ============================================
// フォームイベントリスナー（資産管理用）
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 資産フォーム
    const assetForm = document.getElementById('asset-form');
    if (assetForm) {
        assetForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const id = document.getElementById('asset-id').value;
            const assetData = {
                id: id || generateId(),
                symbol: document.getElementById('asset-symbol').value.trim(),
                name: document.getElementById('asset-name').value.trim(),
                type: document.getElementById('asset-type').value,
                market: document.getElementById('asset-market').value,
                quantity: parseFloat(document.getElementById('asset-quantity').value),
                avgPrice: parseFloat(document.getElementById('asset-avg-price').value),
                currentPrice: parseFloat(document.getElementById('asset-current-price').value) || null,
                purchaseDate: document.getElementById('asset-purchase-date').value,
                memo: document.getElementById('asset-memo').value.trim(),
                updatedAt: new Date().toISOString()
            };

            let portfolio = getPortfolio();

            if (id) {
                // 編集
                const index = portfolio.findIndex(a => a.id === id);
                if (index !== -1) {
                    portfolio[index] = { ...portfolio[index], ...assetData };
                }
                showNotification('銘柄を更新しました', 'success');
            } else {
                // 新規追加
                assetData.addedAt = new Date().toISOString();
                portfolio.push(assetData);
                showNotification('銘柄を追加しました', 'success');
            }

            savePortfolio(portfolio);
            closeAssetModal();
            loadPortfolio();
            initPortfolioCharts();
        });
    }

    // ウォッチリストフォーム
    const watchlistForm = document.getElementById('watchlist-form');
    if (watchlistForm) {
        watchlistForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const watchlistData = {
                id: generateId(),
                symbol: document.getElementById('watchlist-symbol').value.trim(),
                name: document.getElementById('watchlist-name').value.trim(),
                type: document.getElementById('watchlist-type').value,
                targetPrice: parseFloat(document.getElementById('watchlist-target-price').value) || null,
                memo: document.getElementById('watchlist-memo').value.trim(),
                addedAt: new Date().toISOString()
            };

            let watchlist = getWatchlist();
            watchlist.push(watchlistData);
            saveWatchlistData(watchlist);

            closeWatchlistModal();
            loadWatchlist();
            showNotification('ウォッチリストに追加しました', 'success');
        });
    }

    // 候補銘柄フォーム
    const candidateForm = document.getElementById('candidate-form');
    if (candidateForm) {
        candidateForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const candidateData = {
                id: generateId(),
                symbol: document.getElementById('candidate-symbol').value.trim(),
                name: document.getElementById('candidate-name').value.trim(),
                category: document.getElementById('candidate-category-select').value,
                priority: document.getElementById('candidate-priority-select').value,
                targetPrice: parseFloat(document.getElementById('candidate-target').value) || null,
                currentPrice: parseFloat(document.getElementById('candidate-current').value) || null,
                memo: document.getElementById('candidate-memo').value.trim(),
                addedAt: new Date().toISOString()
            };

            let candidates = getCandidates();
            candidates.push(candidateData);
            saveCandidates(candidates);

            closeCandidateModal();
            loadCandidates();
            showNotification('候補銘柄を追加しました', 'success');
        });
    }

    // 候補銘柄の検索・フィルター
    const candidateSearch = document.getElementById('candidate-search');
    const candidateCategoryFilter = document.getElementById('candidate-category');
    const candidatePriorityFilter = document.getElementById('candidate-priority');

    if (candidateSearch) {
        candidateSearch.addEventListener('input', filterCandidates);
    }
    if (candidateCategoryFilter) {
        candidateCategoryFilter.addEventListener('change', filterCandidates);
    }
    if (candidatePriorityFilter) {
        candidatePriorityFilter.addEventListener('change', filterCandidates);
    }
});

function filterCandidates() {
    const searchTerm = (document.getElementById('candidate-search')?.value || '').toLowerCase();
    const categoryFilter = document.getElementById('candidate-category')?.value || '';
    const priorityFilter = document.getElementById('candidate-priority')?.value || '';

    let candidates = getCandidates();

    if (searchTerm) {
        candidates = candidates.filter(c =>
            c.symbol.toLowerCase().includes(searchTerm) ||
            c.name.toLowerCase().includes(searchTerm)
        );
    }

    if (categoryFilter) {
        candidates = candidates.filter(c => c.category === categoryFilter);
    }

    if (priorityFilter) {
        candidates = candidates.filter(c => c.priority === priorityFilter);
    }

    renderCandidatesTable(candidates);
}

// グローバル関数として公開（資産管理用）
window.openAddAssetModal = openAddAssetModal;
window.openEditAssetModal = openEditAssetModal;
window.closeAssetModal = closeAssetModal;
window.deleteAsset = deleteAsset;
window.refreshPortfolio = refreshPortfolio;
window.openAddWatchlistModal = openAddWatchlistModal;
window.closeWatchlistModal = closeWatchlistModal;
window.deleteWatchlistItem = deleteWatchlistItem;
window.addWatchlistToPortfolio = addWatchlistToPortfolio;
window.openAddCandidateModal = openAddCandidateModal;
window.closeCandidateModal = closeCandidateModal;
window.deleteCandidate = deleteCandidate;
window.addCandidateToPortfolio = addCandidateToPortfolio;
window.addCandidateToWatchlist = addCandidateToWatchlist;
window.saveInvestmentNotes = saveInvestmentNotes;
window.openAddAlertModal = function() { showNotification('アラート機能は開発中です', 'info'); };
