export default async function handler(req, res) {
  try {
    // MEXC Perpetual Futures sözleşme listesi
    const listRes = await fetch("https://contract.mexc.com/api/v1/contract/detail");
    const listJson = await listRes.json();

    if (!listJson || !listJson.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC veri formatı hatalı",
        raw: listJson
      });
    }

    // 👉 Sadece USDT perpetual sözleşmelerini filtrele
    const usdtPerps = listJson.data.filter(c => c.symbol.endsWith("_USDT"));

    // Sözleşme adlarını al
    const symbols = usdtPerps.map(c => c.symbol);

    // 🔥 Tüm coinlerin güncel ticker verisini al
    const tickRes = await fetch("https://contract.mexc.com/api/v1/contract/ticker");
    const tickJson = await tickRes.json();

    if (!tickJson || !tickJson.data) {
      return res.status(500).json({
        success: false,
        error: "Ticker verisi okunamadı",
        raw: tickJson
      });
    }

    // Gelen tick verisini sözlük formatına çevir
    const tickMap = {};
    tickJson.data.forEach(t => {
      tickMap[t.symbol] = t;
    });

    // 🔥 PumpScore hesaplama
    function calcPumpScore(price, change, volume) {
      if (!price || !volume) return 0;

      const ch = change ? parseFloat(change) : 0;
      const vol = parseFloat(volume);
      const p = parseFloat(price);

      return (Math.abs(ch) * 12) + (vol / 10000000) + (p / 5000);
    }

    // 🔥 Nihai coin listesi
    const processed = symbols.map((sym, idx) => {
      const t = tickMap[sym];

      if (!t) {
        return {
          id: idx + 1,
          symbol: sym,
          price: null,
          change: null,
          volume: null,
          exchange: "MEXC Futures",
          pumpScore: 0
        };
      }

      const price = parseFloat(t.lastPrice);
      const change = parseFloat(t.changeRate * 100).toFixed(2);
      const volume = parseFloat(t.volume);

      const score = calcPumpScore(price, change, volume);

      return {
        id: idx + 1,
        symbol: sym,
        price: price,
        change: change,
        volume: volume,
        exchange: "MEXC Futures",
        pumpScore: parseFloat(score.toFixed(2))
      };
    });

    // 🔥 PumpScore’a göre büyükten küçüğe sırala
    processed.sort((a, b) => b.pumpScore - a.pumpScore);

    // 🔥 SADECE TOP 20
    const top20 = processed.slice(0, 20);

    return res.status(200).json({
      success: true,
      data: top20
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "MEXC bağlantı hatası",
      details: err.toString()
    });
  }
}
