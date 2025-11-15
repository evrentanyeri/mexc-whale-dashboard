export default async function handler(req, res) {
  try {
    // 1) Tüm sözleşme listesi
    const listRes = await fetch("https://contract.mexc.com/api/v1/contract/detail");
    const listJson = await listRes.json();

    if (!listJson || !listJson.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC sözleşme listesi hatalı",
        raw: listJson
      });
    }

    // 👉 Sadece USDT_Perpetual sözleşmeler
    const contracts = listJson.data.filter(c => c.symbol.endsWith("_USDT"));
    const symbols = contracts.map(c => c.symbol);

    // 2) DOĞRU TICKER ENDPOINT → tüm perpetual tickers
    const tickRes = await fetch("https://contract.mexc.com/api/v1/contract/tickers");
    const tickJson = await tickRes.json();

    if (!tickJson || !tickJson.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC ticker verisi hatalı",
        raw: tickJson
      });
    }

    // tickerları map formatına çevir
    const ticks = {};
    tickJson.data.forEach(t => {
      ticks[t.symbol] = t;
    });

    // PumpScore hesaplama
    function calcPumpScore(price, change, volume) {
      if (!price || !volume) return 0;

      const ch = parseFloat(change);
      const vol = parseFloat(volume);
      const p = parseFloat(price);

      return (Math.abs(ch) * 12) + (vol / 10000000) + (p / 8000);
    }

    // Sonuçları oluştur
    const processed = symbols.map((sym, idx) => {
      const t = ticks[sym];

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

      return {
        id: idx + 1,
        symbol: sym,
        price: price,
        change: change,
        volume: volume,
        exchange: "MEXC Futures",
        pumpScore: parseFloat(calcPumpScore(price, change, volume).toFixed(2))
      };
    });

    // PumpScore’a göre sırala
    processed.sort((a, b) => b.pumpScore - a.pumpScore);

    // Sadece TOP 20
    const top20 = processed.slice(0, 20);

    res.status(200).json({
      success: true,
      data: top20
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
      details: err.toString()
    });
  }
}
