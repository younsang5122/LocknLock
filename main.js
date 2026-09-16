/**
 * ============================================================================
 * LocknLock Shopping Mall — Core Application Script
 * ----------------------------------------------------------------------------
 * Clean, modular architecture for state management, SPA routing,
 * Firebase Auth, TossPayments SDK integration, and interactive UI component logic.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. STATE STORE & GLOBAL APP STATE
  // ==========================================================================
  const store = {
    cart: [],             // [{ id, name, image, price, qty }]
    wishlist: [],         // [{ id, name, image, price }]
    recentlyViewed: [],   // [{ id, brand, nameHtml, ratingHtml, priceHtml, image, alt }] (Max 10)
    isLoggedIn: false,
    currentUser: null,    // { displayName, photoURL }
    pageHistory: ['page-home'],
    selectedPayMethod: '토스페이',
    checkoutItems: [],
    checkoutTotal: 0,
    wishSortNewest: true,
    wishSearchQuery: '',
  };

  // Environment Configuration
  const env = (typeof window !== 'undefined' && window.env) || {};
  const TOSS_CLIENT_KEY = env.VITE_TOSS_CLIENT_KEY || 'test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm';
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBRs87dL43yttlJjqfu-PZG3NFKQROPYV8",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "locknlock-e936e.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "locknlock-e936e",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "locknlock-e936e.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "639512598024",
    appId: env.VITE_FIREBASE_APP_ID || "1:639512598024:web:0cff067ebf6e69e38223bd"
  };

  // ==========================================================================
  // 2. HELPER UTILITIES & UI NOTIFICATIONS
  // ==========================================================================
  const formatWon = (num) => `${(num || 0).toLocaleString('ko-KR')}원`;

  const parseNumber = (text) => {
    if (!text) return 0;
    const match = text.replace(/,/g, '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Toast Notifications
  const showToast = (message) => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  };

  // Reusable Alert Modal System
  const alertModalOverlay = document.getElementById('alert-modal-overlay');
  const alertModalMessage = document.getElementById('alert-modal-message');
  const alertModalConfirmBtn = document.getElementById('alert-modal-confirm');
  let alertModalOnConfirm = null;

  const showAlertModal = (message, onConfirm) => {
    if (!alertModalOverlay || !alertModalMessage) return;
    alertModalMessage.textContent = message;
    alertModalOnConfirm = typeof onConfirm === 'function' ? onConfirm : null;
    alertModalOverlay.classList.add('show');
  };

  const closeAlertModal = () => {
    if (!alertModalOverlay) return;
    alertModalOverlay.classList.remove('show');
    const callback = alertModalOnConfirm;
    alertModalOnConfirm = null;
    if (callback) callback();
  };

  if (alertModalConfirmBtn) {
    alertModalConfirmBtn.addEventListener('click', closeAlertModal);
  }
  if (alertModalOverlay) {
    alertModalOverlay.addEventListener('click', (e) => {
      if (e.target === alertModalOverlay) closeAlertModal();
    });
  }

  // ==========================================================================
  // 3. SPA ROUTER & NAVIGATION
  // ==========================================================================
  const tabItems = document.querySelectorAll('.tab-item');
  const pageSections = document.querySelectorAll('.page-section');
  const bottomTabbar = document.querySelector('.bottom-tabbar');

  const goToPage = (targetPage, options = {}) => {
    const { syncTab = false, isBack = false } = options;

    if (!isBack) {
      const current = store.pageHistory[store.pageHistory.length - 1];
      if (current !== targetPage) {
        store.pageHistory.push(targetPage);
      }
    }

    if (syncTab) {
      tabItems.forEach((tab) => {
        tab.classList.toggle('is-active', tab.getAttribute('data-page') === targetPage);
      });
    }

    pageSections.forEach((section) => section.classList.remove('is-active'));

    const targetSection = document.getElementById(targetPage);
    if (targetSection) {
      targetSection.classList.add('is-active');

      const mainArea = targetSection.querySelector('.app-main') || targetSection;
      if (mainArea) mainArea.scrollTop = 0;

      if (bottomTabbar) {
        bottomTabbar.style.display = targetSection.classList.contains('no-tabbar') ? 'none' : '';
      }

      // Page specific refresh triggers
      if (targetPage === 'page-checkout') {
        renderCheckoutSummary();
      } else if (targetPage === 'page-wish') {
        renderWishPage();
      } else if (targetPage === 'page-recent') {
        renderRecentPage();
      } else if (targetPage === 'page-cart') {
        renderCart();
      }
    }
  };

  // Required Login Protection for specific pages
  const LOGIN_REQUIRED_PAGES = ['page-wish', 'page-mypage'];

  document.querySelectorAll('[data-page]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = trigger.getAttribute('data-page');

      if (LOGIN_REQUIRED_PAGES.includes(targetPage) && !store.isLoggedIn) {
        closeDrawer();
        showAlertModal('로그인이 필요한 서비스입니다.', () => {
          goToPage('page-login');
        });
        return;
      }

      const shouldSyncTab = trigger.classList.contains('tab-item')
        || trigger.classList.contains('app-logo')
        || trigger.classList.contains('drawer-logo');

      goToPage(targetPage, { syncTab: shouldSyncTab });
      closeDrawer();
    });

    if (trigger.getAttribute('role') === 'button') {
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        }
      });
    }
  });

  // Global Back Buttons
  document.querySelectorAll('.back-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (store.pageHistory.length > 1) {
        store.pageHistory.pop();
        const prevPage = store.pageHistory[store.pageHistory.length - 1];
        const isTabItem = ['page-home', 'page-cart', 'page-wish', 'page-mypage'].includes(prevPage);
        goToPage(prevPage, { syncTab: isTabItem, isBack: true });
      } else {
        goToPage('page-home', { syncTab: true });
      }
    });
  });

  // ==========================================================================
  // 4. PRODUCT DATA EXTRACTOR & CARD HELPERS
  // ==========================================================================
  const getProductInfoFromCard = (card) => {
    const nameEl = card.querySelector('.product-name');
    const imgEl = card.querySelector('.product-thumb img');
    const priceEl = card.querySelector('.product-price');

    const name = nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : '상품';
    const image = imgEl ? imgEl.getAttribute('src') : '';

    let price = 0;
    if (priceEl) {
      const clone = priceEl.cloneNode(true);
      clone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
      price = parseNumber(clone.textContent);
    }

    return { id: name, name, image, price };
  };

  const getProductInfoFromWishBtn = (btn) => {
    const card = btn.closest('.product-card');
    if (card) return getProductInfoFromCard(card);

    const detailPage = document.getElementById('page-product-detail');
    if (detailPage) {
      const nameEl = detailPage.querySelector('.pd-name');
      const imgEl = detailPage.querySelector('.pd-gallery-img');
      const priceEl = detailPage.querySelector('.pd-price');

      const name = nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : '상품';
      const image = imgEl ? imgEl.getAttribute('src') : '';

      let price = 0;
      if (priceEl) {
        const clone = priceEl.cloneNode(true);
        clone.querySelectorAll('.pd-won').forEach((el) => el.remove());
        price = parseNumber(clone.textContent);
      }

      return { id: name, name, image, price };
    }
    return null;
  };

  // ==========================================================================
  // 5. CART MANAGEMENT MODULE
  // ==========================================================================
  const updateCartBadge = () => {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const totalQty = store.cart.reduce((sum, item) => sum + item.qty, 0);
    if (totalQty > 0) {
      badge.textContent = totalQty > 99 ? '99+' : totalQty;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  };

  const addToCart = (product, quantity = 1) => {
    const existing = store.cart.find((item) => item.id === product.id);
    if (existing) {
      existing.qty += quantity;
    } else {
      store.cart.push({ ...product, qty: quantity });
    }
    renderCart();
  };

  const updateCartQty = (id, delta) => {
    const item = store.cart.find((i) => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      store.cart = store.cart.filter((i) => i.id !== id);
    }
    renderCart();
  };

  const removeFromCart = (id) => {
    store.cart = store.cart.filter((i) => i.id !== id);
    renderCart();
  };

  const updateSelectAllUI = () => {
    const selectAllCheckbox = document.getElementById('cart-select-all-checkbox');
    const selectAllLabel = document.getElementById('cart-select-all-label');
    const itemCheckboxes = document.querySelectorAll('#cart-item-list .cart-checkbox');

    const total = itemCheckboxes.length;
    const checkedCount = Array.from(itemCheckboxes).filter((cb) => cb.checked).length;

    if (selectAllCheckbox) {
      selectAllCheckbox.checked = total > 0 && checkedCount === total;
    }
    if (selectAllLabel) {
      selectAllLabel.textContent = `전체 선택 (${checkedCount}/${total})`;
    }
  };

  const renderCart = () => {
    updateCartBadge();
    const list = document.getElementById('cart-item-list');
    if (!list) return;

    const emptyState = document.getElementById('cart-empty-state');
    const selectAllRow = document.getElementById('cart-select-all-row');
    const summaryCard = document.getElementById('cart-summary-card');
    const freeShipping = document.getElementById('cart-free-shipping-note');
    const orderBtn = document.getElementById('cart-order-btn');

    list.innerHTML = '';

    const isEmpty = store.cart.length === 0;
    if (emptyState) emptyState.style.display = isEmpty ? 'flex' : 'none';
    if (selectAllRow) selectAllRow.style.display = isEmpty ? 'none' : '';
    if (summaryCard) summaryCard.style.display = isEmpty ? 'none' : '';
    if (freeShipping) freeShipping.style.display = isEmpty ? 'none' : '';
    if (orderBtn) orderBtn.style.display = isEmpty ? 'none' : '';

    if (isEmpty) return;

    let totalQty = 0;
    let productAmount = 0;

    store.cart.forEach((item) => {
      totalQty += item.qty;
      productAmount += item.price * item.qty;

      const itemCard = document.createElement('div');
      itemCard.className = 'cart-item-card';
      itemCard.innerHTML = `
        <div class="cart-item-top">
          <label class="cart-checkbox-label">
            <input type="checkbox" class="cart-checkbox" data-id="${item.id}" checked>
            <span class="cart-checkbox-custom"></span>
          </label>
          <div class="cart-item-img">
            <img src="${item.image}" alt="${item.name}">
          </div>
          <div class="cart-item-info">
            <p class="cart-item-name">${item.name}</p>
            <p class="cart-item-option">수량: ${item.qty}개</p>
            <p class="cart-item-price">${formatWon(item.price * item.qty)}</p>
          </div>
          <button class="cart-item-remove" aria-label="삭제" data-id="${item.id}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="cart-qty-control">
          <button class="qty-btn qty-minus" aria-label="수량 감소" data-id="${item.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn qty-plus" aria-label="수량 증가" data-id="${item.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>
      `;
      list.appendChild(itemCard);
    });

    // Event bindings for cart items
    list.querySelectorAll('.qty-minus').forEach((btn) => {
      btn.addEventListener('click', () => updateCartQty(btn.dataset.id, -1));
    });
    list.querySelectorAll('.qty-plus').forEach((btn) => {
      btn.addEventListener('click', () => updateCartQty(btn.dataset.id, 1));
    });
    list.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });
    list.querySelectorAll('.cart-checkbox').forEach((cb) => {
      cb.addEventListener('change', updateSelectAllUI);
    });

    const shipping = productAmount >= 30000 ? 0 : 3000;
    const total = productAmount + shipping;

    const selectAllLabel = document.getElementById('cart-select-all-label');
    if (selectAllLabel) selectAllLabel.textContent = `전체 선택 (${store.cart.length}/${store.cart.length})`;

    updateSelectAllUI();

    const amountLabelEl = document.getElementById('cart-summary-amount-label');
    if (amountLabelEl) amountLabelEl.textContent = `상품 금액 (${totalQty}개)`;

    const amountEl = document.getElementById('cart-summary-amount');
    if (amountEl) amountEl.textContent = formatWon(productAmount);

    const shippingEl = document.getElementById('cart-summary-shipping');
    if (shippingEl) shippingEl.textContent = shipping === 0 ? '무료배송' : `+ ${formatWon(shipping)}`;

    const totalEl = document.getElementById('cart-summary-total-value');
    if (totalEl) totalEl.textContent = formatWon(total);

    if (orderBtn) orderBtn.textContent = `${formatWon(total)} 주문하기`;
  };

  // Cart Global Action Listeners
  const cartSelectAllCheckbox = document.getElementById('cart-select-all-checkbox');
  if (cartSelectAllCheckbox) {
    cartSelectAllCheckbox.addEventListener('change', () => {
      document.querySelectorAll('#cart-item-list .cart-checkbox').forEach((cb) => {
        cb.checked = cartSelectAllCheckbox.checked;
      });
      updateSelectAllUI();
    });
  }

  const cartDeleteSelectedBtn = document.getElementById('cart-delete-selected-btn');
  if (cartDeleteSelectedBtn) {
    cartDeleteSelectedBtn.addEventListener('click', () => {
      const checkedIds = Array.from(document.querySelectorAll('#cart-item-list .cart-checkbox'))
        .filter((cb) => cb.checked)
        .map((cb) => cb.dataset.id);

      if (!checkedIds.length) return;
      store.cart = store.cart.filter((item) => !checkedIds.includes(item.id));
      renderCart();
    });
  }

  const cartOrderBtn = document.getElementById('cart-order-btn');
  if (cartOrderBtn) {
    cartOrderBtn.addEventListener('click', () => {
      if (!store.cart.length) return;
      goToPage('page-checkout');
    });
  }

  // Cart Add Button Handler (Pop Animation)
  document.querySelectorAll('.add-cart-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const card = btn.closest('.product-card');
      if (card) {
        addToCart(getProductInfoFromCard(card));
      }

      btn.classList.remove('is-pop');
      void btn.offsetWidth;
      btn.classList.add('is-active', 'is-pop');
    });

    btn.addEventListener('animationend', () => {
      btn.classList.remove('is-pop', 'is-active');
    });
  });

  renderCart();

  // ==========================================================================
  // 6. WISHLIST MANAGEMENT MODULE
  // ==========================================================================
  const isWished = (id) => store.wishlist.some((item) => item.id === id);

  const syncWishButtons = () => {
    document.querySelectorAll('.wish-btn').forEach((btn) => {
      const info = getProductInfoFromWishBtn(btn);
      if (!info) return;
      const active = isWished(info.id);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-label', active ? '찜 해제' : '찜하기');
    });
  };

  const toggleWishlist = (product) => {
    const existingIndex = store.wishlist.findIndex((item) => item.id === product.id);
    if (existingIndex > -1) {
      store.wishlist.splice(existingIndex, 1);
    } else {
      store.wishlist.push(product);
    }
    syncWishButtons();
    renderWishPage();
  };

  const renderWishPage = () => {
    const list = document.getElementById('wish-item-list');
    if (!list) return;

    const emptyState = document.getElementById('wish-empty-state');
    const emptyTitle = document.getElementById('wish-empty-title');
    const emptyDesc = document.getElementById('wish-empty-desc');
    const topBar = document.getElementById('wish-top-bar');
    const countEl = document.getElementById('wish-count');
    const mypageCountEl = document.getElementById('mypage-wish-count');

    if (mypageCountEl) mypageCountEl.textContent = store.wishlist.length;

    const query = store.wishSearchQuery.trim().toLowerCase();
    let visible = query
      ? store.wishlist.filter((item) => item.name.toLowerCase().includes(query))
      : store.wishlist.slice();

    if (store.wishSortNewest) {
      visible = visible.reverse();
    }

    const hasNoWishAtAll = store.wishlist.length === 0;
    const hasNoSearchResult = !hasNoWishAtAll && visible.length === 0;

    if (emptyState) emptyState.style.display = (hasNoWishAtAll || hasNoSearchResult) ? 'flex' : 'none';
    if (topBar) topBar.style.display = (hasNoWishAtAll || hasNoSearchResult) ? 'none' : 'flex';

    if (hasNoSearchResult) {
      if (emptyTitle) emptyTitle.textContent = '검색 결과가 없어요';
      if (emptyDesc) emptyDesc.textContent = '다른 검색어로 다시 시도해보세요.';
    } else {
      if (emptyTitle) emptyTitle.textContent = '찜한 상품이 없어요';
      if (emptyDesc) emptyDesc.textContent = '마음에 드는 상품을 찜해보세요.';
    }

    if (countEl) countEl.textContent = `총 ${visible.length}개`;

    list.innerHTML = '';
    if (visible.length === 0) return;

    visible.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="product-thumb">
          <button class="icon-btn wish-btn is-active" aria-label="찜 해제">
            <svg class="icon-heart" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z" />
            </svg>
          </button>
          <img src="${item.image}" alt="${item.name}">
        </div>
        <p class="product-brand">LOCKNLOCK</p>
        <p class="product-name">${item.name}</p>
        <p class="product-price">${formatWon(item.price)}</p>
      `;
      list.appendChild(card);
    });
  };

  // Wishlist Search & Sort
  const wishSearchBtn = document.getElementById('wish-search-btn');
  const wishSearchRow = document.getElementById('wish-search-row');
  const wishSearchInput = document.getElementById('wish-search-input');
  const wishSearchClose = document.getElementById('wish-search-close');

  if (wishSearchBtn && wishSearchRow) {
    wishSearchBtn.addEventListener('click', () => {
      const isOpen = wishSearchRow.style.display !== 'none';
      wishSearchRow.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen && wishSearchInput) wishSearchInput.focus();
    });
  }

  if (wishSearchInput) {
    wishSearchInput.addEventListener('input', () => {
      store.wishSearchQuery = wishSearchInput.value;
      renderWishPage();
    });
  }

  if (wishSearchClose && wishSearchRow && wishSearchInput) {
    wishSearchClose.addEventListener('click', () => {
      wishSearchInput.value = '';
      store.wishSearchQuery = '';
      wishSearchRow.style.display = 'none';
      renderWishPage();
    });
  }

  const wishSortDropdown = document.querySelector('.wish-sort-dropdown');
  if (wishSortDropdown) {
    const wishSortLabel = wishSortDropdown.querySelector('.wish-sort-trigger-label');
    const wishSortOptions = wishSortDropdown.querySelectorAll('.sort-option');

    wishSortOptions.forEach((option) => {
      option.addEventListener('click', () => {
        wishSortOptions.forEach((o) => o.classList.remove('is-active'));
        option.classList.add('is-active');

        const value = option.getAttribute('data-wish-sort-value');
        store.wishSortNewest = value === 'newest';
        if (wishSortLabel) wishSortLabel.textContent = option.textContent;
        wishSortDropdown.classList.remove('is-open');
        renderWishPage();
      });
    });
  }

  // Global Wish Button Click Listener (Event Delegation)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.wish-btn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const info = getProductInfoFromWishBtn(btn);
    if (!info) return;
    toggleWishlist(info);

    if (btn.classList.contains('pd-wish-btn') && isWished(info.id)) {
      showToast('찜 목록에 추가되었습니다');
    }
  });

  renderWishPage();

  // ==========================================================================
  // 7. RECENTLY VIEWED PRODUCTS MODULE
  // ==========================================================================
  const addToRecentlyViewed = (info) => {
    if (!info) return;
    store.recentlyViewed = store.recentlyViewed.filter((item) => item.id !== info.id);
    store.recentlyViewed.unshift(info);
    if (store.recentlyViewed.length > 10) {
      store.recentlyViewed = store.recentlyViewed.slice(0, 10);
    }
    renderRecentPage();
  };

  const renderRecentPage = () => {
    const list = document.getElementById('recent-item-list');
    if (!list) return;

    const emptyState = document.getElementById('recent-empty-state');
    const countEl = document.getElementById('recent-count');
    const mypageCountEl = document.getElementById('mypage-recent-count');
    const isEmpty = store.recentlyViewed.length === 0;

    if (countEl) countEl.textContent = `(${store.recentlyViewed.length})`;
    if (mypageCountEl) mypageCountEl.textContent = store.recentlyViewed.length;
    list.style.display = isEmpty ? 'none' : '';
    if (emptyState) emptyState.style.display = isEmpty ? 'flex' : 'none';

    list.innerHTML = '';
    if (isEmpty) return;

    store.recentlyViewed.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'recent-item product-card';
      article.innerHTML = `
        <div class="recent-item-thumb product-thumb">
          <img src="${item.image}" alt="${item.alt}">
        </div>
        <div class="recent-item-body">
          <p class="product-brand">${item.brand}</p>
          <p class="product-name">${item.nameHtml}</p>
          <p class="product-rating">${item.ratingHtml}</p>
          <p class="product-price">${item.priceHtml}</p>
        </div>
        <div class="recent-item-actions">
          <button class="icon-btn wish-btn" aria-label="찜하기">
            <svg class="icon-heart" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z" />
            </svg>
          </button>
          <button class="icon-btn add-cart-btn recent-cart-btn" aria-label="장바구니 담기">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>
        </div>
      `;
      list.appendChild(article);
    });

    list.querySelectorAll('.add-cart-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('.product-card');
        if (card) addToCart(getProductInfoFromCard(card));

        btn.classList.remove('is-pop');
        void btn.offsetWidth;
        btn.classList.add('is-active', 'is-pop');
      });

      btn.addEventListener('animationend', () => {
        btn.classList.remove('is-pop', 'is-active');
      });
    });

    syncWishButtons();
  };

  const recentClearBtn = document.querySelector('.recent-clear-btn');
  if (recentClearBtn) {
    recentClearBtn.addEventListener('click', () => {
      store.recentlyViewed = [];
      renderRecentPage();
    });
  }

  renderRecentPage();

  // ==========================================================================
  // 8. SIDEBAR DRAWER MENU MODULE
  // ==========================================================================
  const drawer = document.getElementById('drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const drawerCloseBtn = document.getElementById('drawer-close');

  const openDrawer = () => {
    if (drawer && drawerOverlay) {
      drawer.classList.add('is-open');
      drawerOverlay.classList.add('is-open');
    }
  };

  const closeDrawer = () => {
    if (drawer && drawerOverlay) {
      drawer.classList.remove('is-open');
      drawerOverlay.classList.remove('is-open');
    }
  };

  document.querySelectorAll('.menu-btn').forEach((btn) => {
    btn.addEventListener('click', openDrawer);
  });
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  // ==========================================================================
  // 9. PRODUCT DETAIL PAGE NAVIGATION & CAROUSEL
  // ==========================================================================
  const detailPage = document.getElementById('page-product-detail');

  if (detailPage) {
    const detailImg = detailPage.querySelector('.pd-gallery-img');
    const detailBrand = detailPage.querySelector('.pd-brand');
    const detailName = detailPage.querySelector('.pd-name');
    const detailRating = detailPage.querySelector('.pd-rating');
    const detailDiscount = detailPage.querySelector('.pd-discount');
    const detailPrice = detailPage.querySelector('.pd-price');
    const detailPriceOriginal = detailPage.querySelector('.pd-price-original');
    const detailQtyValue = detailPage.querySelector('.pd-qty-control .qty-value');
    const detailQtyMinus = detailPage.querySelector('.pd-qty-control .qty-btn:first-child');
    const detailQtyPlus = detailPage.querySelector('.pd-qty-control .qty-btn:last-child');
    const detailDots = detailPage.querySelectorAll('.pd-dot');

    if (detailQtyMinus && detailQtyValue) {
      detailQtyMinus.addEventListener('click', () => {
        const val = parseInt(detailQtyValue.textContent, 10) || 1;
        if (val > 1) detailQtyValue.textContent = val - 1;
      });
    }
    if (detailQtyPlus && detailQtyValue) {
      detailQtyPlus.addEventListener('click', () => {
        const val = parseInt(detailQtyValue.textContent, 10) || 1;
        detailQtyValue.textContent = val + 1;
      });
    }

    // Product Card Click Navigation (Event Delegation)
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;
      if (e.target.closest('.wish-btn') || e.target.closest('.add-cart-btn')) return;

      const cardImg = card.querySelector('.product-thumb img');
      const cardBrand = card.querySelector('.product-brand');
      const cardName = card.querySelector('.product-name');
      const cardRating = card.querySelector('.product-rating');
      const cardPriceEl = card.querySelector('.product-price');
      const cardDiscountEl = card.querySelector('.discount');
      const cardOriginalEl = card.querySelector('.price-strike, .product-price-original s');

      if (cardImg && detailImg) {
        detailImg.src = cardImg.getAttribute('src');
        detailImg.alt = cardImg.getAttribute('alt') || '';
      }
      if (cardBrand && detailBrand) {
        detailBrand.textContent = cardBrand.textContent.trim();
      }
      if (cardName && detailName) {
        detailName.textContent = cardName.innerHTML.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
      }
      if (cardRating && detailRating) {
        detailRating.innerHTML = cardRating.innerHTML;
      }

      let priceNumber = null;
      if (cardPriceEl) {
        const priceClone = cardPriceEl.cloneNode(true);
        priceClone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
        priceNumber = parseNumber(priceClone.textContent);
      }
      const discountText = cardDiscountEl ? cardDiscountEl.textContent.trim() : '';
      const originalNumber = cardOriginalEl ? parseNumber(cardOriginalEl.textContent) : null;

      if (priceNumber !== null) {
        if (detailPrice) detailPrice.childNodes[0].textContent = priceNumber.toLocaleString('ko-KR');
        if (detailDiscount) {
          detailDiscount.textContent = discountText;
          detailDiscount.style.display = discountText ? '' : 'none';
        }
        if (detailPriceOriginal) {
          if (discountText) {
            const percent = parseInt(discountText, 10);
            const fallbackOriginal = percent ? Math.round(priceNumber / (1 - percent / 100) / 100) * 100 : null;
            const original = originalNumber || fallbackOriginal;
            detailPriceOriginal.style.display = '';
            detailPriceOriginal.childNodes[0].textContent = original ? original.toLocaleString('ko-KR') : priceNumber.toLocaleString('ko-KR');
          } else {
            detailPriceOriginal.style.display = 'none';
          }
        }
      }

      if (detailQtyValue) detailQtyValue.textContent = '1';
      detailDots.forEach((dot, i) => dot.classList.toggle('is-active', i === 0));

      addToRecentlyViewed({
        id: cardName ? cardName.textContent.replace(/\s+/g, ' ').trim() : '상품',
        image: cardImg ? cardImg.getAttribute('src') : '',
        alt: cardImg ? cardImg.getAttribute('alt') || '' : '',
        brand: cardBrand ? cardBrand.textContent.trim() : 'LOCKNLOCK',
        nameHtml: cardName ? cardName.innerHTML : '',
        ratingHtml: cardRating ? cardRating.innerHTML : '',
        priceHtml: cardPriceEl ? cardPriceEl.innerHTML : '',
      });

      goToPage('page-product-detail');
      closeDrawer();
    });

    const getProductInfoFromDetailPage = () => {
      const name = detailName ? detailName.textContent.replace(/\s+/g, ' ').trim() : '상품';
      const image = detailImg ? detailImg.getAttribute('src') : '';
      let price = 0;
      if (detailPrice) {
        price = parseNumber(detailPrice.textContent);
      }
      return { id: name, name, image, price };
    };

    const detailCartBtn = detailPage.querySelector('.pd-cart-btn');
    if (detailCartBtn) {
      detailCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const info = getProductInfoFromDetailPage();
        if (!info) return;
        const qty = detailQtyValue ? (parseInt(detailQtyValue.textContent, 10) || 1) : 1;
        addToCart(info, qty);
        showToast('장바구니에 추가되었습니다');

        detailCartBtn.classList.remove('is-pop');
        void detailCartBtn.offsetWidth;
        detailCartBtn.classList.add('is-pop');
      });

      detailCartBtn.addEventListener('animationend', () => {
        detailCartBtn.classList.remove('is-pop');
      });
    }

    const detailBuyBtn = detailPage.querySelector('.pd-buy-btn');
    if (detailBuyBtn) {
      detailBuyBtn.addEventListener('click', () => {
        const info = getProductInfoFromDetailPage();
        if (!info) return;
        const qty = detailQtyValue ? (parseInt(detailQtyValue.textContent, 10) || 1) : 1;
        goToPage('page-checkout');
        renderCheckoutSummary([{ ...info, qty }]);
      });
    }
  }

  // Dropdown Toggles (Sort / Price Dropdowns)
  const dropdowns = document.querySelectorAll('[data-dropdown]');
  const closeAllDropdowns = (except) => {
    dropdowns.forEach((dd) => {
      if (dd !== except) dd.classList.remove('is-open');
    });
  };

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector('[data-dropdown-trigger]');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !dropdown.classList.contains('is-open');
      closeAllDropdowns(dropdown);
      dropdown.classList.toggle('is-open', willOpen);
    });
  });

  document.addEventListener('click', () => closeAllDropdowns());
  document.querySelectorAll('[data-dropdown-panel]').forEach((panel) => {
    panel.addEventListener('click', (e) => e.stopPropagation());
  });

  // Category & Product List Page Sorting / Filtering
  const findProductGrid = (dropdown) => {
    const container = dropdown.closest('.app-main') || dropdown.closest('.page-section');
    return container ? container.querySelector('.product-grid') : null;
  };

  document.querySelectorAll('.sort-dropdown:not(.wish-sort-dropdown)').forEach((sortDropdown) => {
    const label = sortDropdown.querySelector('.sort-trigger-label');
    const options = sortDropdown.querySelectorAll('.sort-option');
    const grid = findProductGrid(sortDropdown);
    const originalOrder = grid ? Array.from(grid.children) : [];

    const getCardPrice = (card) => {
      const priceEl = card.querySelector('.product-price');
      if (!priceEl) return 0;
      const clone = priceEl.cloneNode(true);
      clone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
      return parseNumber(clone.textContent);
    };

    const getCardReviewCount = (card) => {
      const el = card.querySelector('.review-count');
      return el ? parseNumber(el.textContent) : 0;
    };

    options.forEach((option) => {
      option.addEventListener('click', () => {
        options.forEach((o) => o.classList.remove('is-active'));
        option.classList.add('is-active');
        if (label) label.textContent = option.getAttribute('data-sort-value');
        sortDropdown.classList.remove('is-open');

        if (!grid) return;
        const value = option.getAttribute('data-sort-value');
        let cards = Array.from(grid.children);

        if (value === '추천순') {
          cards = originalOrder.slice();
        } else if (value === '판매인기순') {
          cards.sort((a, b) => getCardReviewCount(b) - getCardReviewCount(a));
        } else if (value === '낮은가격순') {
          cards.sort((a, b) => getCardPrice(a) - getCardPrice(b));
        } else if (value === '높은가격순') {
          cards.sort((a, b) => getCardPrice(b) - getCardPrice(a));
        }

        cards.forEach((card) => grid.appendChild(card));
      });
    });
  });

  document.querySelectorAll('.price-dropdown').forEach((priceDropdown) => {
    const presetBtns = priceDropdown.querySelectorAll('.price-preset-btn');
    const applyBtn = priceDropdown.querySelector('.price-apply-btn');
    const triggerLabel = priceDropdown.querySelector('.price-trigger-label');
    const grid = findProductGrid(priceDropdown);

    if (!presetBtns.length) return;

    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        presetBtns.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const activeBtn = priceDropdown.querySelector('.price-preset-btn.is-active') || presetBtns[0];
        const minVal = parseInt(activeBtn.getAttribute('data-min'), 10);
        const maxVal = parseInt(activeBtn.getAttribute('data-max'), 10);

        if (triggerLabel) {
          triggerLabel.textContent = activeBtn.textContent === '전체' ? '가격' : activeBtn.textContent;
        }
        priceDropdown.classList.remove('is-open');

        if (grid) {
          Array.from(grid.children).forEach((card) => {
            const priceEl = card.querySelector('.product-price');
            let price = 0;
            if (priceEl) {
              const clone = priceEl.cloneNode(true);
              clone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
              price = parseNumber(clone.textContent);
            }
            card.style.display = (price >= minVal && price <= maxVal) ? '' : 'none';
          });
        }
      });
    }
  });

  // Category List Search & Shipping Chip Filters
  document.querySelectorAll('.plist-search-btn').forEach((searchBtn) => {
    const header = searchBtn.closest('.app-header');
    const searchRow = header ? header.nextElementSibling : null;
    if (!searchRow || !searchRow.classList.contains('plist-search-row')) return;

    const searchInput = searchRow.querySelector('.plist-search-input');
    const searchClose = searchRow.querySelector('.plist-search-close');
    const pageSection = searchBtn.closest('.page-section');
    const grid = pageSection ? pageSection.querySelector('.product-grid') : null;
    const shippingChip = pageSection ? pageSection.querySelector('.plist-shipping-chip') : null;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.product-card')).map((card) => {
      const nameEl = card.querySelector('.product-name');
      const brandEl = card.querySelector('.product-brand');
      const searchText = `${brandEl ? brandEl.textContent : ''} ${nameEl ? nameEl.textContent : ''}`.toLowerCase();
      return { card, searchText };
    });

    let emptyMessage = grid.parentElement.querySelector('.product-empty-message');
    if (!emptyMessage) {
      emptyMessage = document.createElement('p');
      emptyMessage.className = 'product-empty-message';
      grid.insertAdjacentElement('afterend', emptyMessage);
    }

    const applyFilters = () => {
      const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      const todayOnly = !!(shippingChip && shippingChip.classList.contains('is-active'));

      let visibleCount = 0;
      cards.forEach(({ card, searchText }) => {
        const matchesSearch = !query || searchText.includes(query);
        const matchesToday = !todayOnly || !!card.querySelector('.badge--today');
        const show = matchesSearch && matchesToday;
        card.style.display = show ? '' : 'none';
        if (show) visibleCount += 1;
      });

      emptyMessage.textContent = query ? '검색 결과가 없습니다.' : '오늘출발 상품이 없습니다.';
      emptyMessage.style.display = visibleCount === 0 ? 'block' : 'none';
      grid.style.display = visibleCount === 0 ? 'none' : '';
    };

    searchBtn.addEventListener('click', () => {
      const isOpen = searchRow.style.display !== 'none';
      searchRow.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen && searchInput) searchInput.focus();
    });

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (searchClose) {
      searchClose.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchRow.style.display = 'none';
        applyFilters();
      });
    }
    if (shippingChip) {
      shippingChip.addEventListener('click', () => {
        shippingChip.classList.toggle('is-active');
        applyFilters();
      });
    }
  });

  // ==========================================================================
  // 10. HOME PAGE AGGREGATED ENGINE (SEARCH + SORT + PRICE + TODAY CHIP)
  // ==========================================================================
  const homeSection = document.getElementById('page-home');
  const homeProductGrid = homeSection ? homeSection.querySelector('.product-grid') : null;

  if (homeSection && homeProductGrid) {
    const homeSearchForm = homeSection.querySelector('.search-bar');
    const homeSearchInput = homeSearchForm ? homeSearchForm.querySelector('input') : null;
    const homeCountEl = homeSection.querySelector('.filter-count strong');

    const nativeHomeCardData = Array.from(homeProductGrid.querySelectorAll('.product-card')).map((card, index) => {
      const nameEl = card.querySelector('.product-name');
      const brandEl = card.querySelector('.product-brand');
      const priceEl = card.querySelector('.product-price');
      const reviewEl = card.querySelector('.review-count');

      let price = 0;
      if (priceEl) {
        const priceClone = priceEl.cloneNode(true);
        priceClone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
        price = parseNumber(priceClone.textContent);
      }

      const reviews = reviewEl ? parseNumber(reviewEl.textContent) : 0;
      const searchText = `${brandEl ? brandEl.textContent : ''} ${nameEl ? nameEl.textContent : ''}`.toLowerCase();

      return { card, index, price, reviews, searchText };
    });

    const homeProductNames = new Set(
      nativeHomeCardData.map((data) => {
        const nameEl = data.card.querySelector('.product-name');
        return nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : '';
      })
    );

    const bindHomeExtraCardEvents = (card) => {
      const btn = card.querySelector('.add-cart-btn');
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(getProductInfoFromCard(card));
        btn.classList.remove('is-pop');
        void btn.offsetWidth;
        btn.classList.add('is-active', 'is-pop');
      });
      btn.addEventListener('animationend', () => {
        btn.classList.remove('is-pop', 'is-active');
      });
    };

    const extraHomeCardData = [];
    const seenOtherNames = new Set();
    Array.from(document.querySelectorAll('.page-product-list .product-grid .product-card')).forEach((sourceCard) => {
      const nameEl = sourceCard.querySelector('.product-name');
      const name = nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : '';
      if (!name || homeProductNames.has(name) || seenOtherNames.has(name)) return;
      seenOtherNames.add(name);

      const card = sourceCard.cloneNode(true);
      card.classList.add('is-extra-category-card');
      bindHomeExtraCardEvents(card);
      homeProductGrid.appendChild(card);

      const brandEl = card.querySelector('.product-brand');
      const priceEl = card.querySelector('.product-price');
      const reviewEl = card.querySelector('.review-count');

      let price = 0;
      if (priceEl) {
        const priceClone = priceEl.cloneNode(true);
        priceClone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
        price = parseNumber(priceClone.textContent);
      }

      const reviews = reviewEl ? parseNumber(reviewEl.textContent) : 0;
      const searchText = `${brandEl ? brandEl.textContent : ''} ${card.querySelector('.product-name') ? card.querySelector('.product-name').textContent : ''}`.toLowerCase();

      extraHomeCardData.push({
        card,
        index: nativeHomeCardData.length + extraHomeCardData.length,
        price,
        reviews,
        searchText,
      });
    });

    const homeCardData = nativeHomeCardData.concat(extraHomeCardData);

    let homeEmptyMessage = homeProductGrid.parentElement.querySelector('.product-empty-message');
    if (!homeEmptyMessage) {
      homeEmptyMessage = document.createElement('p');
      homeEmptyMessage.className = 'product-empty-message';
      homeEmptyMessage.textContent = '검색 결과가 없습니다.';
      homeProductGrid.insertAdjacentElement('afterend', homeEmptyMessage);
    }

    let homeSortValue = '추천순';
    let homePriceFilterActive = false;
    let homePriceMin = 5000;
    let homePriceMax = 50000;
    let homeTodayOnly = false;

    const renderHomeProducts = () => {
      const query = homeSearchInput ? homeSearchInput.value.trim().toLowerCase() : '';

      let visible = homeCardData.filter((data) => {
        const matchesSearch = !query || data.searchText.includes(query);
        const matchesPrice = !homePriceFilterActive || (data.price >= homePriceMin && data.price <= homePriceMax);
        const matchesToday = !homeTodayOnly || !!data.card.querySelector('.badge--today');
        return matchesSearch && matchesPrice && matchesToday;
      });

      visible = visible.slice().sort((a, b) => {
        if (homeSortValue === '판매인기순') return b.reviews - a.reviews;
        if (homeSortValue === '낮은가격순') return a.price - b.price;
        if (homeSortValue === '높은가격순') return b.price - a.price;
        return a.index - b.index;
      });

      homeCardData.forEach((data) => { data.card.style.display = 'none'; });
      visible.forEach((data) => {
        data.card.style.display = '';
        homeProductGrid.appendChild(data.card);
      });

      if (homeCountEl) homeCountEl.textContent = visible.length;
      if (visible.length === 0) {
        homeEmptyMessage.textContent = query ? '검색 결과가 없습니다.' : '오늘출발 상품이 없습니다.';
      }
      homeEmptyMessage.style.display = visible.length === 0 ? 'block' : 'none';
      homeProductGrid.style.display = visible.length === 0 ? 'none' : '';
    };

    if (homeSearchInput) homeSearchInput.addEventListener('input', renderHomeProducts);
    if (homeSearchForm) {
      homeSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        renderHomeProducts();
      });
    }

    const homeSortDropdown = homeSection.querySelector('.sort-dropdown');
    if (homeSortDropdown) {
      homeSortDropdown.querySelectorAll('.sort-option').forEach((option) => {
        option.addEventListener('click', () => {
          homeSortValue = option.getAttribute('data-sort-value');
          renderHomeProducts();
        });
      });
    }

    const homePriceDropdown = homeSection.querySelector('.price-dropdown');
    if (homePriceDropdown) {
      const applyBtn = homePriceDropdown.querySelector('.price-apply-btn');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          const activeBtn = homePriceDropdown.querySelector('.price-preset-btn.is-active');
          if (!activeBtn) return;
          homePriceFilterActive = activeBtn.textContent !== '전체';
          homePriceMin = parseInt(activeBtn.getAttribute('data-min'), 10);
          homePriceMax = parseInt(activeBtn.getAttribute('data-max'), 10);
          renderHomeProducts();
        });
      }
    }

    const homeShippingChip = homeSection.querySelector('.home-shipping-chip');
    if (homeShippingChip) {
      homeShippingChip.addEventListener('click', () => {
        homeTodayOnly = !homeTodayOnly;
        homeShippingChip.classList.toggle('is-active', homeTodayOnly);
        renderHomeProducts();
      });
    }

    renderHomeProducts();
  }

  // ==========================================================================
  // 11. CHECKOUT SUMMARY & TOSSPAYMENTS MODULE
  // ==========================================================================
  const updateCheckoutSummaryCard = (productAmount, shipping, total) => {
    const summaryProduct = document.getElementById('checkout-summary-product');
    const summaryShipping = document.getElementById('checkout-summary-shipping');
    const summaryDiscount = document.getElementById('checkout-summary-discount');
    const summaryTotal = document.getElementById('checkout-summary-total');
    const submitBtn = document.getElementById('checkout-pay-submit-btn');

    if (summaryProduct) summaryProduct.textContent = formatWon(productAmount);
    if (summaryShipping) summaryShipping.textContent = shipping === 0 ? '무료배송' : `+ ${formatWon(shipping)}`;
    if (summaryDiscount) summaryDiscount.textContent = '0원';
    if (summaryTotal) summaryTotal.textContent = formatWon(total);

    if (submitBtn) {
      const methodText = store.selectedPayMethod === '토스페이' ? '토스페이로' : store.selectedPayMethod === '카드' ? '카드' : '무통장';
      submitBtn.textContent = `${formatWon(total)} ${methodText} 결제하기`;
    }
  };

  const renderCheckoutSummary = (items = store.cart) => {
    store.checkoutItems = items;
    const thumbEl = document.querySelector('.checkout-order-thumb');
    const nameEl = document.querySelector('.checkout-order-name');
    const priceEl = document.querySelector('.checkout-order-price');
    const listEl = document.getElementById('checkout-order-list');
    if (!thumbEl || !nameEl || !priceEl) return;

    if (listEl) {
      listEl.style.display = 'none';
      listEl.innerHTML = '';
    }

    if (items.length === 0) {
      thumbEl.removeAttribute('src');
      nameEl.innerHTML = '담긴 상품이 없어요';
      priceEl.textContent = '0원';
      store.checkoutTotal = 0;
      updateCheckoutSummaryCard(0, 0, 0);
      return;
    }

    const first = items[0];
    thumbEl.src = first.image;
    thumbEl.alt = first.name;

    const extraCount = items.length - 1;
    const hasMultiple = items.length >= 2;

    nameEl.innerHTML = hasMultiple
      ? `${first.name} 외 ${extraCount}건 <span class="chip-arrow" id="checkout-order-toggle"><svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1L5 5L9 1" stroke-linecap="round" stroke-linejoin="round" /></svg></span>`
      : first.name;

    const productAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = productAmount >= 30000 ? 0 : 3000;
    const total = productAmount + shipping;
    store.checkoutTotal = total;

    priceEl.textContent = formatWon(total);

    if (listEl && hasMultiple) {
      listEl.innerHTML = items.map((item) => `
        <div class="checkout-order-list-item">
          <img src="${item.image}" alt="${item.name}" class="checkout-order-list-thumb">
          <div class="checkout-order-list-info">
            <p class="checkout-order-list-name">${item.name}</p>
            <p class="checkout-order-list-meta">수량 ${item.qty}개 · ${formatWon(item.price * item.qty)}</p>
          </div>
        </div>
      `).join('');
    }

    updateCheckoutSummaryCard(productAmount, shipping, total);
  };

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('#checkout-order-toggle');
    if (!toggle) return;

    const listEl = document.getElementById('checkout-order-list');
    if (!listEl) return;

    const isOpen = listEl.style.display !== 'none';
    listEl.style.display = isOpen ? 'none' : 'flex';
    toggle.classList.toggle('is-open', !isOpen);
  });

  const checkoutSection = document.getElementById('page-checkout');
  if (checkoutSection) {
    const agreeAllLabel = checkoutSection.querySelector('.checkout-agree-all');
    const agreeAllCheckbox = agreeAllLabel ? agreeAllLabel.querySelector('input[type="checkbox"]') : null;
    const agreeItems = checkoutSection.querySelectorAll('.checkout-agree-item input[type="checkbox"]');

    if (agreeAllCheckbox && agreeItems.length > 0) {
      agreeAllCheckbox.addEventListener('change', () => {
        agreeItems.forEach((checkbox) => { checkbox.checked = agreeAllCheckbox.checked; });
      });

      agreeItems.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          agreeAllCheckbox.checked = Array.from(agreeItems).every((item) => item.checked);
        });
      });

      agreeAllCheckbox.checked = Array.from(agreeItems).every((item) => item.checked);
    }

    const payMethodContainer = document.getElementById('checkout-pay-methods');
    if (payMethodContainer) {
      const methodBtns = payMethodContainer.querySelectorAll('.checkout-pay-method');
      methodBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          methodBtns.forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          store.selectedPayMethod = btn.getAttribute('data-method') || btn.innerText.trim();
          const productAmount = store.checkoutItems.reduce((sum, item) => sum + item.price * item.qty, 0);
          const shipping = (productAmount >= 30000 || productAmount === 0) ? 0 : 3000;
          updateCheckoutSummaryCard(productAmount, shipping, store.checkoutTotal);
        });
      });
    }

    const checkoutPaySubmitBtn = document.getElementById('checkout-pay-submit-btn');
    if (checkoutPaySubmitBtn) {
      checkoutPaySubmitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const agreeItems = checkoutSection.querySelectorAll('.checkout-agree-item input[type="checkbox"]');
        const allRequiredAgreed = Array.from(agreeItems).every((cb) => cb.checked);
        if (!allRequiredAgreed) {
          showAlertModal('필수 약관에 동의해 주세요.');
          return;
        }

        if (typeof TossPayments === 'undefined') {
          showAlertModal('토스페이먼츠 결제 모듈을 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.');
          return;
        }

        const receiverInput = document.getElementById('checkout-receiver-name');
        const customerName = (receiverInput && receiverInput.value.trim()) ? receiverInput.value.trim() : '홍길동';

        let orderName = '락앤락 텀블러 주문';
        if (store.checkoutItems.length > 0) {
          const first = store.checkoutItems[0];
          orderName = store.checkoutItems.length > 1
            ? `${first.name} 외 ${store.checkoutItems.length - 1}건`
            : first.name;
        }

        const amount = store.checkoutTotal > 0 ? store.checkoutTotal : 46400;
        const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const tossPayments = TossPayments(TOSS_CLIENT_KEY);
        const baseUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;

        tossPayments.requestPayment(store.selectedPayMethod, {
          amount: amount,
          orderId: orderId,
          orderName: orderName,
          customerName: customerName,
          successUrl: baseUrl + '?payment=success',
          failUrl: baseUrl + '?payment=fail',
        }).catch((error) => {
          if (error.code === 'USER_CANCEL') {
            showToast('결제가 취소되었습니다.');
          } else if (error.code) {
            showAlertModal(`결제 오류: ${error.message || error.code}`);
          }
        });
      });
    }

    // TossPayments URL Redirect Parameters Handler
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success' || urlParams.has('paymentKey')) {
      const orderId = urlParams.get('orderId');
      store.cart = [];
      renderCart();
      const msg = orderId
        ? `토스페이 결제가 성공적으로 완료되었습니다!\n(주문번호: ${orderId})`
        : '토스페이 결제가 성공적으로 완료되었습니다!';
      showAlertModal(msg, () => {
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        goToPage('page-home');
      });
    } else if (urlParams.get('payment') === 'fail' || urlParams.has('code')) {
      const failMessage = urlParams.get('message') || '결제에 실패하였습니다.';
      showAlertModal(`결제 실패: ${failMessage}`, () => {
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      });
    }
  }

  // ==========================================================================
  // 12. FIREBASE AUTH & USER ACCOUNT MANAGEMENT
  // ==========================================================================
  let firebaseAuth = null;
  let googleAuthProvider = null;

  if (typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      firebaseAuth = firebase.auth();
      googleAuthProvider = new firebase.auth.GoogleAuthProvider();
      googleAuthProvider.setCustomParameters({ prompt: 'select_account' });
    } catch (err) {
      console.error('Firebase Auth Init Error:', err);
    }
  }

  const DEFAULT_AVATAR_DRAWER = 'img/Profile Avatar.jpg';
  const DEFAULT_AVATAR_MYPAGE = 'img/avatar.jpg';

  const login = (username, avatarUrl, forcePage) => {
    if (typeof avatarUrl === 'string' && (avatarUrl.startsWith('page-') || avatarUrl === '')) {
      forcePage = avatarUrl;
      avatarUrl = null;
    }

    store.isLoggedIn = true;
    store.currentUser = { displayName: username, photoURL: avatarUrl };

    document.querySelectorAll('.mypage-username, .drawer-username').forEach((el) => {
      el.textContent = username;
    });
    document.querySelectorAll('.mypage-welcome').forEach((el) => {
      el.textContent = `${username}님, 환영합니다.`;
    });

    if (avatarUrl) {
      document.querySelectorAll('.drawer-avatar, .mypage-avatar img').forEach((img) => {
        img.src = avatarUrl;
      });
    }

    document.querySelectorAll('.logged-out-only').forEach((el) => { el.style.display = 'none'; });
    document.querySelectorAll('.logged-in-only').forEach((el) => {
      el.style.display = el.classList.contains('mypage-profile-card') ? 'flex' : '';
    });

    showToast('로그인 성공');

    if (forcePage) {
      goToPage(forcePage, { syncTab: true });
      return;
    }

    if (store.pageHistory.length > 1) {
      store.pageHistory.pop();
      const prevPage = store.pageHistory[store.pageHistory.length - 1];
      const isTabItem = ['page-home', 'page-cart', 'page-wish', 'page-mypage'].includes(prevPage);
      goToPage(prevPage, { syncTab: isTabItem, isBack: true });
    } else {
      goToPage('page-home', { syncTab: true });
    }
  };

  const logout = () => {
    store.isLoggedIn = false;
    store.currentUser = null;

    if (firebaseAuth && firebaseAuth.currentUser) {
      firebaseAuth.signOut().catch((err) => console.error('Firebase Logout Error:', err));
    }

    const drawerAvatar = document.querySelector('.drawer-avatar');
    if (drawerAvatar) drawerAvatar.src = DEFAULT_AVATAR_DRAWER;
    const mypageAvatar = document.querySelector('.mypage-avatar img');
    if (mypageAvatar) mypageAvatar.src = DEFAULT_AVATAR_MYPAGE;

    document.querySelectorAll('.logged-out-only').forEach((el) => { el.style.display = ''; });
    document.querySelectorAll('.logged-in-only').forEach((el) => { el.style.display = 'none'; });

    showToast('로그아웃 완료');
    goToPage('page-home', { syncTab: true });
  };

  const handleGoogleAuth = (targetBtn, forcePage) => {
    if (window.location.protocol === 'file:') {
      if (confirm('Google 실시간 로그인은 HTTP/HTTPS 환경에서 동작합니다.\n\n테스트용 Google 계정으로 로그인하시겠습니까?')) {
        login('Google 테스트 사용자', 'img/Profile Avatar.jpg', forcePage || 'page-home');
      }
      return;
    }

    if (!firebaseAuth || !googleAuthProvider) {
      showToast('Firebase SDK 로드 실패! 인터넷 연결을 확인해주세요.');
      if (confirm('Firebase SDK를 로드할 수 없습니다.\n테스트용 Google 계정으로 로그인하시겠습니까?')) {
        login('Google 테스트 사용자', 'img/Profile Avatar.jpg', forcePage || 'page-home');
      }
      return;
    }

    const originalContent = targetBtn ? targetBtn.innerHTML : '';
    if (targetBtn) {
      targetBtn.disabled = true;
      targetBtn.innerHTML = `<span class="login-spinner"></span> 로그인 중...`;
    }

    firebaseAuth.signInWithPopup(googleAuthProvider)
      .then((result) => {
        const user = result.user;
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Google 사용자');
        const photoURL = user.photoURL || null;
        login(displayName, photoURL, forcePage);
      })
      .catch((error) => {
        console.error('Google Auth Error:', error);
        let errorMsg = `구글 로그인 실패: ${error.message || '인증 오류'}`;
        let shouldOfferFallback = false;

        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
          showToast('구글 로그인이 취소되었습니다.');
          return;
        } else if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/operation-not-supported-in-this-environment') {
          shouldOfferFallback = true;
        } else {
          shouldOfferFallback = true;
        }

        showToast(errorMsg);
        if (shouldOfferFallback) {
          setTimeout(() => {
            if (confirm(`${errorMsg}\n\n테스트용 Google 계정으로 로그인하시겠습니까?`)) {
              login('Google 테스트 사용자', 'img/Profile Avatar.jpg', forcePage || 'page-home');
            }
          }, 300);
        }
      })
      .finally(() => {
        if (targetBtn) {
          targetBtn.disabled = false;
          targetBtn.innerHTML = originalContent;
        }
      });
  };

  if (firebaseAuth) {
    firebaseAuth.onAuthStateChanged((user) => {
      if (user && !store.isLoggedIn) {
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Google 사용자');
        const photoURL = user.photoURL || null;
        login(displayName, photoURL);
      }
    });
  }

  // Login Form Submission
  const loginForm = document.querySelector('.login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = loginForm.querySelector('.login-input[type="text"]');
      const passwordInput = loginForm.querySelector('.login-input[type="password"]');
      const submitBtn = loginForm.querySelector('.login-submit-btn');

      if (!emailInput || !passwordInput || !submitBtn) return;
      const emailVal = emailInput.value.trim();
      const pwVal = passwordInput.value.trim();

      if (!emailVal || !pwVal) {
        showToast('이메일(아이디)과 비밀번호를 입력해주세요.');
        return;
      }

      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="login-spinner"></span> 로그인 중...`;

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

        const extractedUsername = emailVal.split('@')[0] || '홍길동';
        login(extractedUsername);

        emailInput.value = '';
        passwordInput.value = '';
      }, 1200);
    });
  }

  // Input Clear (X) Buttons
  document.querySelectorAll('.input-clear-btn').forEach((btn) => {
    const targetId = btn.getAttribute('data-target');
    const targetInput = document.getElementById(targetId);
    if (!targetInput) return;

    const syncVisibility = () => {
      btn.style.display = targetInput.value ? 'flex' : 'none';
    };
    syncVisibility();
    targetInput.addEventListener('input', syncVisibility);

    btn.addEventListener('click', () => {
      targetInput.value = '';
      targetInput.focus();
      syncVisibility();
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  const googleBtn = document.querySelector('.login-google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleGoogleAuth(googleBtn, 'page-home');
    });
  }

  // Global Click Handlers for Auth / Navigation Links
  document.addEventListener('click', (e) => {
    const subGoogleBtn = e.target.closest('.btn-google-login');
    if (subGoogleBtn) {
      e.preventDefault();
      handleGoogleAuth(subGoogleBtn);
      return;
    }

    const signupBtn = e.target.closest('.btn-signup') || e.target.closest('.login-signup-link');
    if (signupBtn) {
      e.preventDefault();
      goToPage('page-signup');
      closeDrawer();
      return;
    }

    const loginLink = e.target.closest('.login-link-to-login');
    if (loginLink) {
      e.preventDefault();
      goToPage('page-login');
      return;
    }

    const findPwBtn = e.target.closest('.login-find-pw');
    if (findPwBtn) {
      e.preventDefault();
      showToast('비밀번호 찾기 기능은 준비 중입니다.');
      return;
    }
  });

  // Signup Form Module
  const signupForm = document.querySelector('.signup-form');
  if (signupForm) {
    const emailInput = document.getElementById('signup-email');
    const pwInput = document.getElementById('signup-password');
    const pwConfirmInput = document.getElementById('signup-password-confirm');
    const emailMessage = document.getElementById('signup-email-message');
    const pwMatchMessage = document.getElementById('signup-password-match-message');
    const checkEmailBtn = document.getElementById('signup-check-email-btn');
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const REGISTERED_EMAILS = ['test@locknlock.com', 'user@example.com', 'hong@gmail.com'];

    let emailCheckedValue = null;
    let emailAvailable = false;

    const setFieldMessage = (el, text, type) => {
      if (!el) return;
      el.textContent = text || '';
      el.classList.remove('is-error', 'is-success');
      if (type === 'error') el.classList.add('is-error');
      if (type === 'success') el.classList.add('is-success');
    };

    const validateEmailFormat = () => {
      const email = emailInput.value.trim();
      emailInput.classList.remove('input-error');
      if (!email) {
        setFieldMessage(emailMessage, '', null);
        return false;
      }
      if (!EMAIL_FORMAT_RE.test(email)) {
        setFieldMessage(emailMessage, '이메일 형식으로 입력해주세요. (예: name@example.com)', 'error');
        return false;
      }
      setFieldMessage(emailMessage, '', null);
      return true;
    };

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        emailCheckedValue = null;
        emailAvailable = false;
        validateEmailFormat();
      });
    }

    if (checkEmailBtn) {
      checkEmailBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (!validateEmailFormat()) {
          emailInput.classList.add('input-error');
          emailInput.focus();
          return;
        }

        const originalText = checkEmailBtn.textContent;
        checkEmailBtn.disabled = true;
        checkEmailBtn.textContent = '확인 중...';
        setFieldMessage(emailMessage, '', null);

        setTimeout(() => {
          checkEmailBtn.disabled = false;
          checkEmailBtn.textContent = originalText;

          const isRegistered = REGISTERED_EMAILS.includes(email.toLowerCase());
          if (isRegistered) {
            emailCheckedValue = null;
            emailAvailable = false;
            emailInput.classList.add('input-error');
            setFieldMessage(emailMessage, '이미 가입된 이메일입니다.', 'error');
          } else {
            emailCheckedValue = email;
            emailAvailable = true;
            setFieldMessage(emailMessage, '사용 가능한 이메일입니다.', 'success');
          }
        }, 600);
      });
    }

    document.querySelectorAll('.signup-toggle-pw-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const targetInput = document.getElementById(targetId);
        if (!targetInput) return;

        const willShow = targetInput.type === 'password';
        targetInput.type = willShow ? 'text' : 'password';
        btn.querySelectorAll('.eye-open').forEach((el) => { el.style.display = willShow ? 'none' : ''; });
        btn.querySelectorAll('.eye-closed').forEach((el) => { el.style.display = willShow ? '' : 'none'; });
      });
    });

    const validatePasswordMatch = () => {
      const pw = pwInput.value;
      const pwConfirm = pwConfirmInput.value;
      pwConfirmInput.classList.remove('input-error');

      if (!pwConfirm) {
        setFieldMessage(pwMatchMessage, '', null);
        return;
      }
      if (pw === pwConfirm) {
        setFieldMessage(pwMatchMessage, '비밀번호가 일치합니다.', 'success');
      } else {
        pwConfirmInput.classList.add('input-error');
        setFieldMessage(pwMatchMessage, '비밀번호가 일치하지 않습니다.', 'error');
      }
    };

    if (pwInput) pwInput.addEventListener('input', validatePasswordMatch);
    if (pwConfirmInput) pwConfirmInput.addEventListener('input', validatePasswordMatch);

    const agreeAllCheckbox = document.getElementById('signup-agree-all');
    const agreeCheckboxes = Array.from(signupForm.querySelectorAll('.signup-agree-item input[type="checkbox"]:not(#signup-agree-all)'));
    const requiredAgreeCheckboxes = Array.from(signupForm.querySelectorAll('.signup-agree-required'));

    if (agreeAllCheckbox) {
      agreeAllCheckbox.addEventListener('change', () => {
        agreeCheckboxes.forEach((cb) => { cb.checked = agreeAllCheckbox.checked; });
        agreeCheckboxes.forEach((cb) => cb.closest('.signup-agree-item').classList.remove('input-error'));
      });
    }

    agreeCheckboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        cb.closest('.signup-agree-item').classList.remove('input-error');
        if (agreeAllCheckbox) {
          agreeAllCheckbox.checked = agreeCheckboxes.every((item) => item.checked);
        }
      });
    });

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      [emailInput, pwInput, pwConfirmInput].forEach((el) => el.classList.remove('input-error'));
      requiredAgreeCheckboxes.forEach((cb) => cb.closest('.signup-agree-item').classList.remove('input-error'));

      const email = emailInput.value.trim();
      const pw = pwInput.value;
      const pwConfirm = pwConfirmInput.value;

      if (!email || !EMAIL_FORMAT_RE.test(email)) {
        emailInput.classList.add('input-error');
        emailInput.focus();
        showToast('올바른 이메일 주소를 입력해주세요.');
        return;
      }
      if (emailCheckedValue !== email || !emailAvailable) {
        emailInput.classList.add('input-error');
        emailInput.focus();
        showToast('이메일 중복확인을 완료해주세요.');
        return;
      }
      if (pw.length < 8) {
        pwInput.classList.add('input-error');
        pwInput.focus();
        showToast('비밀번호는 8자 이상이어야 합니다.');
        return;
      }
      if (pw !== pwConfirm) {
        pwConfirmInput.classList.add('input-error');
        pwConfirmInput.focus();
        showToast('비밀번호가 일치하지 않습니다.');
        return;
      }

      const missingRequired = requiredAgreeCheckboxes.filter((cb) => !cb.checked);
      if (missingRequired.length > 0) {
        missingRequired.forEach((cb) => cb.closest('.signup-agree-item').classList.add('input-error'));
        showToast('필수 약관에 동의해주세요.');
        return;
      }

      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="login-spinner"></span> 가입 처리 중...`;

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

        emailInput.value = '';
        pwInput.value = '';
        pwConfirmInput.value = '';
        setFieldMessage(emailMessage, '', null);
        setFieldMessage(pwMatchMessage, '', null);
        emailCheckedValue = null;
        emailAvailable = false;
        agreeCheckboxes.forEach((cb) => { cb.checked = false; });
        if (agreeAllCheckbox) agreeAllCheckbox.checked = false;

        const username = email.split('@')[0];
        login(username);
        showToast('회원가입 완료! 환영합니다 🎉');
      }, 1200);
    });
  }

  document.querySelectorAll('.btn-logout').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
      closeDrawer();
    });
  });

  // ==========================================================================
  // 13. UNCONNECTED LINKS & BUTTONS FALLBACK HANDLER
  // ==========================================================================
  const CONNECTED_SELECTORS = [
    '[data-page]',
    '[data-dropdown-trigger]',
    '.add-cart-btn',
    '.back-btn',
    '.btn-google-login',
    '.login-google-btn',
    '.signup-check-email-btn',
    '.signup-toggle-pw-btn',
    '.signup-agree-item',
    '.input-clear-btn',
    '.btn-signup',
    '.btn-logout',
    '.cart-delete-selected-btn',
    '.cart-item-remove',
    '.cart-checkbox',
    '#cart-select-all-checkbox',
    '#checkout-order-toggle',
    '#checkout-pay-submit-btn',
    '.checkout-pay-method',
    '.drawer-close-btn',
    '.menu-btn',
    '.pd-color-swatch',
    '.plist-shipping-chip',
    '.plist-search-btn',
    '.plist-search-close',
    '.price-apply-btn',
    '.price-preset-btn',
    '.product-card',
    '.qty-btn',
    '.pd-buy-btn',
    '.pd-cart-btn',
    '.recent-clear-btn',
    '.sort-option',
    '.wish-btn',
    '#wish-search-btn',
    '#wish-search-close',
    '.login-submit-btn',
    '.login-find-pw',
    '.login-link-to-login',
    '.login-signup-link',
    '#alert-modal-confirm',
  ].join(', ');

  document.addEventListener('click', (e) => {
    if (e.target.closest(CONNECTED_SELECTORS)) return;
    const target = e.target.closest('button, a, [role="button"]');
    if (!target) return;
    e.preventDefault();
    showAlertModal('해당 기능은 현재 연결 작업 중입니다. 이용에 불편을 드려 죄송합니다.');
  });

});