import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORE_CONFIG = {
  'Пятёрочка':        { color: '#16a34a', qr: true,  category: 'Супермаркеты', digits: 16, appUrl: 'https://5ka.ru/app/', instruction: 'Скачайте приложение → Войдите по номеру телефона → Раздел «Карта» → скопируйте номер под штрихкодом' },
  'Магнит':           { color: '#dc2626', qr: true,  category: 'Супермаркеты', digits: 16, appUrl: 'https://magnit.ru/promo/app/', instruction: 'Скачайте приложение → Войдите по номеру телефона → Главный экран → номер карты под QR-кодом' },
  'Красное&Белое':    { color: '#b91c1c', qr: false, category: 'Супермаркеты', digits: 16, appUrl: 'https://krasnoeibeloe.ru/', instruction: 'Скачайте приложение → Зарегистрируйтесь → Вкладка «Карта» → номер указан под штрихкодом' },
  'Бристоль':         { color: '#0f766e', qr: false, category: 'Супермаркеты', digits: 16, appUrl: 'https://bristol.ru/', instruction: 'Скачайте приложение → Войдите → Вкладка «Карта» → номер карты под штрихкодом' },
  'ВкусВилл':         { color: '#65a30d', qr: false, category: 'Супермаркеты', digits: 16, appUrl: 'https://vkusvill.ru/app/', instruction: 'Скачайте приложение → Войдите по телефону → Раздел «Кошелёк» → номер виртуальной карты' },
  'Лента':            { color: '#f59e0b', qr: false, category: 'Супермаркеты', digits: 16, appUrl: 'https://lenta.com/app/', instruction: 'Скачайте приложение → Войдите → Главный экран → карточка с балансом → номер под штрихкодом' },
  'Перекрёсток':      { color: '#2563eb', qr: false, category: 'Супермаркеты', digits: 16, appUrl: 'https://perekrestok.ru/app/', instruction: 'Скачайте приложение → Войдите → Вкладка «Карта» → номер указан под штрихкодом' },
  'Сималенд':         { color: '#7c3aed', qr: false, category: 'Другое',       digits: 16, appUrl: 'https://www.simaland.ru', instruction: 'Зайдите на сайт simaland.ru → Войдите в аккаунт → Раздел «Мои данные» → номер карты покупателя' },
  'Аптека Вита':      { color: '#0891b2', qr: false, category: 'Аптеки',       digits: 16, appUrl: 'https://vitaexpress.ru/', instruction: 'Скачайте приложение → Зарегистрируйтесь → Раздел «Карта» → номер под штрихкодом' },
  'Планета Здоровья': { color: '#059669', qr: false, category: 'Аптеки',       digits: 16, appUrl: 'https://planetazdorovo.ru/', instruction: 'Скачайте приложение → Войдите по телефону → Главный экран → номер карты виден сразу' },
};

const STORES = Object.keys(STORE_CONFIG);
const STORAGE_KEY = 'loyalty-cards-v2';
const CATEGORIES = ['Супермаркеты', 'Аптеки', 'Другое'];

function maskCardNumber(number) {
  const str = String(number).replace(/\s+/g, '');
  if (str.length <= 4) return str;
  return `${'*'.repeat(Math.max(str.length - 4, 0))}${str.slice(-4)}`;
}

