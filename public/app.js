import { 
    db, 
    auth, 
    storage, 
    provider, 
    ADMIN_EMAILS,
    SUPER_ADMIN_EMAIL,
    ADMIN_PERMISSIONS,
    isAdmin,
    isSuperAdmin,
    hasPermission,
    canDeleteNews,
    canEditNews,
    canAddNews,
    sanitizeInput,
    validateNewsData,
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    orderBy, 
    query, 
    Timestamp,
    where,
    limit,
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from './firebase-config.js';

// Global state
let currentUser = null;
let currentEditingNews = null;
let currentPage = 'home';

// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');
const authSection = document.getElementById('authSection');
const addNewsBtn = document.getElementById('addNewsBtn');
const newsGrid = document.getElementById('newsGrid');
const newsModal = document.getElementById('newsModal');
const newsForm = document.getElementById('newsForm');
const modalTitle = document.getElementById('modalTitle');
const newsTitle = document.getElementById('newsTitle');
const newsDescription = document.getElementById('newsDescription');
const newsImage = document.getElementById('newsImage');
const modalClose = document.getElementById('modalClose');
const loadingDiv = document.getElementById('loading');
const mainContent = document.getElementById('mainContent');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadNews();
    
    // Monitor auth state
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateUI();
        updateSidebar();
    });
});

function setupEventListeners() {
    // Menu toggle
    menuToggle?.addEventListener('click', toggleSidebar);
    sidebarClose?.addEventListener('click', closeSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);
    
    // News modal
    addNewsBtn?.addEventListener('click', openAddNewsModal);
    modalClose?.addEventListener('click', closeNewsModal);
    newsForm?.addEventListener('submit', handleNewsSubmit);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === newsModal) {
            closeNewsModal();
        }
    });
    
    // Navigation
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-link')) {
            e.preventDefault();
            const page = e.target.dataset.page;
            if (page) {
                navigateToPage(page);
                closeSidebar();
            }
        }
        
        if (e.target.classList.contains('auth-btn')) {
            e.preventDefault();
            const action = e.target.dataset.action;
            if (action === 'login') {
                signInWithGoogle();
            } else if (action === 'logout') {
                signOutUser();
            }
        }
    });
    
    // Escape key to close modals/sidebar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeNewsModal();
            closeSidebar();
        }
    });
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

async function signInWithGoogle() {
    try {
        showToast('جاري تسجيل الدخول...', 'info');
        const result = await signInWithPopup(auth, provider);
        showToast('تم تسجيل الدخول بنجاح', 'success');
        console.log('تم تسجيل الدخول بنجاح:', result.user.email);
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showToast('حدث خطأ في تسجيل الدخول. حاول مرة أخرى.', 'error');
    }
}

async function signOutUser() {
    try {
        await signOut(auth);
        showToast('تم تسجيل الخروج بنجاح', 'success');
        navigateToPage('home');
        console.log('تم تسجيل الخروج بنجاح');
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
        showToast('حدث خطأ في تسجيل الخروج', 'error');
    }
}

function updateUI() {
    // Update header auth section
    if (currentUser) {
        authSection.innerHTML = `
            <div class="user-info">
                <img src="${currentUser.photoURL || '/default-avatar.png'}" alt="صورة المستخدم" class="user-avatar-small" style="width: 32px; height: 32px; border-radius: 50%; margin-left: 0.5rem;">
                <span class="user-name" style="font-weight: 500; color: var(--gray-700);">${currentUser.displayName || 'مستخدم'}</span>
            </div>
        `;
        
        // Show admin features based on permissions
        if (canAddNews(currentUser)) {
            addNewsBtn?.classList.remove('hidden');
        } else {
            addNewsBtn?.classList.add('hidden');
        }
    } else {
        authSection.innerHTML = `
            <button class="btn btn-primary auth-btn" data-action="login">
                <span>📱</span>
                تسجيل الدخول
            </button>
        `;
        addNewsBtn?.classList.add('hidden');
    }
}

function updateSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (!sidebarContent) return;
    
    if (currentUser) {
        sidebarContent.innerHTML = `
            <div class="user-profile">
                <img src="${currentUser.photoURL || '/default-avatar.png'}" alt="صورة المستخدم" class="user-avatar-large">
                <div class="user-name-large">${currentUser.displayName || 'مستخدم'}</div>
                <div class="user-email">${currentUser.email}</div>
            </div>
            
            <ul class="sidebar-nav">
                <li>
                    <a href="#" class="nav-link ${currentPage === 'home' ? 'active' : ''}" data-page="home">
                        <span>🏠</span>
                        الصفحة الرئيسية
                    </a>
                </li>
                <li>
                    <a href="#" class="nav-link ${currentPage === 'profile' ? 'active' : ''}" data-page="profile">
                        <span>👤</span>
                        حسابي
                    </a>
                </li>
                ${isAdmin(currentUser) ? `
                <li>
                    <a href="#" class="nav-link ${currentPage === 'admin' ? 'active' : ''}" data-page="admin">
                        <span>⚙️</span>
                        لوحة الإدارة
                    </a>
                </li>
                ` : ''}
                ${isSuperAdmin(currentUser) ? `
                <li>
                    <a href="#" class="nav-link ${currentPage === 'permissions' ? 'active' : ''}" data-page="permissions">
                        <span>🔐</span>
                        إدارة الصلاحيات
                    </a>
                </li>
                ` : ''}
                <li>
                    <button class="auth-btn" data-action="logout">
                        <span>🚪</span>
                        تسجيل الخروج
                    </button>
                </li>
            </ul>
        `;
    } else {
        sidebarContent.innerHTML = `
            <div class="user-profile">
                <div class="user-avatar-large" style="background: var(--gray-200); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: var(--gray-500);">👤</div>
                <div class="user-name-large">زائر</div>
                <div class="user-email">يرجى تسجيل الدخول</div>
            </div>
            
            <ul class="sidebar-nav">
                <li>
                    <a href="#" class="nav-link ${currentPage === 'home' ? 'active' : ''}" data-page="home">
                        <span>🏠</span>
                        الصفحة الرئيسية
                    </a>
                </li>
                <li>
                    <button class="auth-btn" data-action="login">
                        <span>📱</span>
                        تسجيل الدخول
                    </button>
                </li>
            </ul>
        `;
    }
}

function navigateToPage(page) {
    currentPage = page;
    updateSidebar();
    
    switch (page) {
        case 'home':
            showHomePage();
            break;
        case 'profile':
            showProfilePage();
            break;
        case 'admin':
            if (isAdmin(currentUser)) {
                showAdminPage();
            } else {
                showToast('غير مصرح لك بالوصول لهذه الصفحة', 'error');
                navigateToPage('home');
            }
            break;
        case 'permissions':
            if (isSuperAdmin(currentUser)) {
                showPermissionsPage();
            } else {
                showToast('غير مصرح لك بالوصول لهذه الصفحة', 'error');
                navigateToPage('home');
            }
            break;
        default:
            showHomePage();
    }
}

function showHomePage() {
    mainContent.innerHTML = `
        <!-- Welcome Section -->
        <section class="welcome-section">
            <h2 class="welcome-title">أهلاً وسهلاً بكم في بلدروز</h2>
            <p class="welcome-description">
                قضاء بلدروز هو أحد أقضية محافظة ديالى في العراق، يتميز بتاريخه العريق وموقعه الاستراتيجي. 
                هذا الموقع مخصص لخدمة أبناء القضاء ونقل آخر الأخبار والمعلومات المحلية.
            </p>
        </section>

        <!-- News Section -->
        <section class="news-section">
            <div class="section-header">
                <h2 class="section-title">
                    <span>📰</span>
                    الأخبار المحلية
                </h2>
                ${canAddNews(currentUser) ? `
                <button class="btn btn-success" id="addNewsBtn">
                    <span>➕</span>
                    إضافة خبر جديد
                </button>
                ` : ''}
            </div>

            <!-- Loading -->
            <div class="loading hidden" id="loading">
                <div class="spinner"></div>
                <p>جاري تحميل الأخبار...</p>
            </div>

            <!-- News Grid -->
            <div class="news-grid" id="newsGrid">
                <!-- News items will be loaded here dynamically -->
            </div>
        </section>

        <!-- Future Sections -->
        <section class="future-sections">
            <h3 class="future-title">أقسام قادمة قريباً</h3>
            <div class="future-grid">
                <div class="future-item">
                    <div class="future-icon">🛒</div>
                    <div class="future-label">السوق المحلي</div>
                </div>
                <div class="future-item">
                    <div class="future-icon">⚡</div>
                    <div class="future-label">جدول الكهرباء</div>
                </div>
                <div class="future-item">
                    <div class="future-icon">📸</div>
                    <div class="future-label">معرض الصور</div>
                </div>
                <div class="future-item">
                    <div class="future-icon">📞</div>
                    <div class="future-label">أرقام مهمة</div>
                </div>
            </div>
        </section>
    `;
    
    // Re-setup event listeners for new elements
    const newAddNewsBtn = document.getElementById('addNewsBtn');
    newAddNewsBtn?.addEventListener('click', openAddNewsModal);
    
    loadNews();
}

