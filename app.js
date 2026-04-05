'use strict';

// -------------------------------------------------------
// Ideas data
// -------------------------------------------------------
const IDEAS = [
  {
    id: 1, tag: 'アプリ',
    title: 'サブスクを一元管理するアプリ',
    desc: '複数のサブスクリプションサービスの更新日・金額をまとめて管理し、無駄なサブスクを発見できる。',
    difficulty: '★★★', market: '大',
  },
  {
    id: 2, tag: 'SaaS',
    title: 'ミーティング要約AI',
    desc: 'Zoom/Meet/Teamsの録音を自動でテキスト化・要約し、アクションアイテムを抽出してSlackに投稿する。',
    difficulty: '★★★★', market: '大',
  },
  {
    id: 3, tag: 'ECサービス',
    title: '地元農家の直販マーケット',
    desc: '農家が直接消費者に野菜・果物を販売できるプラットフォーム。定期便機能付き。',
    difficulty: '★★★', market: '中',
  },
  {
    id: 4, tag: 'ツール',
    title: 'コードレビュー自動化Bot',
    desc: 'PRを作成すると自動でコードのバグ・セキュリティリスク・パフォーマンス問題を指摘するGitHub Bot。',
    difficulty: '★★★★', market: '中',
  },
  {
    id: 5, tag: 'ライフスタイル',
    title: '習慣トラッカー×SNS',
    desc: '毎日の習慣を記録し、友達と進捗を共有できる。ゲーミフィケーション要素でモチベーション維持。',
    difficulty: '★★', market: '大',
  },
  {
    id: 6, tag: 'EdTech',
    title: '子ども向けプログラミング動画学習',
    desc: '小学生がゲーム感覚でコードを学べる動画＋インタラクティブ演習プラットフォーム。',
    difficulty: '★★★★', market: '大',
  },
  {
    id: 7, tag: 'FinTech',
    title: '個人向け資産管理ダッシュボード',
    desc: '銀行・証券・仮想通貨の口座を一括連携し、純資産をリアルタイムで可視化するツール。',
    difficulty: '★★★★★', market: '大',
  },
  {
    id: 8, tag: 'ヘルスケア',
    title: '睡眠改善コーチングアプリ',
    desc: 'ウェアラブルと連携して睡眠データを分析し、パーソナライズされた改善アドバイスを毎朝提供。',
    difficulty: '★★★', market: '大',
  },
  {
    id: 9, tag: 'B2B',
    title: '中小企業向け採用管理SaaS',
    desc: '求人掲載・応募管理・面接スケジュール・合否連絡をひとつのツールで完結。ATS機能付き。',
    difficulty: '★★★', market: '中',
  },
  {
    id: 10, tag: 'コミュニティ',
    title: 'スキルバーター型マッチングアプリ',
    desc: 'お金を使わずスキルを交換できるプラットフォーム。デザインと英会話を交換、など。',
    difficulty: '★★', market: '中',
  },
];

// -------------------------------------------------------
// State
// -------------------------------------------------------
const STORAGE_KEY = 'ideaSwipeResults';
let deck    = [];
let history = [];
let currentTab = 'good';
let isBusy  = false; // prevent double-dismiss

