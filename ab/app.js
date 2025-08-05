// Firebase initialization and shared auth/ui helpers

// Your Firebase config (provided)
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

// Initialize Firebase (compat SDKs loaded in HTML)
firebase.initializeApp(firebaseConfig);
if (firebase.analytics) {
  try { firebase.analytics(); } catch (_) {}
}

const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// Constants
const ADMIN_EMAIL = "alshmryh972@gmail.com";

// UI elements (may or may not exist depending on page)
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const adminLink = document.getElementById("adminLink");

// Sign in with Google
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return auth.signInWithPopup(provider);
}

// Sign out
function signOut() {
  return auth.signOut();
}

// Handle auth UI
auth.onAuthStateChanged(user => {
  const isAdmin = user?.email === ADMIN_EMAIL;

  if (signInBtn) signInBtn.hidden = !!user;
  if (signOutBtn) signOutBtn.hidden = !user;
  if (adminLink) adminLink.hidden = !isAdmin;

  // Expose current user for other scripts
  window.currentUser = user || null;
  window.isAdmin = isAdmin;
});

// Wire buttons if present
if (signInBtn) signInBtn.addEventListener("click", () => signInWithGoogle().catch(alert));
if (signOutBtn) signOutBtn.addEventListener("click", () => signOut().catch(alert));

// Helpers
function formatPrice(iqd) {
  try {
    return new Intl.NumberFormat("ar-IQ", { style: "currency", currency: "IQD", maximumFractionDigits: 0 }).format(iqd);
  } catch {
    return iqd + " د.ع";
  }
}

// Export to window for other files
window.firebaseRefs = { auth, db, storage };
window.helpers = { formatPrice, ADMIN_EMAIL };
