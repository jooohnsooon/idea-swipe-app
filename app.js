'use strict';

// -------------------------------------------------------
// Sample ideas data
// -------------------------------------------------------
const IDEAS = [
  {
    id: 1,
    tag: 'アプリ',
    title: 'サブスクを一元管理するアプリ',
    desc: '複数のサブスクリプションサービスの更新日・金額をまとめて管理し、無駄なサブスクを発見できる。',
    difficulty: '★★★',
    market: '大',
  },
  {
    id: 2,
    tag: 'SaaS',
    title: 'ミーティング要約AI',
    desc: 'Zoom/Meet/Teamsの録音を自動でテキスト化・要約し、アクションアイテムを抽出してSlackに投稿する。',
    difficulty: '★★★★',
    market: '大',
  },
  {
    id: 3,
    tag: 'ECサービス',
    title: '地元農家の直販マーケット',
    desc: '農家が直接消費者に野菜・果物を販売できるプラットフォーム。定期便機能付き。',
    difficulty: '★★★',
    market: '中',
  },
  {
    id: 4,
    tag: 'ツール',
    title: 'コードレビュー自動化Bot',
    desc: 'PRを作成すると自動でコードのバグ・セキュリティリスク・パフォーマンス問題を指摘するGitHub Bot。',
    difficulty: '★★★★',
    market: '中',
  },
  {
    id: 5,
    tag: 'ライフスタイル',
    title: '習慣トラッカー×SNS',
    desc: '毎日の習慣を記録し、友達と進捗を共有できる。ゲーミフィケーション要素でモチベーション維持。',
    difficulty: '★★',
    market: '大',
  },
  {
    id: 6,
    tag: 'EdTech',
    title: '子ども向けプログラミング動画学習',
    desc: '小学生がゲーム感覚でコードを学べる動画＋インタラクティブ演習プラットフォーム。',
    difficulty: '★★★★',
    market: '大',
  },
  {
    id: 7,
    tag: 'FinTech',
    title: '個人向け資産管理ダッシュボード',
    desc: '銀行・証券・仮想通貨の口座を一括連携し、純資産をリアルタイムで可視化するツール。',
    difficulty: '★★★★★',
    market: '大',
  },
  {
    id: 8,
    tag: 'ヘルスケア',
    title: '睡眠改善コーチングアプリ',
    desc: 'ウェアラブルと連携して睡眠データを分析し、パーソナライズされた改善アドバイスを毎朝提供。',
    difficulty: '★★★',
    market: '大',
  },
  {
    id: 9,
    tag: 'B2B',
    title: '中小企業向け採用管理SaaS',
    desc: '求人掲載・応募管理・面接スケジュール・合否連絡をひとつのツールで完結。ATS機能付き。',
    difficulty: '★★★',
    market: '中',
  },
  {
    id: 10,
    tag: 'コミュニティ',
    title: 'スキルバーター型マッチングアプリ',
    desc: 'お金を使わずスキルを交換できるプラットフォーム。デザインと英会話を交換、など。',
    difficulty: '★★',
    market: '中',
  },
];

// -------------------------------------------------------
// State
// -------------------------------------------------------
const STORAGE_KEY = 'ideaSwipeResults';

let deck = [];           // remaining cards (IDEAS not yet judged in this session)
let history = [];        // for undo
let currentTab = 'good';

