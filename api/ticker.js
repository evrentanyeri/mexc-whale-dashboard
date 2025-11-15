export default async function handler(req, res) {
  try {
    const r = await fetch("https://contract.mexc.com/api/v1/contract/ticker");
    const data = await r.json();

    if (!data || !Array.isArray(data.data)) {
      return res.status(500).json({
        success: false,
        error: "MEXC veri formatı hatalı",
        raw: data
      });
    }

    // USDT Perpetual filtrele
    const usdtFutures = data.data.filter(item =>
      item.symbol.endsWith("_USDT")
    );

    // PumpScore hesapla & formatla
    const processed = usdtFutures.map((item, index) => ({
      id: index + 1,
      symbol: item.symbol,
      price: parseFloat(item.lastPrice).toFixed(4),
      change: (parseFloat(item.riseFallRate) * 100).toFixed(2),
      volume: parseFloat(item.volume).toFixed(2),
      exchange: "MEXC Futures",
      pumpScore: calcPumpScore(item)
    }));

    // PumpScore hesaplama fonksiyonu
    function calcPumpScore(item) {
      const change = Math.abs(parseFloat(item.riseFallRate) * 100);
      const vol = parseFloat(item.volume);

      if (isNaN(change) || isNaN(vol)) return 0;

      // 🔥 Pump algoritması
      return (change * 3 + Math.log10(vol + 1) * 15).toFixed(2);
    }

    // 🔥 PumpScore'a göre sırala
    processed.sort((a, b) => b.pumpScore - a.pumpScore);

    // 🔥 İlk 20'yi gönder
    const top20 = processed.slice(0, 20);

    return res.status(200).json({
      success: true,
      data: top20
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "API Hatası",
      details: err.toString()
    });
  }
}
