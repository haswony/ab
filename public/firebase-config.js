// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, orderBy, query, Timestamp, where, limit } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBebtWIuyUC0mCUHz3G3gPsvtOMWfuBr40",
  authDomain: "baladroz-be563.firebaseapp.com",
  databaseURL: "https://baladroz-be563-default-rtdb.firebaseio.com",
  projectId: "baladroz-be563",
  storageBucket: "baladroz-be563.appspot.com",
  messagingSenderId: "910470723253",
  appId: "1:910470723253:web:5892ecf305d96d118ab0fc",
  measurementId: "G-55B3DD8X4P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Admin emails and roles system
const ADMIN_EMAILS = ['alshmryh972@gmail.com'];
const SUPER_ADMIN_EMAIL = 'alshmryh972@gmail.com';

// Admin permissions structure
const ADMIN_PERMISSIONS = {
  'alshmryh972@gmail.com': {
    level: 'super_admin',
    permissions: [
      'delete_news',
      'edit_news', 
      'add_news',
      'manage_users',
      'view_analytics',
      'system_settings'
    ]
  }
  // يمكن إضافة مشرفين آخرين هنا
};

// Security helper functions
const isAdmin = (user) => {
  return user && ADMIN_EMAILS.includes(user.email);
};

const isSuperAdmin = (user) => {
  return user && user.email === SUPER_ADMIN_EMAIL;
};

const hasPermission = (user, permission) => {
  if (!user || !isAdmin(user)) return false;
  const userPerms = ADMIN_PERMISSIONS[user.email];
  return userPerms && userPerms.permissions.includes(permission);
};

const canDeleteNews = (user) => {
  return hasPermission(user, 'delete_news');
};

const canEditNews = (user) => {
  return hasPermission(user, 'edit_news');
};

const canAddNews = (user) => {
  return hasPermission(user, 'add_news');
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const validateNewsData = (data) => {
  if (!data.title || data.title.length < 3 || data.title.length > 200) {
    throw new Error('عنوان الخبر يجب أن يكون بين 3 و 200 حرف');
  }
  if (!data.description || data.description.length < 10 || data.description.length > 2000) {
    throw new Error('وصف الخبر يجب أن يكون بين 10 و 2000 حرف');
  }
  return true;
};

export { 
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
};