import { 
    db, 
    auth, 
    storage, 
    provider, 
    ADMIN_EMAIL,
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    orderBy, 
    query, 
    Timestamp,
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    ref,
    uploadBytes,
    getDownloadURL
} from './firebase-config.js';

let currentUser = null;
let currentEditingNews = null;

// DOM Elements
const authSection = document.getElementById('authSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const addNewsBtn = document.getElementById('addNewsBtn');
const newsGrid = document.getElementById('newsGrid');
const newsModal = document.getElementById('newsModal');
const newsForm = document.getElementById('newsForm');
const modalTitle = document.getElementById('modalTitle');
const newsTitle = document.getElementById('newsTitle');
const newsDescription = document.getElementById('newsDescription');
const newsImage = document.getElementById('newsImage');
const closeModal = document.getElementById('closeModal');
const loadingDiv = document.getElementById('loading');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadNews();
    
    // Monitor auth state
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateUI();
    });
});

function setupEventListeners() {
    loginBtn?.addEventListener('click', signInWithGoogle);
    logoutBtn?.addEventListener('click', signOutUser);
    addNewsBtn?.addEventListener('click', openAddNewsModal);
    closeModal?.addEventListener('click', closeNewsModal);
    newsForm?.addEventListener('submit', handleNewsSubmit);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === newsModal) {
            closeNewsModal();
        }
    });
}

async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        console.log('تم تسجيل الدخول بنجاح:', result.user.email);
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        alert('حدث خطأ في تسجيل الدخول. حاول مرة أخرى.');
    }
}

async function signOutUser() {
    try {
        await signOut(auth);
        console.log('تم تسجيل الخروج بنجاح');
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
    }
}

function updateUI() {
    if (currentUser) {
        // User is signed in
        authSection.innerHTML = `
            <div class="user-info" id="userInfo">
                <img src="${currentUser.photoURL}" alt="صورة المستخدم" class="user-avatar" id="userAvatar">
                <span class="user-name" id="userName">${currentUser.displayName}</span>
                <button class="btn btn-danger" id="logoutBtn">
                    <span>🚪</span>
                    تسجيل الخروج
                </button>
            </div>
        `;
        
        // Show admin features if user is admin
        if (currentUser.email === ADMIN_EMAIL) {
            addNewsBtn.classList.remove('hidden');
        } else {
            addNewsBtn.classList.add('hidden');
        }
        
        // Re-setup logout button
        document.getElementById('logoutBtn').addEventListener('click', signOutUser);
    } else {
        // User is signed out
        authSection.innerHTML = `
            <button class="btn" id="loginBtn">
                <span>📱</span>
                تسجيل الدخول بـ Google
            </button>
        `;
        addNewsBtn.classList.add('hidden');
        
        // Re-setup login button
        document.getElementById('loginBtn').addEventListener('click', signInWithGoogle);
    }
}

async function loadNews() {
    try {
        showLoading();
        const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            showEmptyState();
            return;
        }
        
        const newsHtml = querySnapshot.docs.map(doc => {
            const news = doc.data();
            const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
            
            return `
                <div class="news-item" data-id="${doc.id}">
                    ${news.imageUrl ? `<img src="${news.imageUrl}" alt="${news.title}" class="news-image">` : '<div class="news-image"></div>'}
                    <div class="news-content">
                        <h3 class="news-title">${news.title}</h3>
                        <p class="news-description">${news.description}</p>
                        <div class="news-meta">
                            <div class="news-date">
                                <span>📅</span>
                                ${formatDate(news.createdAt)}
                            </div>
                            <div class="news-author">
                                <span>✏️</span>
                                ${news.authorName}
                            </div>
                        </div>
                        ${isAdmin ? `
                            <div class="admin-actions">
                                <button class="btn btn-small btn-success" onclick="editNews('${doc.id}')">
                                    <span>✏️</span>
                                    تعديل
                                </button>
                                <button class="btn btn-small btn-danger" onclick="deleteNews('${doc.id}')">
                                    <span>🗑️</span>
                                    حذف
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        newsGrid.innerHTML = newsHtml;
        hideLoading();
    } catch (error) {
        console.error('خطأ في تحميل الأخبار:', error);
        hideLoading();
        newsGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>حدث خطأ في تحميل الأخبار</p></div>';
    }
}

function showLoading() {
    loadingDiv.classList.remove('hidden');
    newsGrid.innerHTML = '';
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function showEmptyState() {
    hideLoading();
    newsGrid.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📰</div>
            <h3>لا توجد أخبار حتى الآن</h3>
            <p>سيتم عرض الأخبار المحلية هنا عند إضافتها</p>
        </div>
    `;
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
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        alert('غير مصرح لك بهذا الإجراء');
        return;
    }
    
    currentEditingNews = null;
    modalTitle.textContent = 'إضافة خبر جديد';
    newsForm.reset();
    newsModal.style.display = 'block';
}

async function editNews(newsId) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        alert('غير مصرح لك بهذا الإجراء');
        return;
    }
    
    try {
        const newsDoc = doc(db, 'news', newsId);
        const newsSnapshot = await getDocs(query(collection(db, 'news')));
        const newsData = newsSnapshot.docs.find(d => d.id === newsId)?.data();
        
        if (!newsData) {
            alert('الخبر غير موجود');
            return;
        }
        
        currentEditingNews = newsId;
        modalTitle.textContent = 'تعديل الخبر';
        newsTitle.value = newsData.title || '';
        newsDescription.value = newsData.description || '';
        newsModal.style.display = 'block';
    } catch (error) {
        console.error('خطأ في تحميل بيانات الخبر:', error);
        alert('حدث خطأ في تحميل بيانات الخبر');
    }
}

async function deleteNews(newsId) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        alert('غير مصرح لك بهذا الإجراء');
        return;
    }
    
    if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'news', newsId));
        loadNews(); // Reload news list
        alert('تم حذف الخبر بنجاح');
    } catch (error) {
        console.error('خطأ في حذف الخبر:', error);
        alert('حدث خطأ في حذف الخبر');
    }
}

function closeNewsModal() {
    newsModal.style.display = 'none';
    currentEditingNews = null;
    newsForm.reset();
}

async function handleNewsSubmit(e) {
    e.preventDefault();
    
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        alert('غير مصرح لك بهذا الإجراء');
        return;
    }
    
    const title = newsTitle.value.trim();
    const description = newsDescription.value.trim();
    const imageFile = newsImage.files[0];
    
    if (!title || !description) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    try {
        let imageUrl = '';
        
        // Upload image if provided
        if (imageFile) {
            const imageRef = ref(storage, `news/${Date.now()}_${imageFile.name}`);
            const uploadResult = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(uploadResult.ref);
        }
        
        const newsData = {
            title,
            description,
            imageUrl,
            authorName: currentUser.displayName,
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
            alert('تم تحديث الخبر بنجاح');
        } else {
            // Add new news
            await addDoc(collection(db, 'news'), newsData);
            alert('تم إضافة الخبر بنجاح');
        }
        
        closeNewsModal();
        loadNews();
    } catch (error) {
        console.error('خطأ في حفظ الخبر:', error);
        alert('حدث خطأ في حفظ الخبر');
    }
}

// Make functions globally available
window.editNews = editNews;
window.deleteNews = deleteNews;