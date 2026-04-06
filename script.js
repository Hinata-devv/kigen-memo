let items = [];
window.items = items;
let currentFilter = "すべて";

const itemOptions = {
  "調味料": [
    "醤油",
    "みりん",
    "酒",
    "お酢",
    "ソース",
    "ケチャップ",
    "だしの素"
  ],
  "ドレッシング": [
    "胡麻ドレッシング",
    "和風ドレッシング",
    "シーザードレッシング",
    "青じそドレッシング"
  ],
  "粉もの": [
    "小麦粉",
    "片栗粉",
    "パン粉",
    "ホットケーキミックス"
  ],
  "冷蔵系": [
    "味噌",
    "バター",
    "マヨネーズ"
  ]
};

// ページ読み込み時
window.onload = function () {
  updateItems();

  //const saved = localStorage.getItem("kigenItems");

 // if (saved) {
  //  items = JSON.parse(saved);
  //  sortItems();
 //   renderList();
//  }
};

// 追加
async function addItem() {
  console.log("addItem clicked");
  console.log("currentUser:", window.currentUser);

  const category = document.getElementById("category").value;
  const item = document.getElementById("item").value;
  const openDate = document.getElementById("openDate").value;
  const expiryDate = document.getElementById("expiryDate").value;

  if (!window.currentUser) {
    alert("先にログインしてください");
    return;
  }

  if (!expiryDate) {
    alert("期限を入力してね！");
    return;
  }

  const newItem = {
    category,
    item,
    openDate,
    expiryDate
  };

  console.log("save前", newItem);

  await window.saveItemToCloud(newItem, window.currentUser.uid);

  console.log("save後");

  const cloudItems = await window.loadItemsFromCloud(window.currentUser.uid);
  items = cloudItems;
  window.items = items;

  renderList();
}

window.addItem = addItem;


// 期限順に並べる
function sortItems() {

  items.sort(function (a, b) {
    return new Date(a.expiryDate) - new Date(b.expiryDate);
  });

}

// 保存
function saveItems() {
  localStorage.setItem("kigenItems", JSON.stringify(items));
}

// 表示
function renderList() {
  let expired = 0;
  let soon3 = 0;
  let soon7 = 0;

  const list = document.getElementById("list");
  list.innerHTML = "";

  const filteredItems = currentFilter === "すべて"
    ? items
    : items.filter((data) => data.category === currentFilter);

  if (filteredItems.length === 0) {
    list.innerHTML = "<p style='text-align:center;color:#888;'>このカテゴリの登録はまだありません</p>";
  }

  window.renderList = renderList;


  filteredItems.forEach((data) => {
    const today = new Date();
    const expiry = new Date(data.expiryDate);

    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let remainText = "";

    if (diffDays < 0) {
      remainText = "⚠期限切れ！";
    } else {
      remainText = "残り " + diffDays + " 日";
    }

    if (diffDays < 0) {
      expired++;
    } else if (diffDays <= 3) {
      soon3++;
    } else if (diffDays <= 7) {
      soon7++;
    }

    const li = document.createElement("li");

    if (diffDays <= 3) {
      li.style.backgroundColor = "#ffecec";
      li.style.border = "1px solid #ffb3b3";
    } else if (diffDays <= 7) {
      li.style.backgroundColor = "#fff0b3";
      li.style.border = "1px solid #ffd700";
    }

    li.innerHTML =
      "<div class='item-name'>🍓 " + data.item + "</div>" +
      "<div class='item-meta'>カテゴリ：" + (data.category || "未分類") + "</div>" +
      "<div class='item-meta'>開封日：" + (data.openDate || "未入力") + "</div>" +
      "<div class='item-meta'>期限：" + data.expiryDate + "（" + remainText + "）</div>" +
      "<button class='delete-btn' onclick='deleteItemById(" + data.id + ")'>🗑 使い切った</button>";

    list.appendChild(li);
  });

  document.getElementById("summary").innerHTML =
    "<span class='summary-tag summary-expired'>期限切れ " + expired + "</span>" +
    "<span class='summary-tag summary-soon3'>3日以内 " + soon3 + "</span>" +
    "<span class='summary-tag summary-soon7'>7日以内 " + soon7 + "</span>";
　
  updateNotice();

}

