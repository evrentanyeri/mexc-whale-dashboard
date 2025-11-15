export default async function handler(req, res) {
  try {
    // 1) Sözleşme listesini çek
    const listRes = await fetch("https://contract.mexc.com/api/v1/contract/detail");
    const listJson = await listRes.json();

    if (!listJson || !listJson.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC sözleşme listesi hatalı",
        raw: listJson
      });
    }

    // Sadece USDT perpetual sözleşmeler
    const symbols = listJson.data
      .filter(c => c.symbol.endsWith("_USDT"))
      .map(c => c.symbol);

    const results = [];

    // PumpScore hesaplama
    function calcPumpScore(price, change, volume) {
      if (!price || !volume) return 0;
      return (
        Math.abs(change) * 12 +
        volume / 10000000 +
        price / 8000
      );
    }

    // 2) Her symbol için tek tek ticker isteği at
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];

      try {
        const url = `https://contract.mexc.com/api/v1/contract/ticker?symbol=${sym}`;
        const tickRes = await fetch(url);
        const tickJson = await tickRes.json();

        if (!tickJson || !tickJson.data) {
          results.push({
            id: i + 1,
            symbol: sym,
            price: null,
            change: null,
            volume: null,
            pumpScore: 0,
            exchange: "MEXC Futures"
          });
          continue;
        }

        const t = tickJson.data;

        const price = parseFloat(t.lastPrice || 0);
        const change = parseFloat((t.changeRate || 0) * 100);
        const volume = parseFloat(t.volume || 0);

        results.push({
          id: i + 1,
          symbol: sym,
          price,
          change,
          volume,
          pumpScore: parseFloat(calcPumpScore(price, change, volume).toFixed(2)),
          exchange: "MEXC Futures"
        });

      } catch (err) {
        results.push({
          id: i + 1,
          symbol: sym,
          price: null,
          change: null,
          volume: null,
          pumpScore: 0,
          exchange: "MEXC Futures"
        });
      }
    }

    // 3) PumpScore’a göre sırala → İlk 20 al
    const top20 = results
      .sort((a, b) => b.pumpScore - a.pumpScore)
      .slice(0, 20);

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
