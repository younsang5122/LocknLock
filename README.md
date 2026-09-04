# 🥤 LocknLock 텀블러 전용 쇼핑몰 (LocknLock Tumbler Store)

> **락앤락 텀블러 브랜드 전용 모바일 & 데스크탑 반응형 Web Application**
> 
> 사용자의 라이프스타일에 맞춘 다양한 텀블러 상품(일반 텀블러, 유아용 텀블러, 스포츠 텀블러 등)을 둘러보고, 장바구니 담기, 상품 필터링, 상세 정보 조회 및 결제 프로세스까지 경험할 수 있는 단일 페이지 애플리케이션(SPA) 기반 쇼핑몰입니다.

---

## 📌 프로젝트 개요 (Overview)

* **프로젝트명**: LocknLock - 텀블러 전용 쇼핑몰
* **개발 스택**: HTML5, Vanilla CSS3, Vanilla JavaScript (ES6+)
* **디자인 특징**: 데스크탑 화면에서는 좌측 브랜드 패널과 우측 앱 화면이 나누어지는 **Split-Screen Layout**, 모바일 해상도에서는 단일 컬럼 반응형 화면 제공

---

## ✨ 주요 기능 (Key Features)

### 1. 📱 반응형 Split-Screen 레이아웃
* **데스크탑 뷰**: 좌측에는 락앤락 브랜드 비주얼과 카피를 배치하고, 우측에는 실제 모바일 쇼핑몰 화면이 조화롭게 배치된 모던 2-Column Split 디자인.
* **모바일 뷰**: 모바일 기기 접속 시 앱 화면 중심의 깔끔하고 독립적인 단일 컬럼 UI 제공.

### 2. 🗂️ 사이드바 드로어 (Drawer Navigation Menu)
* 메인 네비게이션 드로어를 통해 카테고리 이동 (텀블러, 유아용 텀블러, 스포츠 텀블러 등).
* **인증 상태 분기**:
  * **로그인 전**: 일반 로그인, Google 로그인, 회원가입 버튼 제공.
  * **로그인 후**: 사용자 프로필 아바타, 이름 표시 및 로그아웃 기능 제공.

### 3. 🛍️ 상품 카테고리 & 목록 보기 (Product List & Filtering)
* 카테고리별(일반 텀블러, 키즈 텀블러, 스포츠/야외용 텀블러) 상품 배치.
* **정렬 및 드롭다운 필터**: 추천순, 인기순, 신상품순 및 가격대별 상품 필터링 기능.
* **상품 카드 인터랙션**: 
  * 찜하기(하트) 토글 기능.
  * 장바구니 버튼 클릭 시 팝(Pop) 애니메이션 피드백 및 실시간 장바구니 수량 반영.

### 4. 🔎 상품 상세 페이지 (Product Details)
* 상품 고화질 이미지 갤러리 및 상세 설명 제공.
* 수량 조절(+, -) 및 실시간 총 금액 자동 계산.
* 리뷰, Q&A, 상세정보 탭 전환.
* 즉시 구매하기 및 장바구니 담기 기능.

### 5. 🛒 장바구니 & 결제 프로세스 (Cart & Checkout)
* **장바구니 관리**:
  * 선택 상품 삭제, 수량 변경 및 전체/선택 금액 자동 반영.
* **주문/결제 (Checkout)**:
  * 주문자 정보 입력, 배송지 선택.
  * 결제 수단(토스페이, 카카오페이, 신용카드 등) 선택 모의 구현.
  * 필수 이용약관 동의 체크박스 및 최종 결제 제출.

### 6. 👤 회원 인증 및 마이페이지 (Auth & MyPage)
* 로그인 및 회원가입 모달/뷰 처리.
* 최근 주문 내역, 배송 조회, 찜한 상품 목록 및 개인정보 관리 메뉴 구성.

---

## 📁 프로젝트 구조 (Directory Structure)

```text
LocknLock-main/
├── README.md             # 프로젝트 안내 및 기능 명세 문서
├── index.html            # 메인 HTML (모든 뷰와 모달, 드로어 레이아웃 포함)
├── style.css             # 전역 스타일, 반응형 레이아웃, 커스텀 스타일 및 애니메이션
├── main.js               # UI 인터랙션, SPA 페이지 전환, 장바구니/필터 로직
└── img/                  # 상품 및 브랜드 비주얼 이미지 자산
    ├── desktop-hero.jpg
    ├── Profile Avatar.jpg
    └── ... (기타 상품 이미지 파일들)
```

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 스택 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | HTML5 | 웹 접근성과 시맨틱 태그(header, nav, main, section, aside 등) 준수 |
| **Styling** | Vanilla CSS3 | Flexbox, CSS Grid, Media Queries, CSS Variables, Keyframe Animations |
| **Logic** | Vanilla JS (ES6+) | DOM Manipulation, Event Handling, Dynamic State updates, SPA Page Router |

---

## 🚀 실행 방법 (How to Run)

본 프로젝트는 별도의 번들러나 백엔드 서버 설치 없이 브라우저에서 바로 실행이 가능합니다.

1. 본 저장소를 클론(Clone)하거나 다운로드합니다.
2. `index.html` 파일을 브라우저(Chrome, Edge, Safari 등)에서 오픈합니다.
3. 또는 VS Code의 **Live Server** 확장 프로그램을 사용하여 실행할 수 있습니다.

```bash
# 로컬 라이브 서버 실행 예시 (Live Server 확장 프로그램 활용 추천)
# index.html 우클릭 -> "Open with Live Server"
```

---

## 🎨 UI/UX 디자인 하이라이트

* **컬러 팔레트**: 락앤락 특유의 깔끔하고 모던한 시그니처 딥블루 & 미니멀 트렌디 컬러 사용.
* **마이크로 애니메이션**: 장바구니 담기 피드백 팝 애니메이션, 드로어 슬라이드 효과, 탭 전환 애니메이션.
* **접근성 및 사용성**: 직관적인 아이콘(SVG 사용), 명확한 터치 영역 및 모바일 친화적 탭 버튼 구성.

---

© 2026 LocknLock Tumbler Store. All Rights Reserved.