function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveResult(idea, verdict) {
  const results = loadResults();
  const existing = results.findIndex(r => r.id === idea.id);
  const entry = {
    id: idea.id,
    tag: idea.tag,
    title: idea.title,
    verdict,
    date: new Date().toLocaleDateString('ja-JP'),
  };
  if (existing >= 0) {
    results[existing] = entry;
  } else {
    results.push(entry);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function removeResult(id) {
  const results = loadResults().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

// -------------------------------------------------------
// DOM refs
// -------------------------------------------------------
const swipeScreen   = document.getElementById('swipeScreen');
const emptyScreen   = document.getElementById('emptyScreen');
const resultsScreen = document.getElementById('resultsScreen');
const cardStack     = document.getElementById('cardStack');
const progressFill  = document.getElementById('progressFill');
const progressText  = document.getElementById('progressText');
const leftHint      = document.getElementById('leftHint');
const rightHint     = document.getElementById('rightHint');

// -------------------------------------------------------
// Build deck (skip already judged ideas)
// -------------------------------------------------------
function buildDeck() {
  const judged = new Set(loadResults().map(r => r.id));
  deck = IDEAS.filter(idea => !judged.has(idea.id));
}

// -------------------------------------------------------
// Render
// -------------------------------------------------------
function updateProgress() {
  const total    = IDEAS.length;
  const judged   = total - deck.length;
  const pct      = total ? (judged / total) * 100 : 100;
  progressFill.style.width = pct + '%';
  progressText.textContent = `${judged} / ${total} 判定済み`;
}

function createCardEl(idea) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = idea.id;
  card.innerHTML = `
    <div class="card-overlay overlay-good">GOOD 👍</div>
    <div class="card-overlay overlay-bad">BAD 👎</div>
    <span class="card-tag">${idea.tag}</span>
    <h2 class="card-title">${idea.title}</h2>
    <p class="card-desc">${idea.desc}</p>
    <div class="card-meta">
      <span>🔧 難易度: ${idea.difficulty}</span>
      <span>📈 市場: ${idea.market}</span>
    </div>
  `;
  return card;
}

function renderCards() {
  cardStack.innerHTML = '';
  if (deck.length === 0) {
    showEmpty();
    return;
  }

  // deck[0] = first-child = top card (CSS :first-child has highest z-index)
  deck.slice(0, 3).forEach(idea => {
    cardStack.appendChild(createCardEl(idea));
  });

  attachDragToTopCard();
  updateProgress();
}

function getTopCard() {
  return cardStack.querySelector('.card:first-child');
}

// -------------------------------------------------------
// Drag / Swipe logic
// -------------------------------------------------------
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let dragController = null; // AbortController to clean up listeners each card

function attachDragToTopCard() {
  // Remove all previous drag listeners before attaching new ones
  if (dragController) { dragController.abort(); dragController = null; }

  const card = getTopCard();
  if (!card) return;

  dragController = new AbortController();
  const { signal } = dragController;

  const overlayGood = card.querySelector('.overlay-good');
  const overlayBad  = card.querySelector('.overlay-bad');

  function onStart(e) {
    isDragging = true;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX;
    startY = pt.clientY;
    currentX = 0;
    card.style.transition = 'none';
  }

  function onMove(e) {
    if (!isDragging) return;
    const pt = e.touches ? e.touches[0] : e;
    currentX = pt.clientX - startX;
    const currentY = pt.clientY - startY;
    const rotation = currentX * 0.08;

    card.style.transform = `translate(${currentX}px, ${currentY * 0.3}px) rotate(${rotation}deg)`;

    const ratio = Math.min(Math.abs(currentX) / 100, 1);
    if (currentX > 0) {
      overlayGood.style.opacity = ratio;
      overlayBad.style.opacity  = 0;
      rightHint.style.opacity   = ratio;
      leftHint.style.opacity    = 0;
    } else {
      overlayBad.style.opacity  = ratio;
      overlayGood.style.opacity = 0;
      leftHint.style.opacity    = ratio;
      rightHint.style.opacity   = 0;
    }
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    leftHint.style.opacity  = 0;
    rightHint.style.opacity = 0;

    if (Math.abs(currentX) > 90) {
      const verdict = currentX > 0 ? 'good' : 'bad';
      dismissCard(card, verdict);
    } else {
      card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      card.style.transform  = '';
      overlayGood.style.opacity = 0;
      overlayBad.style.opacity  = 0;
    }
  }

  card.addEventListener('mousedown',  onStart, { signal });
  card.addEventListener('touchstart', onStart, { passive: true, signal });
  document.addEventListener('mousemove',  onMove, { signal });
  document.addEventListener('touchmove',  onMove, { passive: true, signal });
  document.addEventListener('mouseup',    onEnd, { signal });
  document.addEventListener('touchend',   onEnd, { signal });
}

// -------------------------------------------------------
// Dismiss card
// -------------------------------------------------------
function dismissCard(card, verdict) {
  const idea = deck[0];
  if (!idea) return;

  // Stop drag listeners immediately
  if (dragController) { dragController.abort(); dragController = null; }

  history.push({ idea, verdict });
  deck.shift();

  card.style.transition = '';
  card.classList.add(verdict === 'good' ? 'fly-right' : 'fly-left');

  saveResult(idea, verdict);

  card.addEventListener('animationend', () => {
    card.remove();
    // Fill back up to 3 visible cards
    const domCount = cardStack.querySelectorAll('.card').length;
    for (let i = domCount; i < Math.min(3, deck.length); i++) {
      cardStack.appendChild(createCardEl(deck[i]));
    }
    updateStackStyles();
    if (deck.length === 0) {
      showEmpty();
    } else {
      attachDragToTopCard();
    }
    updateProgress();
  }, { once: true });
}

function updateStackStyles() {
  // Clear inline transforms so CSS :nth-child rules take over cleanly
  cardStack.querySelectorAll('.card').forEach(c => {
    c.style.transition = 'transform 0.3s ease';
    c.style.transform  = '';
  });
}

// -------------------------------------------------------
// Button controls
// -------------------------------------------------------
document.getElementById('goodBtn').addEventListener('click', () => {
  const card = getTopCard();
  if (card) dismissCard(card, 'good');
});

document.getElementById('badBtn').addEventListener('click', () => {
  const card = getTopCard();
  if (card) dismissCard(card, 'bad');
});

document.getElementById('undoBtn').addEventListener('click', () => {
  if (history.length === 0) return;
  const { idea, verdict } = history.pop();
  removeResult(idea.id);
  deck.unshift(idea);
  renderCards();
});

// -------------------------------------------------------
// Screen transitions
// -------------------------------------------------------
function showSwipe() {
  swipeScreen.classList.remove('hidden');
  emptyScreen.classList.add('hidden');
  resultsScreen.classList.add('hidden');
}

function showEmpty() {
  swipeScreen.classList.add('hidden');
  emptyScreen.classList.remove('hidden');
  resultsScreen.classList.add('hidden');
}

function showResults() {
  swipeScreen.classList.add('hidden');
  emptyScreen.classList.add('hidden');
  resultsScreen.classList.remove('hidden');
  renderResults();
}

// -------------------------------------------------------
// Results
// -------------------------------------------------------
function renderResults() {
  const results = loadResults();
  const good  = results.filter(r => r.verdict === 'good');
  const bad   = results.filter(r => r.verdict === 'bad');

  document.getElementById('resultsStats').innerHTML = `
    <div class="stat-card total">
      <div class="stat-num">${results.length}</div>
      <div class="stat-label">判定済み</div>
    </div>
    <div class="stat-card good">
      <div class="stat-num">${good.length}</div>
      <div class="stat-label">👍 良い</div>
    </div>
    <div class="stat-card bad">
      <div class="stat-num">${bad.length}</div>
      <div class="stat-label">👎 微妙</div>
    </div>
  `;

  renderResultsList(results, currentTab);
}

function renderResultsList(results, tab) {
  const list = document.getElementById('resultsList');
  let filtered = results;
  if (tab === 'good') filtered = results.filter(r => r.verdict === 'good');
  if (tab === 'bad')  filtered = results.filter(r => r.verdict === 'bad');

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-results">まだ判定がありません</div>';
    return;
  }

  list.innerHTML = filtered.map(r => `
    <div class="result-item ${r.verdict}">
      <div class="result-badge">${r.verdict === 'good' ? '👍' : '👎'}</div>
      <div class="result-info">
        <div class="result-tag">${r.tag}</div>
        <div class="result-title">${r.title}</div>
        <div class="result-date">${r.date}</div>
      </div>
    </div>
  `).join('');
}

// Tab clicks
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    renderResultsList(loadResults(), currentTab);
  });
});

// Results navigation
document.getElementById('resultsBtn').addEventListener('click', showResults);
document.getElementById('viewResultsBtn').addEventListener('click', showResults);
document.getElementById('backBtn').addEventListener('click', () => {
  buildDeck();
  if (deck.length > 0) {
    renderCards();
    showSwipe();
  } else {
    showEmpty();
  }
});

document.getElementById('resetBtn').addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  history = [];
  buildDeck();
  renderCards();
  showSwipe();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('全ての判定結果を削除しますか?')) {
    localStorage.removeItem(STORAGE_KEY);
    history = [];
    buildDeck();
    renderResults();
  }
});

// -------------------------------------------------------
// Keyboard shortcuts
// -------------------------------------------------------
document.addEventListener('keydown', e => {
  if (resultsScreen.classList.contains('hidden') === false) return;
  if (e.key === 'ArrowRight') document.getElementById('goodBtn').click();
  if (e.key === 'ArrowLeft')  document.getElementById('badBtn').click();
  if (e.key === 'z' && e.ctrlKey) document.getElementById('undoBtn').click();
});

// -------------------------------------------------------
// Init
// -------------------------------------------------------
buildDeck();
renderCards();
if (deck.length === 0) showEmpty();
else showSwipe();
