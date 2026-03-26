import { useEffect, useMemo, useRef, useState } from 'react';

const STORES = ['Пятёрочка', 'Магнит', 'Красное&Белое', 'Бристоль'];

const STORE_CONFIG = {
  'Пятёрочка': { color: '#65a30d' },
  Магнит: { color: '#dc2626' },
  'Красное&Белое': { color: '#b91c1c' },
  Бристоль: { color: '#0f766e' },
};

const STORAGE_KEY = 'loyalty-cards';

function maskCardNumber(number) {
  const str = String(number).replace(/\s+/g, '');
  if (str.length <= 4) return str;
  return `${'*'.repeat(Math.max(str.length - 4, 0))}${str.slice(-4)}`;
}

function App() {
  const tg = window.Telegram?.WebApp;

  const [screen, setScreen] = useState('home');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [cards, setCards] = useState([]);
  const [store, setStore] = useState(STORES[0]);
  const [number, setNumber] = useState('');
  const [highBrightness, setHighBrightness] = useState(false);
  const barcodeRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCards(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    if (!tg) return;
    tg.ready();
    tg.expand();

    const color = tg.colorScheme === 'light' ? '#111111' : '#050505';
    tg.setBackgroundColor(color);
    tg.setHeaderColor(color);
  }, [tg]);

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId),
    [cards, selectedCardId],
  );

  useEffect(() => {
    if (screen !== 'barcode' || !selectedCard || !barcodeRef.current || !window.JsBarcode) return;

    window.JsBarcode(barcodeRef.current, selectedCard.number, {
      format: 'CODE128',
      lineColor: '#ffffff',
      background: 'transparent',
      width: 2,
      height: 120,
      displayValue: false,
      margin: 0,
    });
  }, [screen, selectedCard]);

  function openBarcode(cardId) {
    setSelectedCardId(cardId);
    setScreen('barcode');
  }

  function saveCard(event) {
    event.preventDefault();
    if (!number.trim()) return;

    const card = {
      id: crypto.randomUUID(),
      store,
      number: number.trim(),
      points: Math.floor(Math.random() * 4000),
    };

    setCards((prev) => [card, ...prev]);
    setNumber('');
    setStore(STORES[0]);
    setScreen('home');
  }

  async function increaseBrightness() {
    setHighBrightness(true);
    if (window.screen?.orientation?.lock) {
      try {
        await window.screen.orientation.lock('landscape');
      } catch {
        // Не все устройства разрешают lock без fullscreen.
      }
    }
  }

  function goBack() {
    setScreen('home');
    if (window.screen?.orientation?.unlock) {
      window.screen.orientation.unlock();
    }
    setHighBrightness(false);
  }

  function closeMiniApp() {
    tg?.close();
  }

  return (
    <div className={`app ${highBrightness ? 'app--bright' : ''}`}>
      <header className="header">
        <h1>Карты лояльности</h1>
      </header>

      {screen === 'home' && (
        <main className="screen home-screen">
          <div className="cards-list">
            {cards.length === 0 && (
              <div className="empty-state">Добавьте первую карту, чтобы видеть её здесь.</div>
            )}

            {cards.map((card) => (
              <button
                type="button"
                key={card.id}
                className="card-item"
                style={{ backgroundColor: STORE_CONFIG[card.store].color }}
                onClick={() => openBarcode(card.id)}
              >
                <div className="card-store">{card.store}</div>
                <div className="card-number">{maskCardNumber(card.number)}</div>
                <div className="card-points">Баллы: {card.points}</div>
              </button>
            ))}
          </div>

          <button className="primary-btn fixed-btn" type="button" onClick={() => setScreen('add')}>
            Добавить карту
          </button>
        </main>
      )}

      {screen === 'barcode' && selectedCard && (
        <main className="screen barcode-screen">
          <h2>{selectedCard.store}</h2>
          <div className="barcode-box">
            <svg ref={barcodeRef} />
          </div>
          <p className="barcode-number">{selectedCard.number}</p>

          <div className="actions-row">
            <button type="button" className="secondary-btn" onClick={goBack}>
              Назад
            </button>
            <button type="button" className="primary-btn" onClick={increaseBrightness}>
              Повысить яркость
            </button>
          </div>
        </main>
      )}

      {screen === 'add' && (
        <main className="screen add-screen">
          <form className="form" onSubmit={saveCard}>
            <label>
              Магазин
              <select value={store} onChange={(e) => setStore(e.target.value)}>
                {STORES.map((storeName) => (
                  <option value={storeName} key={storeName}>
                    {storeName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Номер карты
              <input
                type="number"
                inputMode="numeric"
                placeholder="Введите номер"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </label>

            <button className="primary-btn" type="submit">
              Сохранить
            </button>
            <button className="secondary-btn" type="button" onClick={() => setScreen('home')}>
              Отмена
            </button>
          </form>
        </main>
      )}

      <footer className="footer">
        <button type="button" className="text-btn" onClick={closeMiniApp}>
          Закрыть Mini App
        </button>
      </footer>
    </div>
  );
}

export default App;
