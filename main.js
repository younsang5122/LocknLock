// LocknLock 홈 화면 — 탭 네비게이션 & 인터랙션

document.addEventListener('DOMContentLoaded', () => {

  // 모바일 프레임 초기 스크롤 위치를 항상 최상단으로 고정
  const appMain = document.querySelector('.app-main');
  if (appMain) {
    appMain.scrollTop = 0;
  }

  // ==============================
  // 안내 팝업 (기능 연결 준비중 등 공용 알림 모달)
  // ==============================
  const alertModalOverlay = document.getElementById('alert-modal-overlay');
  const alertModalMessage = document.getElementById('alert-modal-message');
  const alertModalConfirmBtn = document.getElementById('alert-modal-confirm');
  let alertModalOnConfirm = null;

  function showAlertModal(message, onConfirm) {
    if (!alertModalOverlay || !alertModalMessage) return;
    alertModalMessage.textContent = message;
    alertModalOnConfirm = typeof onConfirm === 'function' ? onConfirm : null;
    alertModalOverlay.classList.add('show');
  }

  function closeAlertModal() {
    if (!alertModalOverlay) return;
    alertModalOverlay.classList.remove('show');
    const callback = alertModalOnConfirm;
    alertModalOnConfirm = null;
    if (callback) callback();
  }

  if (alertModalConfirmBtn) {
    alertModalConfirmBtn.addEventListener('click', closeAlertModal);
  }
  if (alertModalOverlay) {
    // 팝업 바깥(어두운 배경) 클릭 시에도 닫힘
    alertModalOverlay.addEventListener('click', (e) => {
      if (e.target === alertModalOverlay) closeAlertModal();
    });
  }

  // 장바구니 담기: 실제 장바구니 상태에 추가 + 팝 애니메이션 피드백
  document.querySelectorAll('.add-cart-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const card = btn.closest('.product-card');
      if (card) {
        addToCart(getProductInfoFromCard(card));
      }

      btn.classList.remove('is-pop');
      // 리플로우를 강제해 애니메이션을 매번 재시작
      void btn.offsetWidth;
      btn.classList.add('is-active');
      btn.classList.add('is-pop');
    });

    btn.addEventListener('animationend', () => {
      btn.classList.remove('is-pop');
      btn.classList.remove('is-active');
    });
  });

  // 정렬 버튼 활성화 전환
  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  // ==============================
  // 정렬(추천순) / 가격대 드롭다운
  // ==============================
  const dropdowns = document.querySelectorAll('[data-dropdown]');

  const closeAllDropdowns = (except) => {
    dropdowns.forEach((dd) => {
      if (dd !== except) {
        dd.classList.remove('is-open');
      }
    });
  };

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector('[data-dropdown-trigger]');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !dropdown.classList.contains('is-open');
      closeAllDropdowns();
      dropdown.classList.toggle('is-open', willOpen);
    });
  });

  // 드롭다운 바깥 클릭 시 전체 닫기
  document.addEventListener('click', () => {
    closeAllDropdowns();
  });

  // 드롭다운 패널 내부 클릭은 바깥 클릭으로 전파되지 않도록 처리
  document.querySelectorAll('[data-dropdown-panel]').forEach((panel) => {
    panel.addEventListener('click', (e) => e.stopPropagation());
  });

  // 상품 카드에서 가격만 추출 (할인율·취소선 텍스트는 제외)
  const getCardPrice = (card) => {
    const priceEl = card.querySelector('.product-price');
    if (!priceEl) return 0;
    const clone = priceEl.cloneNode(true);
    clone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
    const digits = clone.textContent.replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  // 상품 카드에서 리뷰 수 추출 (판매인기순 정렬 기준으로 사용)
  const getCardReviewCount = (card) => {
    const el = card.querySelector('.review-count');
    if (!el) return 0;
    const digits = el.textContent.replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  // 정렬/가격 드롭다운과 같은 페이지에 있는 상품 그리드를 찾음
  const findProductGrid = (dropdown) => {
    const container = dropdown.closest('.app-main') || dropdown.closest('.page-section');
    return container ? container.querySelector('.product-grid') : null;
  };

  // 정렬 옵션 선택: 판매인기순 / 낮은가격순 / 높은가격순 / 추천순
  document.querySelectorAll('.sort-dropdown:not(.wish-sort-dropdown)').forEach((sortDropdown) => {
    const label = sortDropdown.querySelector('.sort-trigger-label');
    const options = sortDropdown.querySelectorAll('.sort-option');
    const grid = findProductGrid(sortDropdown);
    // '추천순'으로 되돌릴 수 있도록 최초 카드 순서를 기억해둠
    const originalOrder = grid ? Array.from(grid.children) : [];

    options.forEach((option) => {
      option.addEventListener('click', () => {
        options.forEach((o) => o.classList.remove('is-active'));
        option.classList.add('is-active');
        if (label) {
          label.textContent = option.getAttribute('data-sort-value');
        }
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

  // 가격대 드롭다운: 5,000원 ~ 50,000원 듀얼 레인지 슬라이더
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

        // 선택한 가격대를 벗어나는 상품 카드는 숨김 처리
        if (grid) {
          Array.from(grid.children).forEach((card) => {
            const price = getCardPrice(card);
            card.style.display = (price >= minVal && price <= maxVal) ? '' : 'none';
          });
        }
      });
    }
  });

  // 전체 상품 목록(카테고리) 페이지: 검색 + '오늘출발' 필터를 함께 적용 (페이지별 독립 동작)
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

    // 검색/필터 결과 없음 안내 문구 (최초 1회 생성)
    let emptyMessage = grid.parentElement.querySelector('.product-empty-message');
    if (!emptyMessage) {
      emptyMessage = document.createElement('p');
      emptyMessage.className = 'product-empty-message';
      grid.insertAdjacentElement('afterend', emptyMessage);
    }

    // 검색어 + '오늘출발' 활성 여부를 함께 반영해 카드 표시 여부를 정함
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

    // 검색 아이콘 클릭 → 검색창 토글
    searchBtn.addEventListener('click', () => {
      const isOpen = searchRow.style.display !== 'none';
      searchRow.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen && searchInput) searchInput.focus();
    });

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

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

  // ==============================
  // 페이지 네비게이션: data-page 속성을 가진 모든 요소(탭바 + 드로어 링크 등)에 적용
  // ==============================
  const tabItems = document.querySelectorAll('.tab-item');
  const pageSections = document.querySelectorAll('.page-section');
  const navTriggers = document.querySelectorAll('[data-page]');
  const bottomTabbar = document.querySelector('.bottom-tabbar');

  let pageHistory = ['page-home'];

  const goToPage = (targetPage, options = {}) => {
    const { syncTab = false, isBack = false } = options;

    if (!isBack) {
      const current = pageHistory[pageHistory.length - 1];
      if (current !== targetPage) {
        pageHistory.push(targetPage);
      }
    }

    // 탭 활성화 전환은 탭바 버튼을 직접 눌렀을 때만 반영 (드로어 링크는 기존 탭 상태 유지)
    if (syncTab) {
      tabItems.forEach((t) => {
        t.classList.toggle('is-active', t.getAttribute('data-page') === targetPage);
      });
    }

    // 페이지 전환
    pageSections.forEach((section) => section.classList.remove('is-active'));

    const targetSection = document.getElementById(targetPage);
    if (targetSection) {
      targetSection.classList.add('is-active');
      // 전환 시 스크롤 최상단으로
      const mainArea = targetSection.querySelector('.app-main');
      if (mainArea) {
        mainArea.scrollTop = 0;
      }
      // no-tabbar 페이지(예: 로그인)에서는 하단 탭바를 숨김
      if (bottomTabbar) {
        bottomTabbar.style.display = targetSection.classList.contains('no-tabbar') ? 'none' : '';
      }
      // 결제 페이지로 이동할 때는 주문 상품 정보를 실제 장바구니 내용으로 갱신
      if (targetPage === 'page-checkout') {
        renderCheckoutSummary();
      }
    }
  };

  // 로그인이 필요한 페이지 (비로그인 상태에서 접근 시 안내 팝업 후 로그인 페이지로 이동)
  const LOGIN_REQUIRED_PAGES = ['page-wish', 'page-mypage', 'page-cart'];

  navTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = trigger.getAttribute('data-page');

      if (LOGIN_REQUIRED_PAGES.includes(targetPage) && !isLoggedIn) {
        closeDrawer();
        showAlertModal('로그인이 필요한 서비스입니다.', () => {
          goToPage('page-login');
        });
        return;
      }

      // 탭바 버튼, 헤더의 LOCKNLOCK 로고, 드로어(사이드바)의 LOCKNLOCK 로고를 눌렀을 때는 하단 탭바 활성 상태도 함께 동기화
      const shouldSyncTab = trigger.classList.contains('tab-item')
        || trigger.classList.contains('app-logo')
        || trigger.classList.contains('drawer-logo');
      goToPage(targetPage, { syncTab: shouldSyncTab });
      closeDrawer();
    });

    // span 등 버튼이 아닌 요소는 키보드(Enter/Space)로도 접근 가능하게 처리
    if (trigger.getAttribute('role') === 'button') {
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        }
      });
    }
  });

  // 뒤로가기 버튼 → 이전 페이지로 이동 (없으면 홈으로)
  document.querySelectorAll('.back-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (pageHistory.length > 1) {
        pageHistory.pop(); // 현재 페이지 제거
        const prevPage = pageHistory[pageHistory.length - 1];
        const isTabItem = ['page-home', 'page-cart', 'page-wish', 'page-mypage'].includes(prevPage);
        goToPage(prevPage, { syncTab: isTabItem, isBack: true });
      } else {
        goToPage('page-home', { syncTab: true });
      }
    });
  });

  // ==============================
  // 장바구니 및 결제 (메모리 전용 상태)
  // ==============================
  const TOSS_CLIENT_KEY = 'test_ck_ZLKGPx4M3M4mWowK1x0w8BaWypv1';
  let cart = []; // { id, name, image, price, qty }
  let currentCheckoutItems = [];
  let currentCheckoutTotal = 46400;
  let selectedPayMethod = '토스페이';

  const formatWon = (num) => `${num.toLocaleString('ko-KR')}원`;

  // 홈 상단 장바구니 아이콘의 담긴 수량 뱃지 갱신
  function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    if (totalQty > 0) {
      badge.textContent = totalQty > 99 ? '99+' : totalQty;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  // 상품 카드에서 이름/이미지/가격 정보를 읽어옴 (할인율·취소선 텍스트는 제외)
  function getProductInfoFromCard(card) {
    const nameEl = card.querySelector('.product-name');
    const imgEl = card.querySelector('.product-thumb img');
    const priceEl = card.querySelector('.product-price');

    const name = nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : '상품';
    const image = imgEl ? imgEl.getAttribute('src') : '';

    let price = 0;
    if (priceEl) {
      const clone = priceEl.cloneNode(true);
      clone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
      const digits = clone.textContent.replace(/[^0-9]/g, '');
      price = digits ? parseInt(digits, 10) : 0;
    }

    return { id: name, name, image, price };
  }

  function addToCart(product) {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      // 이미 담긴 상품이면 줄을 추가하지 않고 수량만 증가
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    renderCart();
  }

  function updateCartQty(id, delta) {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter((i) => i.id !== id);
    }
    renderCart();
  }

  function updateCheckoutSummaryCard(productAmount, shipping, total) {
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
      const methodText = selectedPayMethod === '토스페이' ? '토스페이로' : selectedPayMethod === '카드' ? '카드' : '무통장';
      submitBtn.textContent = `${formatWon(total)} ${methodText} 결제하기`;
    }
  }

  // 결제 페이지의 "주문 상품" 및 금액 영역을 채움 (기본은 장바구니 내용, '바로 구매'일 때는 넘겨받은 단일 상품)
  function renderCheckoutSummary(items = cart) {
    currentCheckoutItems = items;
    const thumbEl = document.querySelector('.checkout-order-thumb');
    const nameEl = document.querySelector('.checkout-order-name');
    const priceEl = document.querySelector('.checkout-order-price');
    const listEl = document.getElementById('checkout-order-list');
    if (!thumbEl || !nameEl || !priceEl) return;

    // 펼쳐진 목록은 결제 페이지에 새로 진입할 때마다 접힌 상태로 초기화
    if (listEl) {
      listEl.style.display = 'none';
      listEl.innerHTML = '';
    }

    if (items.length === 0) {
      thumbEl.removeAttribute('src');
      nameEl.innerHTML = '담긴 상품이 없어요';
      priceEl.textContent = '0원';
      currentCheckoutTotal = 0;
      updateCheckoutSummaryCard(0, 0, 0);
      return;
    }

    const first = items[0];
    thumbEl.src = first.image;
    thumbEl.alt = first.name;

    const extraCount = items.length - 1;
    const hasMultiple = items.length >= 2;

    // 2개 이상 담겼을 때만 '외 N건 ⌄' 형태로 펼침 화살표를 보여줌
    nameEl.innerHTML = hasMultiple
      ? `${first.name} 외 ${extraCount}건 <span class="chip-arrow" id="checkout-order-toggle"><svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1L5 5L9 1" stroke-linecap="round" stroke-linejoin="round" /></svg></span>`
      : first.name;

    const productAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = productAmount >= 30000 ? 0 : 3000;
    const total = productAmount + shipping;
    currentCheckoutTotal = total;

    priceEl.textContent = formatWon(total);

    // 펼침 목록 채우기 (2개 이상일 때만 의미가 있음)
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
  }

  // 주문 상품 '외 N건 ⌄' 화살표 클릭 시 전체 상품 목록 펼치기/접기
  // (nameEl.innerHTML이 렌더링마다 새로 그려지므로 이벤트 위임 방식으로 처리)
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('#checkout-order-toggle');
    if (!toggle) return;

    const listEl = document.getElementById('checkout-order-list');
    if (!listEl) return;

    const isOpen = listEl.style.display !== 'none';
    listEl.style.display = isOpen ? 'none' : 'flex';
    toggle.classList.toggle('is-open', !isOpen);
  });

  function removeFromCart(id) {
    cart = cart.filter((i) => i.id !== id);
    renderCart();
  }

  // 전체 선택 체크박스 ↔ 개별 상품 체크박스 상태 동기화
  function updateSelectAllUI() {
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
  }

  // 전체 선택 체크박스 클릭 → 모든 상품 체크박스 상태 일괄 변경 (한 번만 바인딩)
  const cartSelectAllCheckbox = document.getElementById('cart-select-all-checkbox');
  if (cartSelectAllCheckbox) {
    cartSelectAllCheckbox.addEventListener('change', () => {
      document.querySelectorAll('#cart-item-list .cart-checkbox').forEach((cb) => {
        cb.checked = cartSelectAllCheckbox.checked;
      });
      updateSelectAllUI();
    });
  }

  // 선택 삭제 버튼 → 체크된 상품만 장바구니에서 제거 (한 번만 바인딩)
  const cartDeleteSelectedBtn = document.getElementById('cart-delete-selected-btn');
  if (cartDeleteSelectedBtn) {
    cartDeleteSelectedBtn.addEventListener('click', () => {
      const checkedIds = Array.from(document.querySelectorAll('#cart-item-list .cart-checkbox'))
        .filter((cb) => cb.checked)
        .map((cb) => cb.dataset.id);

      if (checkedIds.length === 0) return;

      cart = cart.filter((item) => !checkedIds.includes(item.id));
      renderCart();
    });
  }

  function renderCart() {
    updateCartBadge();

    const list = document.getElementById('cart-item-list');
    if (!list) return; // 장바구니 페이지가 없는 경우 스킵

    const emptyState = document.getElementById('cart-empty-state');
    const selectAllRow = document.getElementById('cart-select-all-row');
    const summaryCard = document.getElementById('cart-summary-card');
    const freeShipping = document.getElementById('cart-free-shipping-note');
    const orderBtn = document.getElementById('cart-order-btn');

    list.innerHTML = '';

    const isEmpty = cart.length === 0;
    if (emptyState) emptyState.style.display = isEmpty ? 'flex' : 'none';
    if (selectAllRow) selectAllRow.style.display = isEmpty ? 'none' : '';
    if (summaryCard) summaryCard.style.display = isEmpty ? 'none' : '';
    if (freeShipping) freeShipping.style.display = isEmpty ? 'none' : '';
    if (orderBtn) orderBtn.style.display = isEmpty ? 'none' : '';

    if (isEmpty) {
      return;
    }

    let totalQty = 0;
    let productAmount = 0;

    cart.forEach((item) => {
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

    // 아이템별 버튼 이벤트 연결
    list.querySelectorAll('.qty-minus').forEach((btn) => {
      btn.addEventListener('click', () => updateCartQty(btn.dataset.id, -1));
    });
    list.querySelectorAll('.qty-plus').forEach((btn) => {
      btn.addEventListener('click', () => updateCartQty(btn.dataset.id, 1));
    });
    list.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });
    list.querySelectorAll('.cart-item-card .cart-checkbox').forEach((cb) => {
      cb.addEventListener('change', updateSelectAllUI);
    });

    // 결제 예상 금액 갱신
    const shipping = productAmount >= 30000 ? 0 : 3000;
    const total = productAmount + shipping;

    const selectAllLabel = document.getElementById('cart-select-all-label');
    if (selectAllLabel) selectAllLabel.textContent = `전체 선택 (${cart.length}/${cart.length})`;

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
  }

  // 초기 렌더 (빈 장바구니 상태 표시)
  renderCart();

  // ==============================
  // 찜하기 (메모리 전용 상태 — 새로고침하면 초기화됨, 기본은 빈 목록)
  // ==============================
  let wishlist = []; // { id, name, image, price }
  let wishSortNewest = true; // true: 최신순(나중에 찜한 순), false: 오래된순(먼저 찜한 순)
  let wishSearchQuery = '';

  // 찜 버튼 하나에서 상품 정보를 읽어옴 (상품 카드형 / 상세페이지형 둘 다 지원)
  function getProductInfoFromWishBtn(btn) {
    const card = btn.closest('.product-card');
    if (card) {
      return getProductInfoFromCard(card);
    }

    // 상세 페이지 하단 고정 찜 버튼
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
        const digits = clone.textContent.replace(/[^0-9]/g, '');
        price = digits ? parseInt(digits, 10) : 0;
      }

      return { id: name, name, image, price };
    }

    return null;
  }

  function isWished(id) {
    return wishlist.some((item) => item.id === id);
  }

  // 같은 상품을 가리키는 모든 찜 버튼(홈/목록/상세/찜페이지)의 활성 상태를 동기화
  function syncWishButtons() {
    document.querySelectorAll('.wish-btn').forEach((btn) => {
      const info = getProductInfoFromWishBtn(btn);
      if (!info) return;
      const active = isWished(info.id);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-label', active ? '찜 해제' : '찜하기');
    });
  }

  function toggleWishlist(product) {
    const existingIndex = wishlist.findIndex((item) => item.id === product.id);
    if (existingIndex > -1) {
      wishlist.splice(existingIndex, 1);
    } else {
      wishlist.push(product);
    }
    syncWishButtons();
    renderWishPage();
  }

  function renderWishPage() {
    const list = document.getElementById('wish-item-list');
    if (!list) return; // 찜 페이지가 없는 경우 스킵

    const emptyState = document.getElementById('wish-empty-state');
    const emptyTitle = document.getElementById('wish-empty-title');
    const emptyDesc = document.getElementById('wish-empty-desc');
    const topBar = document.getElementById('wish-top-bar');
    const countEl = document.getElementById('wish-count');
    const mypageCountEl = document.getElementById('mypage-wish-count');

    if (mypageCountEl) mypageCountEl.textContent = wishlist.length;

    // 검색어로 필터링
    const query = wishSearchQuery.trim().toLowerCase();
    let visible = query
      ? wishlist.filter((item) => item.name.toLowerCase().includes(query))
      : wishlist.slice();

    // 최신순/오래된순 정렬 (배열은 찜한 순서대로 뒤에 쌓이므로, 최신순이면 뒤집는다)
    if (wishSortNewest) {
      visible = visible.reverse();
    }

    const hasNoWishAtAll = wishlist.length === 0;
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
  }

  // 찜 페이지 검색 아이콘 → 검색창 토글
  const wishSearchBtn = document.getElementById('wish-search-btn');
  const wishSearchRow = document.getElementById('wish-search-row');
  const wishSearchInput = document.getElementById('wish-search-input');
  const wishSearchClose = document.getElementById('wish-search-close');

  if (wishSearchBtn && wishSearchRow) {
    wishSearchBtn.addEventListener('click', () => {
      const isOpen = wishSearchRow.style.display !== 'none';
      wishSearchRow.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen && wishSearchInput) {
        wishSearchInput.focus();
      }
    });
  }

  if (wishSearchInput) {
    wishSearchInput.addEventListener('input', () => {
      wishSearchQuery = wishSearchInput.value;
      renderWishPage();
    });
  }

  if (wishSearchClose && wishSearchRow && wishSearchInput) {
    wishSearchClose.addEventListener('click', () => {
      wishSearchInput.value = '';
      wishSearchQuery = '';
      wishSearchRow.style.display = 'none';
      renderWishPage();
    });
  }

  // 찜 페이지 정렬 드롭다운 → 최신순 / 오래된순 선택 (다른 페이지의 정렬 드롭다운과 동일한 방식)
  const wishSortDropdown = document.querySelector('.wish-sort-dropdown');
  if (wishSortDropdown) {
    const wishSortLabel = wishSortDropdown.querySelector('.wish-sort-trigger-label');
    const wishSortOptions = wishSortDropdown.querySelectorAll('.sort-option');

    wishSortOptions.forEach((option) => {
      option.addEventListener('click', () => {
        wishSortOptions.forEach((o) => o.classList.remove('is-active'));
        option.classList.add('is-active');

        const value = option.getAttribute('data-wish-sort-value');
        wishSortNewest = value === 'newest';
        if (wishSortLabel) {
          wishSortLabel.textContent = option.textContent;
        }
        wishSortDropdown.classList.remove('is-open');
        renderWishPage();
      });
    });
  }

  // 찜 버튼 클릭 이벤트 위임: 홈/목록/상세/찜페이지의 모든 찜 버튼(동적으로 새로 생기는 것 포함)을
  // 이 리스너 하나로만 처리한다 (카드별 개별 리스너를 따로 달면 재렌더링 시점과 꼬여
  // 버튼이 DOM에서 already 떨어져나간 상태로 참조되는 문제가 생길 수 있음)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.wish-btn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const info = getProductInfoFromWishBtn(btn);
    if (!info) return;
    toggleWishlist(info);

    // 상품 상세 페이지의 찜 버튼은 페이지 이동 없이 토스트로만 알려줌
    if (btn.classList.contains('pd-wish-btn') && isWished(info.id)) {
      showToast('찜 목록에 추가되었습니다');
    }
  });

  // 초기 렌더 (빈 찜 목록 상태 표시)
  renderWishPage();

  // ==============================
  // 최근 본 상품 (메모리 전용 상태 — 새로고침하면 초기화됨, 기본은 빈 목록)
  // 최신 항목이 맨 앞에 오고, 최대 10개까지만 유지됨
  // ==============================
  let recentlyViewed = [];

  function addToRecentlyViewed(info) {
    if (!info) return;
    // 이미 본 상품이면 기존 항목을 지우고 다시 맨 앞에 추가 (중복 방지 + 최신순 유지)
    recentlyViewed = recentlyViewed.filter((item) => item.id !== info.id);
    recentlyViewed.unshift(info);
    if (recentlyViewed.length > 10) {
      recentlyViewed = recentlyViewed.slice(0, 10);
    }
    renderRecentPage();
  }

  function renderRecentPage() {
    const list = document.getElementById('recent-item-list');
    if (!list) return; // 최근 본 상품 페이지가 없는 경우 스킵

    const emptyState = document.getElementById('recent-empty-state');
    const countEl = document.getElementById('recent-count');
    const mypageCountEl = document.getElementById('mypage-recent-count');
    const isEmpty = recentlyViewed.length === 0;

    if (countEl) countEl.textContent = `(${recentlyViewed.length})`;
    if (mypageCountEl) mypageCountEl.textContent = recentlyViewed.length;
    list.style.display = isEmpty ? 'none' : '';
    if (emptyState) emptyState.style.display = isEmpty ? 'flex' : 'none';

    list.innerHTML = '';
    if (isEmpty) return;

    recentlyViewed.forEach((item) => {
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
            <svg class="icon-heart" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path
                d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z" />
            </svg>
          </button>
          <button class="icon-btn add-cart-btn recent-cart-btn" aria-label="장바구니 담기">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>
        </div>
      `;
      list.appendChild(article);
    });

    // 새로 그려진 카드의 '장바구니 담기' 버튼에도 동일한 담기 동작 연결
    list.querySelectorAll('.add-cart-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const card = btn.closest('.product-card');
        if (card) {
          addToCart(getProductInfoFromCard(card));
        }

        btn.classList.remove('is-pop');
        void btn.offsetWidth;
        btn.classList.add('is-active');
        btn.classList.add('is-pop');
      });

      btn.addEventListener('animationend', () => {
        btn.classList.remove('is-pop');
        btn.classList.remove('is-active');
      });
    });

    // 찜 버튼 활성 상태 동기화 (이미 찜한 상품이면 하트가 채워진 채로 보이도록)
    syncWishButtons();
  }

  // ==============================
  // 최근 본 상품: 전체삭제
  // ==============================
  const recentClearBtn = document.querySelector('.recent-clear-btn');

  if (recentClearBtn) {
    recentClearBtn.addEventListener('click', () => {
      recentlyViewed = [];
      renderRecentPage();
    });
  }

  // 초기 렌더 (빈 최근 본 상품 상태 표시)
  renderRecentPage();


  // ==============================
  // 사이드바 드로어 메뉴 열기/닫기
  // ==============================
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

  // 햄버거 메뉴 버튼(.menu-btn) 클릭 시 드로어 열기
  document.querySelectorAll('.menu-btn').forEach((btn) => {
    btn.addEventListener('click', openDrawer);
  });

  // X 버튼 및 배경 어두운 레이어 클릭 시 드로어 닫기
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeDrawer);
  }

  // ==============================
  // 상품 카드 클릭 → 상품 상세 페이지 이동
  // ==============================
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

    if (detailQtyMinus && detailQtyValue) {
      detailQtyMinus.addEventListener('click', () => {
        const val = parseInt(detailQtyValue.textContent, 10) || 1;
        if (val > 1) {
          detailQtyValue.textContent = val - 1;
        }
      });
    }
    if (detailQtyPlus && detailQtyValue) {
      detailQtyPlus.addEventListener('click', () => {
        const val = parseInt(detailQtyValue.textContent, 10) || 1;
        detailQtyValue.textContent = val + 1;
      });
    }
    const detailDots = detailPage.querySelectorAll('.pd-dot');

    // 가격 텍스트("24,900원" 등)에서 숫자만 추출
    const parsePriceNumber = (text) => {
      const match = text.replace(/,/g, '').match(/(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    };

    // 이벤트 위임 방식으로 처리 (찜/최근 본 상품 페이지처럼 나중에 동적으로 새로 그려지는
    // 카드도 별도 처리 없이 항상 동일하게 상세 페이지로 이동하도록 함)
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;

      // 찜하기 / 장바구니 담기 버튼 클릭 시에는 상세 페이지로 이동하지 않음
      if (e.target.closest('.wish-btn') || e.target.closest('.add-cart-btn')) {
        return;
      }

      // 클릭한 카드에서 정보 추출
      const cardImg = card.querySelector('.product-thumb img');
      const cardBrand = card.querySelector('.product-brand');
      const cardName = card.querySelector('.product-name');
      const cardRating = card.querySelector('.product-rating');
      const cardPriceEl = card.querySelector('.product-price');
      const cardDiscountEl = card.querySelector('.discount');
      const cardOriginalEl = card.querySelector('.price-strike, .product-price-original s');

      // 이미지
      if (cardImg && detailImg) {
        detailImg.src = cardImg.getAttribute('src');
        detailImg.alt = cardImg.getAttribute('alt') || '';
      }

      // 브랜드
      if (cardBrand && detailBrand) {
        detailBrand.textContent = cardBrand.textContent.trim();
      }

      // 상품명 (줄바꿈 <br> 은 공백으로 치환)
      if (cardName && detailName) {
        detailName.textContent = cardName.innerHTML.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
      }

      // 평점
      if (cardRating && detailRating) {
        detailRating.innerHTML = cardRating.innerHTML;
      }

      // 가격 / 할인율 (할인율·취소선 텍스트는 제외하고 실제 판매가만 추출)
      let priceNumber = null;
      if (cardPriceEl) {
        const priceClone = cardPriceEl.cloneNode(true);
        priceClone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
        priceNumber = parsePriceNumber(priceClone.textContent);
      }
      const discountText = cardDiscountEl ? cardDiscountEl.textContent.trim() : '';
      const originalNumber = cardOriginalEl ? parsePriceNumber(cardOriginalEl.textContent) : null;

      if (priceNumber !== null) {
        if (detailPrice) {
          detailPrice.childNodes[0].textContent = priceNumber.toLocaleString('ko-KR');
        }
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

      // 옵션 초기화 (수량 1, 이미지 인디케이터 첫번째로)
      if (detailQtyValue) {
        detailQtyValue.textContent = '1';
      }
      detailDots.forEach((dot, i) => dot.classList.toggle('is-active', i === 0));

      // 클릭한 상품을 '최근 본 상품' 목록 맨 앞에 추가 (최대 10개, 중복 시 최신 위치로 갱신)
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

    // 상세 페이지 정보를 장바구니/구매용 상품 객체로 변환
    function getProductInfoFromDetailPage() {
      const name = detailName ? detailName.textContent.replace(/\s+/g, ' ').trim() : '상품';
      const image = detailImg ? detailImg.getAttribute('src') : '';

      let price = 0;
      if (detailPrice) {
        const digits = detailPrice.textContent.replace(/[^0-9]/g, '');
        price = digits ? parseInt(digits, 10) : 0;
      }

      return { id: name, name, image, price };
    }

    // 장바구니 담기 → 페이지 이동 없이 실제 장바구니에 추가하고 토스트로만 알려줌
    const detailCartBtn = detailPage.querySelector('.pd-cart-btn');
    if (detailCartBtn) {
      detailCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const info = getProductInfoFromDetailPage();
        if (!info) return;
        const qty = detailQtyValue ? (parseInt(detailQtyValue.textContent, 10) || 1) : 1;
        for (let i = 0; i < qty; i += 1) {
          addToCart(info);
        }
        showToast('장바구니에 추가되었습니다');

        // 클릭 피드백: 살짝 튀어오르는 팝 애니메이션
        detailCartBtn.classList.remove('is-pop');
        void detailCartBtn.offsetWidth;
        detailCartBtn.classList.add('is-pop');
      });

      detailCartBtn.addEventListener('animationend', () => {
        detailCartBtn.classList.remove('is-pop');
      });
    }

    // 구매하기 → 장바구니를 거치지 않고 이 상품만으로 바로 결제 페이지로 이동
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

  // ==============================
  // 홈 화면: 상품 검색 + 정렬(추천순/판매인기순/낮은가격순/높은가격순) + 가격대 필터
  // ==============================
  const homeSection = document.getElementById('page-home');
  const homeProductGrid = homeSection ? homeSection.querySelector('.product-grid') : null;

  if (homeSection && homeProductGrid) {
    const homeSearchForm = homeSection.querySelector('.search-bar');
    const homeSearchInput = homeSearchForm ? homeSearchForm.querySelector('input') : null;
    const homeCountEl = homeSection.querySelector('.filter-count strong');

    const parseHomeNumber = (text) => {
      const match = (text || '').replace(/,/g, '').match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };

    // 카드별 검색/정렬/필터용 데이터 캐싱 (최초 1회)
    const homeCardData = Array.from(homeProductGrid.querySelectorAll('.product-card')).map((card, index) => {
      const nameEl = card.querySelector('.product-name');
      const brandEl = card.querySelector('.product-brand');
      const priceEl = card.querySelector('.product-price');
      const reviewEl = card.querySelector('.review-count');

      let price = 0;
      if (priceEl) {
        const priceClone = priceEl.cloneNode(true);
        priceClone.querySelectorAll('.discount, .price-strike').forEach((el) => el.remove());
        price = parseHomeNumber(priceClone.textContent);
      }

      const reviews = reviewEl ? parseHomeNumber(reviewEl.textContent) : 0;
      const searchText = `${brandEl ? brandEl.textContent : ''} ${nameEl ? nameEl.textContent : ''}`
        .toLowerCase();

      return { card, index, price, reviews, searchText };
    });

    // 검색 결과 없음 안내 문구 (최초 1회 생성)
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

    const renderHomeProducts = () => {
      const query = homeSearchInput ? homeSearchInput.value.trim().toLowerCase() : '';

      // 검색어 + 가격대 조건을 모두 만족하는 상품만 추림
      let visible = homeCardData.filter((data) => {
        const matchesSearch = !query || data.searchText.includes(query);
        const matchesPrice = !homePriceFilterActive || (data.price >= homePriceMin && data.price <= homePriceMax);
        return matchesSearch && matchesPrice;
      });

      // 정렬 적용
      visible = visible.slice().sort((a, b) => {
        if (homeSortValue === '판매인기순') return b.reviews - a.reviews;
        if (homeSortValue === '낮은가격순') return a.price - b.price;
        if (homeSortValue === '높은가격순') return b.price - a.price;
        return a.index - b.index; // 추천순 = 기본 진열 순서
      });

      // 전체 카드를 우선 숨긴 뒤, 조건에 맞는 카드만 정렬 순서대로 다시 배치
      homeCardData.forEach((data) => {
        data.card.style.display = 'none';
      });
      visible.forEach((data) => {
        data.card.style.display = '';
        homeProductGrid.appendChild(data.card);
      });

      if (homeCountEl) {
        homeCountEl.textContent = visible.length;
      }
      homeEmptyMessage.style.display = visible.length === 0 ? 'block' : 'none';
      homeProductGrid.style.display = visible.length === 0 ? 'none' : '';
    };

    // 검색창 입력 시 실시간 검색
    if (homeSearchInput) {
      homeSearchInput.addEventListener('input', renderHomeProducts);
    }
    if (homeSearchForm) {
      homeSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        renderHomeProducts();
      });
    }

    // 정렬 옵션(추천순/판매인기순/낮은가격순/높은가격순) 선택 시 실제 정렬 반영
    const homeSortDropdown = homeSection.querySelector('.sort-dropdown');
    if (homeSortDropdown) {
      homeSortDropdown.querySelectorAll('.sort-option').forEach((option) => {
        option.addEventListener('click', () => {
          homeSortValue = option.getAttribute('data-sort-value');
          renderHomeProducts();
        });
      });
    }

    // 가격대 '적용' 클릭 시 실제 가격 필터 반영 (검색 결과 안에서만 필터링)
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

    renderHomeProducts();
  }

  // ==============================
  // 결제 화면: 전체 동의 및 개별 약관 동의 체크박스 연동
  // ==============================
  const checkoutSection = document.getElementById('page-checkout');
  if (checkoutSection) {
    const agreeAllLabel = checkoutSection.querySelector('.checkout-agree-all');
    const agreeAllCheckbox = agreeAllLabel ? agreeAllLabel.querySelector('input[type="checkbox"]') : null;
    const agreeItems = checkoutSection.querySelectorAll('.checkout-agree-item input[type="checkbox"]');

    if (agreeAllCheckbox && agreeItems.length > 0) {
      // 1. 전체 동의 체크박스 변경 시 -> 하위 체크박스 상태 일괄 변경
      agreeAllCheckbox.addEventListener('change', () => {
        const isChecked = agreeAllCheckbox.checked;
        agreeItems.forEach((checkbox) => {
          checkbox.checked = isChecked;
        });
      });

      // 2. 개별 체크박스 변경 시 -> 전체 동의 체크박스 상태 업데이트
      agreeItems.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          const allChecked = Array.from(agreeItems).every((item) => item.checked);
          agreeAllCheckbox.checked = allChecked;
        });
      });

      // 3. 초기 로드 상태 동기화 (개별 동의 체크가 모두 되어 있다면 전체 동의도 체크)
      const allChecked = Array.from(agreeItems).every((item) => item.checked);
      agreeAllCheckbox.checked = allChecked;
    }

    // 결제 수단 선택 버튼 탭 전환
    const payMethodContainer = document.getElementById('checkout-pay-methods');
    if (payMethodContainer) {
      const methodBtns = payMethodContainer.querySelectorAll('.checkout-pay-method');
      methodBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          methodBtns.forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          selectedPayMethod = btn.getAttribute('data-method') || btn.innerText.trim();
          const productAmount = currentCheckoutItems.reduce((sum, item) => sum + item.price * item.qty, 0);
          const shipping = (productAmount >= 30000 || productAmount === 0) ? 0 : 3000;
          updateCheckoutSummaryCard(productAmount, shipping, currentCheckoutTotal);
        });
      });
    }

    // 토스페이 / 토스페이먼츠 결제 버튼 클릭 시 결제창 띄우기
    const checkoutPaySubmitBtn = document.getElementById('checkout-pay-submit-btn');
    if (checkoutPaySubmitBtn) {
      checkoutPaySubmitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 필수 약관 동의 체크
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

        // 받는 분 이름
        const receiverInput = document.getElementById('checkout-receiver-name');
        const customerName = (receiverInput && receiverInput.value.trim()) ? receiverInput.value.trim() : '홍길동';

        // 주문명 생성
        let orderName = '메트로 머그 475ml (네이비) 외 1건';
        if (currentCheckoutItems.length > 0) {
          const first = currentCheckoutItems[0];
          orderName = currentCheckoutItems.length > 1
            ? `${first.name} 외 ${currentCheckoutItems.length - 1}건`
            : first.name;
        }

        const amount = currentCheckoutTotal > 0 ? currentCheckoutTotal : 46400;
        const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const tossPayments = TossPayments(TOSS_CLIENT_KEY);
        const baseUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;

        tossPayments.requestPayment(selectedPayMethod, {
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

    // URL 결제 결과 파라미터 처리 (성공/실패 피드백)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success' || urlParams.has('paymentKey')) {
      const orderId = urlParams.get('orderId');
      cart = [];
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

  // ==============================
  // Firebase Auth 설정 & 연동
  // ==============================
  const firebaseConfig = {
    apiKey: "AIzaSyBRs87dL43yttlJjqfu-PZG3NFKQROPYV8",
    authDomain: "locknlock-e936e.firebaseapp.com",
    projectId: "locknlock-e936e",
    storageBucket: "locknlock-e936e.firebasestorage.app",
    messagingSenderId: "639512598024",
    appId: "1:639512598024:web:0cff067ebf6e69e38223bd"
  };

  let firebaseAuth = null;
  let googleAuthProvider = null;

  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firebaseAuth = firebase.auth();
    googleAuthProvider = new firebase.auth.GoogleAuthProvider();
  }

  let isLoggedIn = false;
  const DEFAULT_AVATAR_DRAWER = 'img/Profile Avatar.jpg';
  const DEFAULT_AVATAR_MYPAGE = 'img/avatar.jpg';

  // 토스트 메시지 띄우기 함수
  const showToast = (message) => {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }
  };

  // 로그인 성공 처리 함수
  // forcePage를 지정하면 이동 기록과 상관없이 항상 해당 페이지로 이동함
  const login = (username, avatarUrl, forcePage) => {
    // avatarUrl이 페이지 문자열(예: 'page-home')인 경우 호환 처리
    if (typeof avatarUrl === 'string' && (avatarUrl.startsWith('page-') || avatarUrl === '')) {
      forcePage = avatarUrl;
      avatarUrl = null;
    }

    isLoggedIn = true;

    // 유저명 및 환영 메시지 업데이트
    document.querySelectorAll('.mypage-username, .drawer-username').forEach((el) => {
      el.textContent = username;
    });
    document.querySelectorAll('.mypage-welcome').forEach((el) => {
      el.textContent = `${username}님, 환영합니다.`;
    });

    // 아바타 프로필 이미지 업데이트 (구글 로그인 프로필 사진 등)
    if (avatarUrl) {
      document.querySelectorAll('.drawer-avatar, .mypage-avatar img').forEach((img) => {
        img.src = avatarUrl;
      });
    }

    // UI 보이기/숨기기 처리
    document.querySelectorAll('.logged-out-only').forEach((el) => {
      el.style.display = 'none';
    });
    document.querySelectorAll('.logged-in-only').forEach((el) => {
      if (el.classList.contains('mypage-profile-card')) {
        el.style.display = 'flex';
      } else {
        el.style.display = '';
      }
    });

    showToast('로그인 성공');

    if (forcePage) {
      goToPage(forcePage, { syncTab: true });
      return;
    }

    // 로그인 완료 후 홈 또는 직전 페이지로 이동
    if (pageHistory.length > 1) {
      pageHistory.pop(); // 현재 페이지('page-login') 제거
      const prevPage = pageHistory[pageHistory.length - 1];
      const isTabItem = ['page-home', 'page-cart', 'page-wish', 'page-mypage'].includes(prevPage);
      goToPage(prevPage, { syncTab: isTabItem, isBack: true });
    } else {
      goToPage('page-home', { syncTab: true });
    }
  };

  // 로그아웃 처리 함수
  const logout = () => {
    isLoggedIn = false;

    // Firebase Auth 로그아웃 처리
    if (firebaseAuth && firebaseAuth.currentUser) {
      firebaseAuth.signOut().catch((err) => console.error('Firebase Logout Error:', err));
    }

    // 기본 프로필 이미지로 복원
    const drawerAvatar = document.querySelector('.drawer-avatar');
    if (drawerAvatar) drawerAvatar.src = DEFAULT_AVATAR_DRAWER;
    const mypageAvatar = document.querySelector('.mypage-avatar img');
    if (mypageAvatar) mypageAvatar.src = DEFAULT_AVATAR_MYPAGE;

    // UI 보이기/숨기기 처리
    document.querySelectorAll('.logged-out-only').forEach((el) => {
      el.style.display = '';
    });
    document.querySelectorAll('.logged-in-only').forEach((el) => {
      el.style.display = 'none';
    });

    showToast('로그아웃 완료');
    goToPage('page-home', { syncTab: true });
  };

  // 실제 구글 로그인 인증 핸들러 (Firebase signInWithPopup)
  const handleGoogleAuth = (targetBtn, forcePage) => {
    if (!firebaseAuth || !googleAuthProvider) {
      showToast('Firebase SDK 로드 실패! 인터넷 연결을 확인해주세요.');
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
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
          showToast('구글 로그인이 취소되었습니다.');
        } else if (error.code === 'auth/unauthorized-domain') {
          showToast('승인되지 않은 도메인입니다. Firebase 콘솔 설정 필요');
        } else {
          showToast(`구글 로그인 실패: ${error.message || '인증 오류'}`);
        }
      })
      .finally(() => {
        if (targetBtn) {
          targetBtn.disabled = false;
          targetBtn.innerHTML = originalContent;
        }
      });
  };

  // Firebase Auth 상태 변경 감지 및 자동 로그인 유지
  if (firebaseAuth) {
    firebaseAuth.onAuthStateChanged((user) => {
      if (user && !isLoggedIn) {
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Google 사용자');
        const photoURL = user.photoURL || null;
        login(displayName, photoURL);
      }
    });
  }

  // 일반 로그인 폼 서브밋 핸들러
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

      // 로딩 상태 표시
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="login-spinner"></span> 로그인 중...`;

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

        // 아이디에서 유저네임 추출 시도
        const extractedUsername = emailVal.split('@')[0] || '홍길동';
        login(extractedUsername);

        // 입력 폼 리셋
        emailInput.value = '';
        passwordInput.value = '';
      }, 1500);
    });
  }

  // ==============================
  // 입력창 지우기(X) 버튼: 값이 있을 때만 보이고, 클릭 시 입력값을 비움
  // (data-target으로 연결된 모든 입력창에 공통 적용)
  // ==============================
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
      // 다른 실시간 검증 로직(이메일 형식, 비밀번호 일치 등)이 갱신되도록 input 이벤트도 함께 발생시킴
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });

  // SNS 구글 로그인 버튼 (로그인 페이지용) — 로그인 후 항상 홈 화면으로 이동
  const googleBtn = document.querySelector('.login-google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleGoogleAuth(googleBtn, 'page-home');
    });
  }

  // 소셜 로그인, 회원가입, 비밀번호 찾기 등 클릭 핸들러
  document.addEventListener('click', (e) => {
    // 1. 구글 소셜 로그인 서브 버튼 (드로어 및 마이페이지 내)
    const subGoogleBtn = e.target.closest('.btn-google-login');
    if (subGoogleBtn) {
      e.preventDefault();
      handleGoogleAuth(subGoogleBtn);
      return;
    }

    // 2. 회원가입 버튼 클릭 시 → 회원가입 페이지로 이동
    const signupBtn = e.target.closest('.btn-signup') || e.target.closest('.login-signup-link');
    if (signupBtn) {
      e.preventDefault();
      goToPage('page-signup');
      closeDrawer();
      return;
    }

    // 3-1. 회원가입 페이지 "로그인" 링크 클릭 → 로그인 페이지로 이동
    const loginLink = e.target.closest('.login-link-to-login');
    if (loginLink) {
      e.preventDefault();
      goToPage('page-login');
      return;
    }

    // 3. 비밀번호 찾기 클릭 시 알림
    const findPwBtn = e.target.closest('.login-find-pw');
    if (findPwBtn) {
      e.preventDefault();
      showToast('비밀번호 찾기 기능은 준비 중입니다.');
      return;
    }
  });

  // ==============================
  // 회원가입 폼 처리
  // ==============================
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
    // 데모용 '이미 가입된' 이메일 목록 (실제 서버가 없으므로 하드코딩으로 시뮬레이션)
    const REGISTERED_EMAILS = ['test@locknlock.com', 'user@example.com', 'hong@gmail.com'];

    // 이메일 형식이 바뀌면 중복확인 결과는 다시 확인해야 하므로 초기화
    let emailCheckedValue = null; // 마지막으로 '중복확인'을 통과한 이메일 값
    let emailAvailable = false;

    const setFieldMessage = (el, text, type) => {
      if (!el) return;
      el.textContent = text || '';
      el.classList.remove('is-error', 'is-success');
      if (type === 'error') el.classList.add('is-error');
      if (type === 'success') el.classList.add('is-success');
    };

    // 이메일 형식 실시간 검사
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
        // 값이 바뀌면 이전 중복확인 결과는 무효화
        emailCheckedValue = null;
        emailAvailable = false;
        validateEmailFormat();
      });
    }

    // 이메일 중복확인 버튼
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
        }, 700);
      });
    }

    // 비밀번호 표시/숨김(눈 모양) 토글
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

    // 비밀번호 / 비밀번호 확인 실시간 일치 여부 안내
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

    // 약관 동의: '전체 동의' 체크박스와 개별 항목 동기화
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

      // 이전 오류 스타일 초기화
      [emailInput, pwInput, pwConfirmInput].forEach((el) => el.classList.remove('input-error'));
      requiredAgreeCheckboxes.forEach((cb) => cb.closest('.signup-agree-item').classList.remove('input-error'));

      const email = emailInput.value.trim();
      const pw = pwInput.value;
      const pwConfirm = pwConfirmInput.value;

      // 유효성 검사
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

      // 가입 처리 (로딩 상태)
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="login-spinner"></span> 가입 처리 중...`;

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

        // 폼 초기화
        emailInput.value = '';
        pwInput.value = '';
        pwConfirmInput.value = '';
        setFieldMessage(emailMessage, '', null);
        setFieldMessage(pwMatchMessage, '', null);
        emailCheckedValue = null;
        emailAvailable = false;
        agreeCheckboxes.forEach((cb) => { cb.checked = false; });
        if (agreeAllCheckbox) agreeAllCheckbox.checked = false;

        // 가입 완료 → 자동 로그인 처리
        const username = email.split('@')[0];
        login(username);
        showToast('회원가입 완료! 환영합니다 🎉');
      }, 1500);
    });
  }

  // 로그아웃 버튼 이벤트 리스너 연결
  document.querySelectorAll('.btn-logout').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
      closeDrawer();
    });
  });

  // ==============================
  // 아직 실제 기능이 연결되지 않은 버튼/링크 안내 처리
  // (다른 곳에서 이미 처리하는 요소는 아래 목록에서 모두 제외됨)
  // ==============================
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
    // 이미 기능이 연결된 요소는 건너뜀
    if (e.target.closest(CONNECTED_SELECTORS)) return;

    // 버튼, 링크, role="button" 요소만 대상으로 함
    const target = e.target.closest('button, a, [role="button"]');
    if (!target) return;

    e.preventDefault();
    showAlertModal('해당 기능은 현재 연결 작업 중입니다. 이용에 불편을 드려 죄송합니다.');
  });

});