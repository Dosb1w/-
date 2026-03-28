import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORE_CONFIG = {
  'Пятёрочка':        { color: '#16a34a', qr: true,  category: 'Супермаркеты', digits: 16, appLinks: { ios: 'https://apps.apple.com/ru/app/id1048350495', android: 'https://play.google.com/store/apps/details?id=ru.pyaterochka.app' }, instruction: 'Скачайте приложение → Войдите по номеру телефона → Раздел «Карта» → номер под штрихкодом' },
  'Магнит':           { color: '#dc2626', qr: true,  category: 'Супермаркеты', digits: 16, appLinks: { ios: 'https://apps.apple.com/ru/app/id1126831536', android: 'https://play.google.com/store/apps/details?id=ru.tander.magnit' }, instruction: 'Скачайте приложение → Войдите → номер карты на главном экране' },
  'Красное&Белое':    { color: '#b91c1c', qr: false, category: 'Супермаркеты', digits: 16, appLinks: { ios: 'https://apps.apple.com/ru/app/id1435869078', android: 'https://play.google.com/store/apps/details?id=ru.krasnoeibeloe.app' }, instruction: 'Скачайте → зарегистрируйтесь → вкладка карта' },
  'Бристоль':         { color: '#0f766e', qr: false, category: 'Супермаркеты', digits: 16, appLinks: { ios: 'https://apps.apple.com/ru/app/id1534350882', android: 'https://play.google.com/store/apps/details?id=ru.bristol.app' }, instruction: 'Скачайте → войдите → карта' },
  'ВкусВилл':         { color: '#65a30d', qr: false, category: 'Супермаркеты', digits: 16, appLinks: { ios: 'https://apps.apple.com/ru/app/id1148348339', android: 'https://play.google.com/store/apps/details?id=ru.vkusvill.app' }, instruction: 'Кошелек → номер карты' },
  'Лента':            { color: '#f59e0b', qr: false, category: 'Супермаркеты', digits: 16, appLinks: { ios: 'https://apps.apple.com/ru/app/id1095371758', android: 'https://play.google.com/store/apps/details?id=ru.lenta.app' }, instruction: 'Главный экран → карта' },
  'Перекрёсток':      { color: '#2563eb', qr: false, category: 'Супермаркеты', digits: 16, appLinks: { ios: 'https://apps.apple.com/ru/app/id1262668866', android: 'https://play.google.com/store/apps/details?id=ru.perekrestok.app' }, instruction: 'Карта → номер под штрихкодом' },
  'Сималенд':         { color: '#7c3aed', qr: false, category: 'Другое',       digits: 16, appLinks: { ios: 'https://www.simaland.ru', android: 'https://www.simaland.ru' }, instruction: 'Сайт → профиль → данные' },
  'Аптека Вита':      { color: '#0891b2', qr: false, category: 'Аптеки',       digits: 16, appLinks: { ios: 'https://apps.apple.com/ru/app/id1462385864', android: 'https://play.google.com/store/apps/details?id=ru.vitaexpress.app' }, instruction: 'Карта → номер' },
  'Планета Здоровья': { color: '#059669', qr: false, category: 'Аптеки',       digits: 16, appLinks: { ios: 'https://apps.apple.com/ru/app/id1434048949', android: 'https://play.google.com/store/apps/details?id=ru.planetazdorovo.app' }, instruction: 'Главный экран → карта' },
};

const STORES = Object.keys(STORE_CONFIG);
const STORAGE_KEY = 'loyalty-cards-v2';
const CATEGORIES = ['Супермаркеты', 'Аптеки', 'Другое'];

function getPlatformLink(links) {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return links.android;
  if (/iphone|ipad|ipod/.test(ua)) return links.ios;
  return links.android;
}

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
  const barcodeRef = useRef(null);
  const qrRef = useRef(null);

  useEffect(() => {
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
  }, [tg]);

  const selectedCard = useMemo(() => cards.find(c => c.id === selectedCardId), [cards, selectedCardId]);
  const isQrStore = selectedCard ? STORE_CONFIG[selectedCard.store]?.qr : false;

  function validateNumber(val) {
    if (val.length < 8) return 'Минимум 8 цифр';
    if (val.length > 16) return 'Максимум 16 цифр';
    return '';
  }

  function handleNumberChange(e) {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) return;
    setNumber(val);
    setNumberError(validateNumber(val));
  }

  function saveCard(e) {
    e.preventDefault();
    const error = validateNumber(number);
    if (error) { setNumberError(error); return; }
    const card = { id: crypto.randomUUID(), store, number };
    setCards(prev => [card, ...prev]);
    setNumber('');
    setScreen('home');
  }

  function openLink() {
    const link = getPlatformLink(STORE_CONFIG[selectedStore].appLinks);
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openLink(link);
    } else {
      window.open(link, '_blank');
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Карты</h1>
      </header>

      <main className="screen">
        <button className="primary-btn" onClick={openLink}>
          Скачать приложение
        </button>

        <input
          value={number}
          onChange={handleNumberChange}
          placeholder="До 16 цифр"
        />

        {numberError && <div className="field-error">{numberError}</div>}
      </main>
    </div>
  );
}

export default App;
