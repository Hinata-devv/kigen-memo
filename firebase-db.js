import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);

window.saveItemToCloud = async function (item, userId) {
  await addDoc(collection(db, "items"), {
    userId,
    category: item.category || "",
    item: item.item || "",
    openDate: item.openDate || "",
    expiryDate: item.expiryDate || "",
    createdAt: serverTimestamp()
  });
};

window.loadItemsFromCloud = async function (userId) {
  const q = query(
    collection(db, "items"),
    where("userId", "==", userId),
    orderBy("expiryDate", "asc")
  );

  const querySnapshot = await getDocs(q);

  const cloudItems = [];
  querySnapshot.forEach((docSnap) => {
    cloudItems.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  return cloudItems;
};

window.deleteItemFromCloud = async function (docId) {
  await deleteDoc(doc(db, "items", docId));
};