// 削除
async function deleteItem(index) {
  if (!window.currentUser) return;

  const target = items[index];
  if (!target || !target.id) return;

  await window.deleteItemFromCloud(target.id);

  const cloudItems = await window.loadItemsFromCloud(window.currentUser.uid);
  items = cloudItems;
  window.items = items;

  renderList();
}

window.deleteItem = deleteItem;

const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");

if (imageInput) {
  imageInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  });
}

async function readExpiryFromImage() {
  const file = imageInput.files[0];

  if (!file) {
    alert("先に画像を選んでね！");
    return;
  }

  document.getElementById("ocrStatus").innerText = "文字を読み取り中...";
  document.getElementById("ocrResult").innerText = "";
  document.getElementById("dateCandidates").innerHTML = "";

  try {
    const result = await Tesseract.recognize(file, "eng+jpn");
    const text = result.data.text;

    document.getElementById("ocrStatus").innerText = "期限候補を見つけました";
    document.getElementById("ocrResult").innerText = text;

    const dates = extractDateCandidates(text);
    renderDateCandidates(dates);

  } catch (error) {
    document.getElementById("ocrStatus").innerText = "読み取れませんでした。もう一度撮影してみてください。";
    document.getElementById("ocrResult").innerText = "";
    document.getElementById("dateCandidates").innerHTML = "";
    console.error(error);
  }
}

function extractDateCandidates(text) {
  console.log("RAW TEXT ↓↓↓");
  console.log(text);

  const results = [];

  const patterns = [
    /\d{4}\s*[.\-\/]\s*\d{1,2}\s*[.\-\/]\s*\d{1,2}/g, // 2028.03.10 / 2028. 03. 10
    /\d{2}\s*[.\-\/]\s*\d{1,2}\s*[.\-\/]\s*\d{1,2}/g, // 28.03.10 / 28. 03. 10
    /\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/g       // 2028年3月10日
  ];

  patterns.forEach((pattern) => {
    const found = text.match(pattern);
    if (found) {
      results.push(...found);
    }
  });

  const cleaned = [...new Set(results)].map(date =>
    date.replace(/\s+/g, "")
  );

  console.log("EXTRACTED ↓↓↓");
  console.log(cleaned);

  return cleaned;
}

function renderDateCandidates(dates) {
  const label = document.getElementById("candidateLabel");
label.style.display = "block";
  const container = document.getElementById("dateCandidates");
  container.innerHTML = "";

  if (dates.length === 0) {
    container.innerHTML = "<span class='summary-tag'>期限が見つかりませんでした</span>";
    return;
  }

  dates.forEach((date) => {
    const btn = document.createElement("button");
    btn.className = "candidate-btn";
    btn.innerText = date;
  btn.onclick = function () {
  const normalized = normalizeDate(date);

  if (normalized) {
    const input = document.getElementById("expiryDate");
    input.value = normalized;

    input.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    showToast("期限を入力しました");
  } else {
    alert("この日付形式はまだ反映できません");
  }
};
    container.appendChild(btn);
  });
}

function normalizeDate(dateStr) {
  dateStr = dateStr.replace(/\s+/g, "");

  if (dateStr.includes("年")) {
    const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, "0");
      const d = match[3].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  const cleaned = dateStr.replace(/\./g, "/").replace(/-/g, "/");
  const parts = cleaned.split("/");

  if (parts.length === 3) {
    let y = parts[0];
    let m = parts[1].padStart(2, "0");
    let d = parts[2].padStart(2, "0");

    if (y.length === 2) {
      y = "20" + y;
    }

    return `${y}-${m}-${d}`;
  }

  return "";
}

function updateItems() {
  const categorySelect = document.getElementById("category");
  const itemSelect = document.getElementById("item");

  if (!categorySelect || !itemSelect) return;

  const category = categorySelect.value;
  itemSelect.innerHTML = "";

  const options = itemOptions[category] || [];

  options.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    itemSelect.appendChild(option);
  });
}

function setFilter(category) {
  currentFilter = category;

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    if (btn.dataset.filter === category) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  renderList();
}

function deleteItemById(id) {
  items = items.filter((data) => data.id !== id);
  saveItems();
  renderList();
}

