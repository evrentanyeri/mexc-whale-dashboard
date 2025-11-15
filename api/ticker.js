export default async function handler(req, res) {
  try {
    // 1) Coin listesini çek
    const detailRes = await fetch("https://contract.mexc.com/api/v1/contract/detail");
    const detailJson = await detailRes.json();

    if (!detailJson.data) {
      return res.status(500).json({ success: false, error: "Sözleşme listesi alınamadı", raw: detailJson });
    }

    const symbols = detailJson.data.map(c => c.symbol);

    // Sadece ilk 30 coin’e ticker isteği
    const limited = symbols.slice(0, 30);

    const results = [];

    for (let i = 0; i < limited.length; i++) {
      const sym = limited[i];

      const tickerRes = await fetch(
        `https://contract.mexc.com/api/v1/contract/ticker?symbol=${sym}`
      );

      const tickerJson = await tickerRes.json();

      if (tickerJson.success && tickerJson.data) {
        const d = tickerJson.data;
        results.push({
          id: i + 1,
          symbol: sym,
          price: Number(d.fairPrice || 0),
          change: Number(d.riseFallRate || 0),
          volume: Number(d.volume24 || 0),
          exchange: "MEXC Futures"
        });
      }
    }

    // Pump Score
    results.forEach(r => {
      r.pumpScore = Number(((r.volume / 1_000_000) * 0.4 + r.change * 2).toFixed(2));
    });

    // Skorla sırala + İlk 20
    const finalData = results.sort((a, b) => b.pumpScore - a.pumpScore).slice(0, 20);

    return res.status(200).json({ success: true, data: finalData });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.toString() });
  }
}