function App() {
  const tg = window.Telegram?.WebApp;

  const [tab, setTab] = useState('home');
  const [screen, setScreen] = useState('home');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedStore, setSelectedStoreName] = useState(null);
  const [cards, setCards] = useState([]);
  const [store, setStore] = useState(STORES[0]);
  const [number, setNumber] = useState('');
  const [numberError, setNumberError] = useState('');

  // Сканирование
  const [scanPreview, setScanPreview] = useState(null);
  const [scanStatus, setScanStatus] = useState(''); // 'cropping' | 'scanning' | 'error' | ''
  const cropperRef = useRef(null);
  const cropImageRef = useRef(null);

  const barcodeRef = useRef(null);
  const qrRef = useRef(null);

  // Загрузка карт
  useEffect(() => {
    // Миграция старых данных
    const oldData = localStorage.getItem('loyalty-cards');
    if (oldData) {
      localStorage.setItem(STORAGE_KEY, oldData);
      localStorage.removeItem('loyalty-cards');
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setCards(JSON.parse(saved)); } catch { localStorage.removeItem(STORAGE_KEY); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    if (!tg) return;
    tg.ready();
    tg.expand();
    tg.setBackgroundColor('#0a0a0f');
    tg.setHeaderColor('#0a0a0f');
  }, [tg]);

  const selectedCard = useMemo(() => cards.find(c => c.id === selectedCardId), [cards, selectedCardId]);
  const isQrStore = selectedCard ? STORE_CONFIG[selectedCard.store]?.qr : false;

  useEffect(() => {
    if (screen !== 'barcode' || !selectedCard || isQrStore || !barcodeRef.current || !window.JsBarcode) return;
    window.JsBarcode(barcodeRef.current, selectedCard.number, {
      format: 'CODE128', lineColor: '#000000', background: '#ffffff',
      width: 2, height: 100, displayValue: false, margin: 0,
    });
  }, [screen, selectedCard, isQrStore]);

  useEffect(() => {
    if (screen !== 'barcode' || !selectedCard || !isQrStore || !qrRef.current || !window.QRCode) return;
    qrRef.current.innerHTML = '';
    new window.QRCode(qrRef.current, {
      text: selectedCard.number, width: 200, height: 200,
      colorDark: '#000000', colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  }, [screen, selectedCard, isQrStore]);

  // Инициализация кроппера после появления изображения
  useEffect(() => {
    if (!scanPreview || !cropImageRef.current || !window.Cropper) return;
    if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null; }
    const img = cropImageRef.current;
    img.onload = () => {
      cropperRef.current = new window.Cropper(img, {
        viewMode: 1,
        aspectRatio: NaN,
        autoCropArea: 0.8,
      });
    };
    if (img.complete) img.onload();
  }, [scanPreview]);

  function openBarcode(cardId) { setSelectedCardId(cardId); setScreen('barcode'); }
  function openCatalogDetail(storeName) { setSelectedStoreName(storeName); setScreen('catalog-detail'); }

  function deleteCard(cardId) {
    if (!window.confirm('Удалить эту карту?')) return;
    setCards(prev => prev.filter(c => c.id !== cardId));
    setScreen('home');
    setTab('home');
  }

  function validateNumber(val, storeName) {
    const cfg = STORE_CONFIG[storeName];
    const clean = val.replace(/\D/g, '');
    if (clean.length < 8) return 'Слишком короткий номер (минимум 8 цифр)';
    if (clean.length > (cfg?.digits || 16)) return `Максимум ${cfg?.digits || 16} цифр для ${storeName}`;
    return '';
  }

  function handleNumberChange(e) {
    const val = e.target.value.replace(/\D/g, '');
    const cfg = STORE_CONFIG[store];
    if (val.length > (cfg?.digits || 16)) return;
    setNumber(val);
    if (val) setNumberError(validateNumber(val, store));
    else setNumberError('');
  }

  function saveCard(e) {
    e.preventDefault();
    const error = validateNumber(number, store);
    if (error) { setNumberError(error); return; }
    const card = { id: crypto.randomUUID(), store, number: number.trim() };
    setCards(prev => [card, ...prev]);
    setNumber('');
    setNumberError('');
    setStore(STORES[0]);
    setScreen('home');
    setTab('home');
  }

  // Загрузка фото
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const url = URL.createObjectURL(file);
    setScanPreview(url);
    setScanStatus('cropping');
    setNumberError('');
  }

  // Распознавание после обрезки
  async function handleCrop() {
    if (!cropperRef.current) return;
    setScanStatus('scanning');

    const canvas = cropperRef.current.getCroppedCanvas({ maxWidth: 1200, maxHeight: 1200 });

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'cropped.png', { type: 'image/png' });

      if (!window.Html5Qrcode) {
        setScanStatus('error');
        setNumberError('Библиотека сканирования не загружена');
        setScanPreview(null);
        return;
      }

      // Создаём временный div для сканера
      let tempDiv = document.getElementById('reader-temp');
      if (!tempDiv) {
        tempDiv = document.createElement('div');
        tempDiv.id = 'reader-temp';
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
      }

      const scanner = new window.Html5Qrcode('reader-temp');
      try {
        const result = await scanner.scanFile(file, true);
        const clean = result.replace(/\D/g, '');
        if (clean && clean.length >= 8) {
          setNumber(clean.slice(0, STORE_CONFIG[store]?.digits || 16));
          setNumberError('');
          setScanStatus('');
          setScanPreview(null);
          if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null; }
        } else {
          setScanStatus('error');
          setNumberError('Номер не распознан — попробуйте обрезать точнее');
        }
      } catch {
        setScanStatus('error');
        setNumberError('Не удалось распознать — обрежьте только штрихкод или QR');
      }
    }, 'image/png');
  }

  function cancelScan() {
    if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null; }
    setScanPreview(null);
    setScanStatus('');
    setNumberError('');
  }

  function goHome() { setScreen('home'); setTab('home'); }
  const alreadyAdded = (storeName) => cards.some(c => c.store === storeName);

  return (
    <div className="app">
      <header className="header">
        <h1>
          {screen === 'barcode' ? selectedCard?.store
            : screen === 'catalog-detail' ? selectedStore
            : screen === 'add' ? `Добавить — ${store}`
            : tab === 'home' ? 'Мои карты'
            : 'Каталог'}
        </h1>
      </header>

      {/* HOME */}
      {tab === 'home' && screen === 'home' && (
        <main className="screen home-screen">
          <div className="cards-list">
            {cards.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🃏</div>
                <div className="empty-title">Карт пока нет</div>
                <div className="empty-sub">Перейдите в Каталог и добавьте первую карту</div>
              </div>
            )}
            {cards.map(card => (
              <button type="button" key={card.id} className="card-item"
                style={{ backgroundColor: STORE_CONFIG[card.store]?.color }}
                onClick={() => openBarcode(card.id)}>
                <div className="card-store">{STORE_CONFIG[card.store]?.category}</div>
                <div className="card-name">{card.store}</div>
                <div className="card-number">{maskCardNumber(card.number)}</div>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* BARCODE */}
      {screen === 'barcode' && selectedCard && (
        <main className="screen barcode-screen">
          <div className="barcode-box">
            {isQrStore
              ? <div ref={qrRef} className="qr-container" />
              : <svg ref={barcodeRef} />}
          </div>
          <p className="barcode-number">{selectedCard.number}</p>
          <div className="actions-row">
            <button type="button" className="secondary-btn" onClick={goHome}>Назад</button>
            <button type="button" className="danger-btn" onClick={() => deleteCard(selectedCard.id)}>Удалить</button>
          </div>
        </main>
      )}

      {/* CATALOG */}
      {tab === 'catalog' && screen === 'catalog' && (
        <main className="screen catalog-screen">
          {CATEGORIES.map(cat => {
            const storesInCat = STORES.filter(s => STORE_CONFIG[s].category === cat);
            return (
              <div key={cat} className="catalog-section">
                <div className="catalog-section-title">{cat}</div>
                {storesInCat.map(storeName => (
                  <button type="button" key={storeName} className="catalog-item"
                    onClick={() => openCatalogDetail(storeName)}>
                    <div className="catalog-dot" style={{ background: STORE_CONFIG[storeName].color }} />
                    <div className="catalog-name">{storeName}</div>
                    {alreadyAdded(storeName)
                      ? <div className="catalog-badge added">✓</div>
                      : <div className="catalog-arrow">→</div>}
                  </button>
                ))}
              </div>
            );
          })}
        </main>
      )}

      {/* CATALOG DETAIL */}
      {screen === 'catalog-detail' && selectedStore && (
        <main className="screen detail-screen">
          <button className="back-link" type="button"
            onClick={() => setScreen('catalog')}>← Назад</button>
          <div className="detail-badge" style={{ background: STORE_CONFIG[selectedStore].color }}>
            {selectedStore}
          </div>
          <div className="detail-section">
            <div className="detail-section-title">📲 Как скачать приложение</div>
            <a className="app-link" href="#"
              onClick={(e) => {
                e.preventDefault();
                const link = STORE_CONFIG[selectedStore].appUrl;
                if (window.Telegram?.WebApp) window.Telegram.WebApp.openLink(link);
                else window.open(link, '_blank');
              }}>
              Открыть ссылку →
            </a>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">🔢 Как найти номер карты</div>
            <div className="detail-instruction">{STORE_CONFIG[selectedStore].instruction}</div>
          </div>
          {alreadyAdded(selectedStore)
            ? <div className="already-added-msg">✓ Эта карта уже добавлена</div>
            : <button className="primary-btn" type="button"
                onClick={() => { setStore(selectedStore); setNumber(''); setNumberError(''); setScanPreview(null); setScanStatus(''); setScreen('add'); }}>
                Добавить карту
              </button>}
        </main>
      )}

      {/* ADD */}
      {screen === 'add' && (
        <main className="screen add-screen">
          <button className="back-link" type="button"
            onClick={() => { cancelScan(); setScreen('catalog-detail'); }}>← Назад</button>

          {/* КРОППЕР */}
          {scanPreview && (
            <div className="crop-wrap">
              <div className="crop-hint">Обрежьте область со штрихкодом или QR</div>
              <div className="crop-img-wrap">
                <img ref={cropImageRef} src={scanPreview} alt="scan" className="crop-img" />
              </div>
              <div className="crop-actions">
                {scanStatus === 'scanning'
                  ? <div className="scan-loading">🔍 Распознаю...</div>
                  : <>
                      <button type="button" className="primary-btn" onClick={handleCrop}>
                        Распознать
                      </button>
                      <button type="button" className="secondary-btn" onClick={cancelScan}>
                        Отмена
                      </button>
                    </>}
              </div>
            </div>
          )}

          {!scanPreview && (
            <form className="form" onSubmit={saveCard}>
              <label>
                Номер карты
                <input
                  type="text" inputMode="numeric"
                  placeholder={`Введите до ${STORE_CONFIG[store]?.digits || 16} цифр`}
                  value={number} onChange={handleNumberChange}
                  maxLength={STORE_CONFIG[store]?.digits || 16} required autoFocus
                />
                {numberError
                  ? <span className="field-error">{numberError}</span>
                  : <span className="field-hint">{number.length} / {STORE_CONFIG[store]?.digits || 16} цифр</span>}
              </label>

              {/* КНОПКА СКАНИРОВАНИЯ */}
              <label className="scan-btn">
                📷 Сканировать штрихкод или QR
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={handleImageUpload} />
              </label>

              <button className="primary-btn" type="submit">Сохранить</button>
              <button className="secondary-btn" type="button"
                onClick={() => setScreen('catalog-detail')}>Отмена</button>
            </form>
          )}
        </main>
      )}

      {/* BOTTOM NAV */}
      {screen !== 'barcode' && screen !== 'add' && screen !== 'catalog-detail' && (
        <nav className="bottom-nav">
          <button type="button" className={`nav-item ${tab === 'home' ? 'active' : ''}`}
            onClick={() => { setTab('home'); setScreen('home'); }}>
            <span className="nav-icon">🃏</span>
            <span className="nav-label">Мои карты</span>
          </button>
          <button type="button" className={`nav-item ${tab === 'catalog' ? 'active' : ''}`}
            onClick={() => { setTab('catalog'); setScreen('catalog'); }}>
            <span className="nav-icon">🏪</span>
            <span className="nav-label">Каталог</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