function updateNotice() {
  let expired = 0;
  let todayCount = 0;
  let soon3 = 0;
  let soon7 = 0;

  items.forEach((data) => {
    const diffDays = calcRemainingDays(data.expiryDate);

    if (diffDays < 0) {
      expired++;
    } else if (diffDays === 0) {
      todayCount++;
    } else if (diffDays <= 3) {
      soon3++;
    } else if (diffDays <= 7) {
      soon7++;
    }
  });

  const noticeCard = document.getElementById("noticeCard");
  const noticeSummary = document.getElementById("noticeSummary");

  // ▼ メイン通知
  let message = "";
  let className = "";

  if (expired > 0) {
    message = "期限切れの商品が " + expired + " 件あります";
    className = "alert";
  } else if (todayCount > 0) {
    message = "今日までの商品が " + todayCount + " 件あります";
    className = "alert";
  } else if (soon3 > 0) {
    message = "3日以内の商品が " + soon3 + " 件あります";
    className = "warn";
  } else {
    message = "今のところ急ぎの期限はありません";
    className = "";
  }

  noticeCard.className = "notice-card " + className;
  noticeCard.innerText = message;

  // ▼ サマリータグ
  noticeSummary.innerHTML =
    "<span class='notice-tag'>期限切れ " + expired + "</span>" +
    "<span class='notice-tag'>今日まで " + todayCount + "</span>" +
    "<span class='notice-tag'>3日以内 " + soon3 + "</span>" +
    "<span class='notice-tag'>7日以内 " + soon7 + "</span>";
}

function calcRemainingDays(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}



function generateItemCandidates(text) {
  const box = document.getElementById("itemCandidates");
  box.innerHTML = "";

  const lines = text.split("\n");

  const filtered = lines
    .map(t => t.trim())
    .filter(t => {
      return (
        t.length >= 2 &&
        t.length <= 12 &&                 // 長すぎ除外
        !t.match(/[0-9]/) &&              // 数字除外
        !t.match(/^[a-zA-Z]+$/) &&        // 英語だけ除外
        !t.match(/[^\wぁ-んァ-ン一-龥]/g) // 記号多いの除外
      );
    });

  // よくありそうな単語優先（簡易スコア）
  const scored = filtered.map(word => {
    let score = 0;

    if (word.match(/[ぁ-んァ-ン一-龥]/)) score += 2; // 日本語
    if (word.length >= 3) score += 1;
    if (word.length <= 6) score += 1;

    return { word, score };
  });

  // スコア順
  scored.sort((a, b) => b.score - a.score);

  const unique = [...new Set(scored.map(s => s.word))];

  if (unique.length === 0) {
    box.innerHTML = "<span class='summary-tag'>商品名を認識できませんでした</span>";
    return;
  }

  unique.slice(0, 3).forEach(word => {
    const btn = document.createElement("button");
    btn.className = "candidate-btn";
    btn.innerText = word;

    btn.onclick = function () {
      document.getElementById("item").value = word;
    };

    box.appendChild(btn);
  });
}

async function handleExpiryImage(file) {
  if (!file) return;

  document.getElementById("backPreview").src = URL.createObjectURL(file);

  const candidateLabel = document.getElementById("candidateLabel");
  const dateCandidates = document.getElementById("dateCandidates");

  candidateLabel.style.display = "none";
  dateCandidates.innerHTML = "<span class='summary-tag'>読み取り中...</span>";

  try {
 const result = await Tesseract.recognize(file, "jpn+eng", {
  tessedit_pageseg_mode: 6
});

    const text = result.data.text;
    console.log("OCR text:", text);

    const dates = extractDateCandidates(text);
   console.log("dates:", dates);

    renderDateCandidates(dates);
  } catch (error) {
    candidateLabel.style.display = "none";
    dateCandidates.innerHTML =
      "<span class='summary-tag'>うまく読み取れませんでした。日付部分を大きく写してもう一度お試しください</span>";
    console.error(error);
  }
}

window.addEventListener("DOMContentLoaded", function() {
  const cameraInput = document.getElementById("cameraInput");
  const galleryInput = document.getElementById("galleryInput");

  if (cameraInput) {
    cameraInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      handleExpiryImage(file);
    });
  }

  if (galleryInput) {
    galleryInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      handleExpiryImage(file);
    });
  }

  renderRecentItems();

  setTodayDefault(); 

});

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}

