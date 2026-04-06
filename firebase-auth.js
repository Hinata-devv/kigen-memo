import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCABwcro9NhsZkxZ9E_zCZq6Nd9aLM9EMI",
  authDomain: "kigen-memo.firebaseapp.com",
  projectId: "kigen-memo",
  storageBucket: "kigen-memo.firebasestorage.app",
  messagingSenderId: "232755263376",
  appId: "1:232755263376:web:58272e089b06e8fa57e515",
  measurementId: "G-TCSPSPW0DP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

window.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userInfo = document.getElementById("userInfo");

  if (!loginBtn || !logoutBtn || !userInfo) {
    console.error("ログイン用のHTML要素が見つかりません");
    return;
  }

  loginBtn.onclick = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("ログイン失敗:", error);
      alert("ログインに失敗しました");
    }
  };

  logoutBtn.onclick = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウト失敗:", error);
      alert("ログアウトに失敗しました");
    }
  };

  onAuthStateChanged(auth, async (user) => {
    window.currentUser = user || null;

    if (user) {
      userInfo.innerText = `ログイン中: ${user.displayName || user.email}`;
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";

      if (window.loadItemsFromCloud) {
        const cloudItems = await window.loadItemsFromCloud(user.uid);
        window.items = cloudItems;

        if (window.renderList) {
          window.renderList();
        }
      }
    } else {
      userInfo.innerText = "未ログイン";
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";

      window.items = [];

      if (window.renderList) {
        window.renderList();
      }
    }
  });
});