function showProfilePage() {
    if (!currentUser) {
        showToast('يرجى تسجيل الدخول أولاً', 'warning');
        navigateToPage('home');
        return;
    }
    
    mainContent.innerHTML = `
        <div class="profile-container">
            <div class="page-header">
                <h1 class="page-title">الملف الشخصي</h1>
                <p class="page-description">معلومات حسابك الشخصي</p>
            </div>
            
            <div class="profile-card">
                <div class="profile-header">
                    <img src="${currentUser.photoURL || '/default-avatar.png'}" alt="صورة المستخدم" class="profile-avatar">
                    <h2>${currentUser.displayName || 'مستخدم'}</h2>
                    <p>عضو في موقع بلدروز</p>
                </div>
                
                <div class="profile-info">
                    <div class="info-row">
                        <span class="info-label">الاسم:</span>
                        <span class="info-value">${currentUser.displayName || 'غير محدد'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">البريد الإلكتروني:</span>
                        <span class="info-value">${currentUser.email}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">تاريخ التسجيل:</span>
                        <span class="info-value">${currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('ar-EG') : 'غير متوفر'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">آخر تسجيل دخول:</span>
                        <span class="info-value">${currentUser.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString('ar-EG') : 'غير متوفر'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">نوع الحساب:</span>
                        <span class="info-value ${isAdmin(currentUser) ? 'text-primary' : ''}">${isAdmin(currentUser) ? 'مشرف 👑' : 'عضو عادي'}</span>
                    </div>
                </div>
            </div>
            
            ${isAdmin(currentUser) ? `
            <div class="profile-card">
                <div class="profile-info">
                    <h3 style="margin-bottom: 1rem; color: var(--primary-color);">صلاحيات المشرف</h3>
                    <div class="info-row">
                        <span class="info-label">إدارة الأخبار:</span>
                        <span class="info-value">✅ مفعل</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">إضافة المحتوى:</span>
                        <span class="info-value">✅ مفعل</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">حذف المحتوى:</span>
                        <span class="info-value">✅ مفعل</span>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

function showAdminPage() {
    if (!isAdmin(currentUser)) {
        showToast('غير مصرح لك بالوصول لهذه الصفحة', 'error');
        navigateToPage('home');
        return;
    }
    
    mainContent.innerHTML = `
        <div class="profile-container">
            <div class="page-header">
                <h1 class="page-title">لوحة الإدارة</h1>
                <p class="page-description">إدارة محتوى الموقع</p>
            </div>
            
            <div class="profile-card">
                <div class="profile-info">
                    <h3 style="margin-bottom: 1rem; color: var(--primary-color);">إحصائيات سريعة</h3>
                    <div class="info-row">
                        <span class="info-label">إجمالي الأخبار:</span>
                        <span class="info-value" id="totalNews">جاري التحميل...</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">آخر خبر:</span>
                        <span class="info-value" id="lastNews">جاري التحميل...</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-card">
                <div class="profile-info">
                    <h3 style="margin-bottom: 1rem; color: var(--primary-color);">إجراءات سريعة</h3>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem;">
                        <button class="btn btn-success" onclick="openAddNewsModal()">
                            <span>➕</span>
                            إضافة خبر جديد
                        </button>
                        <button class="btn btn-primary" onclick="navigateToPage('home')">
                            <span>📰</span>
                            عرض الأخبار
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadAdminStats();
}

function showPermissionsPage() {
    if (!isSuperAdmin(currentUser)) {
        showToast('غير مصرح لك بالوصول لهذه الصفحة', 'error');
        navigateToPage('home');
        return;
    }
    
    mainContent.innerHTML = `
        <div class="profile-container">
            <div class="page-header">
                <h1 class="page-title">إدارة الصلاحيات</h1>
                <p class="page-description">إدارة صلاحيات المشرفين والمستخدمين</p>
            </div>
            
            <div class="profile-card">
                <div class="profile-info">
                    <h3 style="margin-bottom: 1.5rem; color: var(--primary-color); display: flex; align-items: center; gap: 0.5rem;">
                        <span>🔐</span>
                        قواعد الصلاحيات الحالية
                    </h3>
                    
                    <div class="permissions-grid">
                        ${Object.entries(ADMIN_PERMISSIONS).map(([email, perms]) => `
                            <div class="permission-card">
                                <div class="permission-header">
                                    <div class="admin-info">
                                        <span class="admin-email">${email}</span>
                                        <span class="admin-level ${perms.level}">${perms.level === 'super_admin' ? 'مشرف عام' : 'مشرف'}</span>
                                    </div>
                                </div>
                                <div class="permissions-list">
                                    ${perms.permissions.map(perm => `
                                        <div class="permission-item">
                                            <span class="permission-icon">${getPermissionIcon(perm)}</span>
                                            <span class="permission-name">${getPermissionName(perm)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="profile-card">
                <div class="profile-info">
                    <h3 style="margin-bottom: 1.5rem; color: var(--primary-color); display: flex; align-items: center; gap: 0.5rem;">
                        <span>📊</span>
                        إحصائيات الصلاحيات
                    </h3>
                    
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number">${Object.keys(ADMIN_PERMISSIONS).length}</div>
                            <div class="stat-label">إجمالي المشرفين</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${Object.values(ADMIN_PERMISSIONS).filter(p => p.level === 'super_admin').length}</div>
                            <div class="stat-label">مشرفين عامين</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${Object.values(ADMIN_PERMISSIONS).filter(p => p.permissions.includes('delete_news')).length}</div>
                            <div class="stat-label">مخول لهم الحذف</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="profile-card">
                <div class="profile-info">
                    <h3 style="margin-bottom: 1.5rem; color: var(--warning-color); display: flex; align-items: center; gap: 0.5rem;">
                        <span>⚠️</span>
                        تحذيرات أمنية
                    </h3>
                    
                    <div class="security-warnings">
                        <div class="warning-item">
                            <span class="warning-icon">🔒</span>
                            <div class="warning-content">
                                <div class="warning-title">صلاحية الحذف محدودة</div>
                                <div class="warning-text">فقط المشرفين المخولين يمكنهم حذف الأخبار</div>
                            </div>
                        </div>
                        <div class="warning-item">
                            <span class="warning-icon">👥</span>
                            <div class="warning-content">
                                <div class="warning-title">نظام متعدد المستويات</div>
                                <div class="warning-text">المشرف العام له صلاحيات إضافية لإدارة النظام</div>
                            </div>
                        </div>
                        <div class="warning-item">
                            <span class="warning-icon">📝</span>
                            <div class="warning-content">
                                <div class="warning-title">تسجيل العمليات</div>
                                <div class="warning-text">جميع عمليات الحذف والتعديل يتم تسجيلها</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getPermissionIcon(permission) {
    const icons = {
        'delete_news': '🗑️',
        'edit_news': '✏️',
        'add_news': '➕',
        'manage_users': '👥',
        'view_analytics': '📊',
        'system_settings': '⚙️'
    };
    return icons[permission] || '🔧';
}

function getPermissionName(permission) {
    const names = {
        'delete_news': 'حذف الأخبار',
        'edit_news': 'تعديل الأخبار',
        'add_news': 'إضافة الأخبار',
        'manage_users': 'إدارة المستخدمين',
        'view_analytics': 'عرض الإحصائيات',
        'system_settings': 'إعدادات النظام'
    };
    return names[permission] || permission;
}

async function loadAdminStats() {
    try {
        const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const totalNews = querySnapshot.size;
        const lastNews = querySnapshot.docs[0]?.data();
        
        document.getElementById('totalNews').textContent = totalNews;
        document.getElementById('lastNews').textContent = lastNews ? lastNews.title : 'لا توجد أخبار';
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

async function loadNews() {
    try {
        showLoading();
        const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        
        const newsGridElement = document.getElementById('newsGrid');
        if (!newsGridElement) return;
        
        if (querySnapshot.empty) {
            showEmptyState();
            return;
        }
        
        const newsHtml = querySnapshot.docs.map(doc => {
            const news = doc.data();
            const canEdit = canEditNews(currentUser);
            const canDelete = canDeleteNews(currentUser);
            
            return `
                <div class="news-card" data-id="${doc.id}">
                    ${news.imageUrl ? `<img src="${news.imageUrl}" alt="${sanitizeInput(news.title)}" class="news-image">` : '<div class="news-image"></div>'}
                    <div class="news-content">
                        <h3 class="news-title">${sanitizeInput(news.title)}</h3>
                        <p class="news-description">${sanitizeInput(news.description)}</p>
                        <div class="news-meta">
                            <div class="news-date">
                                <span>📅</span>
                                ${formatDate(news.createdAt)}
                            </div>
                            <div class="news-author">
                                <span>✏️</span>
                                ${sanitizeInput(news.authorName || 'إدارة الموقع')}
                            </div>
                        </div>
                        ${(canEdit || canDelete) ? `
                            <div class="admin-actions">
                                ${canEdit ? `
                                <button class="btn btn-sm btn-success" onclick="editNews('${doc.id}')">
                                    <span>✏️</span>
                                    تعديل
                                </button>
                                ` : ''}
                                ${canDelete ? `
                                <button class="btn btn-sm btn-danger" onclick="deleteNews('${doc.id}')" title="حذف الخبر - يتطلب صلاحية خاصة">
                                    <span>🗑️</span>
                                    حذف
                                </button>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        newsGridElement.innerHTML = newsHtml;
        hideLoading();
    } catch (error) {
        console.error('خطأ في تحميل الأخبار:', error);
        hideLoading();
        const newsGridElement = document.getElementById('newsGrid');
        if (newsGridElement) {
            newsGridElement.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-title">حدث خطأ في تحميل الأخبار</div>
                    <p>يرجى إعادة تحميل الصفحة</p>
                </div>
            `;
        }
    }
}

function showLoading() {
    const loadingElement = document.getElementById('loading');
    const newsGridElement = document.getElementById('newsGrid');
    if (loadingElement) loadingElement.classList.remove('hidden');
    if (newsGridElement) newsGridElement.innerHTML = '';
}

function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.classList.add('hidden');
}

function showEmptyState() {
    hideLoading();
    const newsGridElement = document.getElementById('newsGrid');
    if (newsGridElement) {
        newsGridElement.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📰</div>
                <div class="empty-title">لا توجد أخبار حتى الآن</div>
                <p>سيتم عرض الأخبار المحلية هنا عند إضافتها</p>
            </div>
        `;
    }
}

function formatDate(timestamp) {
    if (!timestamp) return 'تاريخ غير محدد';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function openAddNewsModal() {
    if (!canAddNews(currentUser)) {
        showToast('غير مصرح لك بإضافة الأخبار', 'error');
        return;
    }
    
    currentEditingNews = null;
    modalTitle.textContent = 'إضافة خبر جديد';
    newsForm.reset();
    newsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function editNews(newsId) {
    if (!canEditNews(currentUser)) {
        showToast('غير مصرح لك بتعديل الأخبار', 'error');
        return;
    }
    
    try {
        const newsRef = doc(db, 'news', newsId);
        const newsSnapshot = await getDocs(query(collection(db, 'news'), where('__name__', '==', newsId)));
        
        if (newsSnapshot.empty) {
            showToast('الخبر غير موجود', 'error');
            return;
        }
        
        const newsData = newsSnapshot.docs[0].data();
        
        currentEditingNews = newsId;
        modalTitle.textContent = 'تعديل الخبر';
        newsTitle.value = newsData.title || '';
        newsDescription.value = newsData.description || '';
        newsModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('خطأ في تحميل بيانات الخبر:', error);
        showToast('حدث خطأ في تحميل بيانات الخبر', 'error');
    }
}

async function deleteNews(newsId) {
    if (!canDeleteNews(currentUser)) {
        showToast('غير مصرح لك بحذف الأخبار - تحتاج صلاحية خاصة', 'error');
        return;
    }
    
    // إضافة تأكيد مضاعف للحذف
    if (!confirm('⚠️ تحذير: حذف الأخبار يتطلب صلاحية خاصة!\n\nهل أنت متأكد من حذف هذا الخبر؟ لا يمكن التراجع عن هذا الإجراء.')) {
        return;
    }
    
    if (!confirm('تأكيد نهائي: هل تريد فعلاً حذف هذا الخبر؟')) {
        return;
    }
    
    try {
        showToast('جاري حذف الخبر...', 'info');
        
        // First, get the news document to check if it has an image
        const newsRef = doc(db, 'news', newsId);
        const newsSnapshot = await getDocs(query(collection(db, 'news'), where('__name__', '==', newsId)));
        
        if (!newsSnapshot.empty) {
            const newsData = newsSnapshot.docs[0].data();
            
            // Delete the image from storage if it exists
            if (newsData.imageUrl) {
                try {
                    const imageRef = ref(storage, newsData.imageUrl);
                    await deleteObject(imageRef);
                } catch (imageError) {
                    console.warn('تحذير: لم يتم حذف الصورة:', imageError);
                }
            }
        }
        
        // Delete the news document
        await deleteDoc(newsRef);
        loadNews();
        showToast('تم حذف الخبر بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في حذف الخبر:', error);
        showToast('حدث خطأ في حذف الخبر: ' + (error.message || 'خطأ غير معروف'), 'error');
    }
}

function closeNewsModal() {
    newsModal.style.display = 'none';
    document.body.style.overflow = '';
    currentEditingNews = null;
    newsForm.reset();
}

async function handleNewsSubmit(e) {
    e.preventDefault();
    
    if (currentEditingNews && !canEditNews(currentUser)) {
        showToast('غير مصرح لك بتعديل الأخبار', 'error');
        return;
    }
    
    if (!currentEditingNews && !canAddNews(currentUser)) {
        showToast('غير مصرح لك بإضافة الأخبار', 'error');
        return;
    }
    
    const title = sanitizeInput(newsTitle.value);
    const description = sanitizeInput(newsDescription.value);
    const imageFile = newsImage.files[0];
    
    try {
        // Validate input
        validateNewsData({ title, description });
        
        let imageUrl = '';
        
        // Upload image if provided
        if (imageFile) {
            if (imageFile.size > 5 * 1024 * 1024) { // 5MB limit
                throw new Error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
            }
            
            const imageRef = ref(storage, `news/${Date.now()}_${imageFile.name}`);
            const uploadResult = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(uploadResult.ref);
        }
        
        const newsData = {
            title,
            description,
            imageUrl,
            authorName: currentUser.displayName || 'إدارة الموقع',
            authorEmail: currentUser.email,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        if (currentEditingNews) {
            // Update existing news
            await updateDoc(doc(db, 'news', currentEditingNews), {
                ...newsData,
                createdAt: undefined // Don't update creation date
            });
            showToast('تم تحديث الخبر بنجاح', 'success');
        } else {
            // Add new news
            await addDoc(collection(db, 'news'), newsData);
            showToast('تم إضافة الخبر بنجاح', 'success');
        }
        
        closeNewsModal();
        loadNews();
    } catch (error) {
        console.error('خطأ في حفظ الخبر:', error);
        showToast(error.message || 'حدث خطأ في حفظ الخبر', 'error');
    }
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: ${type === 'success' ? 'var(--secondary-color)' : type === 'error' ? 'var(--danger-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--primary-color)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        max-width: 400px;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Make functions globally available
window.editNews = editNews;
window.deleteNews = deleteNews;
window.openAddNewsModal = openAddNewsModal;
window.navigateToPage = navigateToPage;