function loadResults() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveResult(idea, verdict) {
  const results = loadResults();
  const idx = results.findIndex(r => r.id === idea.id);
  const entry = { id: idea.id, tag: idea.tag, title: idea.title, verdict,
                  date: new Date().toLocaleDateString('ja-JP') };
  if (idx >= 0) results[idx] = entry; else results.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function removeResult(id) {
  localStorage.setItem(STORAGE_KEY,
    JSON.stringify(loadResults().filter(r => r.id !== id)));
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
// Deck
// -------------------------------------------------------
function buildDeck() {
  const judged = new Set(loadResults().map(r => r.id));
  deck = IDEAS.filter(idea => !judged.has(idea.id));
}

// -------------------------------------------------------
// Render
// -------------------------------------------------------
function updateProgress() {
  const total  = IDEAS.length;
  const judged = total - deck.length;
  progressFill.style.width = (total ? judged / total * 100 : 100) + '%';
  progressText.textContent = `${judged} / ${total} 判定済み`;
}

function createCardEl(idea, isTop) {
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
  if (isTop) attachPointerEvents(card);
  return card;
}

function renderCards() {
  cardStack.innerHTML = '';
  isBusy = false;
  if (deck.length === 0) { showEmpty(); return; }

  // Render up to 3 cards; index 0 = top (first-child = highest z-index via CSS)
  deck.slice(0, 3).forEach((idea, i) => {
    cardStack.appendChild(createCardEl(idea, i === 0));
  });

  updateProgress();
}

function getTopCard() {
  return cardStack.querySelector('.card:first-child');
}

// -------------------------------------------------------
// Pointer Events (mouse + touch unified)
// -------------------------------------------------------
function attachPointerEvents(card) {
  let dragging = false;
  let startX = 0, startY = 0, dragX = 0;

  const overlayGood = card.querySelector('.overlay-good');
  const overlayBad  = card.querySelector('.overlay-bad');

  card.addEventListener('pointerdown', e => {
    if (isBusy) return;
    // Ignore clicks on interactive children
    if (e.target !== card && e.target.closest('button')) return;
    dragging = true;
    dragX    = 0;
    startX   = e.clientX;
    startY   = e.clientY;
    card.setPointerCapture(e.pointerId); // track pointer even outside element
    card.style.transition = 'none';
  });

  card.addEventListener('pointermove', e => {
    if (!dragging) return;
    dragX = e.clientX - startX;
    const dragY = e.clientY - startY;
    card.style.transform = `translate(${dragX}px,${dragY * 0.3}px) rotate(${dragX * 0.07}deg)`;

    const ratio = Math.min(Math.abs(dragX) / 100, 1);
    if (dragX > 0) {
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
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    leftHint.style.opacity = rightHint.style.opacity = 0;

    if (Math.abs(dragX) > 80) {
      dismissCard(card, dragX > 0 ? 'good' : 'bad');
    } else {
      card.style.transition = 'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)';
      card.style.transform  = '';
      overlayGood.style.opacity = overlayBad.style.opacity = 0;
    }
  }

  card.addEventListener('pointerup',     endDrag);
  card.addEventListener('pointercancel', () => {
    dragging = false;
    leftHint.style.opacity = rightHint.style.opacity = 0;
    card.style.transition = 'transform 0.35s ease';
    card.style.transform  = '';
    overlayGood.style.opacity = overlayBad.style.opacity = 0;
  });
}

// -------------------------------------------------------
// Dismiss (fly out via CSS transition + setTimeout)
// -------------------------------------------------------
function dismissCard(card, verdict) {
  if (isBusy) return;
  isBusy = true;
  leftHint.style.opacity = rightHint.style.opacity = 0;

  const idea = deck[0];
  history.push({ idea, verdict });
  deck.shift();
  saveResult(idea, verdict);

  const tx  = verdict === 'good' ? '130vw'  : '-130vw';
  const rot = verdict === 'good' ? '25deg'  : '-25deg';
  card.style.transition = 'transform 0.38s ease-in, opacity 0.38s ease-in';
  card.style.transform  = `translateX(${tx}) rotate(${rot})`;
  card.style.opacity    = '0';
  card.style.pointerEvents = 'none';

  setTimeout(() => {
    card.remove();

    // Fill back up to 3 background cards
    const domCount = cardStack.querySelectorAll('.card').length;
    for (let i = domCount; i < Math.min(3, deck.length); i++) {
      cardStack.appendChild(createCardEl(deck[i], false));
    }

    // Promote new top card: clear any stale inline styles, attach events
    const next = getTopCard();
    if (next) {
      next.style.transition = '';
      next.style.transform  = '';
      next.style.opacity    = '';
      attachPointerEvents(next);
    }

    isBusy = false;
    if (deck.length === 0) showEmpty();
    updateProgress();
  }, 400);
}

// -------------------------------------------------------
// Button controls
// -------------------------------------------------------
document.getElementById('goodBtn').addEventListener('click', () => {
  const card = getTopCard();
  if (card && !isBusy) dismissCard(card, 'good');
});

document.getElementById('badBtn').addEventListener('click', () => {
  const card = getTopCard();
  if (card && !isBusy) dismissCard(card, 'bad');
});

document.getElementById('undoBtn').addEventListener('click', () => {
  if (isBusy || history.length === 0) return;
  const { idea } = history.pop();
  removeResult(idea.id);
  deck.unshift(idea);
  renderCards();
  showSwipe();
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
  const good = results.filter(r => r.verdict === 'good');
  const bad  = results.filter(r => r.verdict === 'bad');

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

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    renderResultsList(loadResults(), currentTab);
  });
});

document.getElementById('resultsBtn').addEventListener('click', showResults);
document.getElementById('viewResultsBtn').addEventListener('click', showResults);
document.getElementById('backBtn').addEventListener('click', () => {
  buildDeck();
  if (deck.length > 0) { renderCards(); showSwipe(); } else showEmpty();
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
  if (!resultsScreen.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') document.getElementById('goodBtn').click();
  if (e.key === 'ArrowLeft')  document.getElementById('badBtn').click();
  if (e.key === 'z' && (e.ctrlKey || e.metaKey)) document.getElementById('undoBtn').click();
});

// -------------------------------------------------------
// Init
// -------------------------------------------------------
buildDeck();
renderCards();
if (deck.length === 0) showEmpty(); else showSwipe();