function resetImage() {
  document.getElementById("backPreview").src = "";
  document.getElementById("dateCandidates").innerHTML = "";
  document.getElementById("candidateLabel").style.display = "none";
}

function setToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  document.getElementById("openDate").value = `${yyyy}-${mm}-${dd}`;
}

function saveRecentItem(item) {
  let list = JSON.parse(localStorage.getItem("recentItems")) || [];

  list = [item, ...list.filter(i => i !== item)];
  list = list.slice(0, 5);

  localStorage.setItem("recentItems", JSON.stringify(list));
}

function renderRecentItems() {
  const box = document.getElementById("recentItems");
  const list = JSON.parse(localStorage.getItem("recentItems")) || [];

  box.innerHTML = "";

  list.forEach(name => {
    const btn = document.createElement("button");
    btn.className = "candidate-btn";
    btn.innerText = name;

    btn.onclick = () => {
      document.getElementById("item").value = name;
    };

    box.appendChild(btn);
  });
}

function setTodayDefault() {
  const input = document.getElementById("openDate");

  if (!input.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    input.value = `${yyyy}-${mm}-${dd}`;
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then((reg) => {
      console.log("Service Worker registered", reg);
    })
    .catch((err) => {
      console.log("Service Worker failed", err);
    });
}

window.addEventListener("DOMContentLoaded", function () {
  const enableBtn = document.getElementById("enableNotificationBtn");
  const testBtn = document.getElementById("testNotificationBtn");

  console.log("enableBtn:", enableBtn);
  console.log("testBtn:", testBtn);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js")
      .then((reg) => {
        console.log("Service Worker registered", reg);
      })
      .catch((err) => {
        console.log("Service Worker failed", err);
      });
  }

  if (enableBtn) {
    enableBtn.onclick = async () => {
      try {
        const permission = await Notification.requestPermission();
        console.log("permission:", permission);

        if (permission === "granted") {
          alert("通知が有効になりました！");
        } else {
          alert("通知が拒否されました");
        }
      } catch (error) {
        console.error("通知許可エラー:", error);
      }
    };
  }

  if (testBtn) {
    testBtn.onclick = async () => {
      try {
        if (Notification.permission !== "granted") {
          alert("先に通知を許可してください");
          return;
        }

        const registration = await navigator.serviceWorker.getRegistration();
        console.log("registration:", registration);

        if (!registration) {
          alert("Service Worker が登録されていません");
          return;
        }

        let expiredItems = [];
let todayItems = [];

items.forEach((data) => {
  if (!data.expiryDate) return;

  const diffDays = calcRemainingDays(data.expiryDate);

  if (diffDays < 0) {
    expiredItems.push(data.item);
  } else if (diffDays === 0) {
    todayItems.push(data.item);
  } else if (diffDays <= 3) {
    soon3Items.push(data.item);
  } else if (diffDays <= 7) {
    soon7Items.push(data.item);
  }
});

let body = "";

if (expiredItems.length > 0) {
  body =
    "期限切れのものがあります（" +
    expiredItems.slice(0, 2).join("、") +
    (expiredItems.length > 2 ? " など" : "") +
    "）";
} else if (todayItems.length > 0) {
  body =
    "今日までのものがあります（" +
    todayItems.slice(0, 2).join("、") +
    (todayItems.length > 2 ? " など" : "") +
    "）";
} else if (soon3Items.length > 0) {
  body =
    "3日以内に期限のものがあります（" +
    soon3Items.slice(0, 2).join("、") +
    (soon3Items.length > 2 ? " など" : "") +
    "）";
} else if (soon7Items.length > 0) {
  body =
    "7日以内に確認したいものがあります（" +
    soon7Items.slice(0, 2).join("、") +
    (soon7Items.length > 2 ? " など" : "") +
    "）";
} else {
  body = "今は特に急ぎの期限はありません";
}

await registration.showNotification("きげんmemo", {
  body: body
});

        console.log("通知を出しました");
      } catch (error) {
        console.error("テスト通知エラー:", error);
      }
    };
  }
});





