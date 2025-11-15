export default async function handler(req, res) {
  try {
    const response = await fetch("https://contract.mexc.com/api/v1/contract/ticker");

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: "MEXC HTTP hatası",
        status: response.status,
        body: await response.text()
      });
    }

    let json;
    try {
      json = await response.json();
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: "JSON parse hatası",
        details: err.toString()
      });
    }

    if (!json?.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC verisi eksik",
        raw: json
      });
    }

    const list = Array.isArray(json.data) ? json.data : [json.data];

    // --- Pump Score formülü ---
    // Hacim + Fiyat Değişimi + Momentum etkisi
    const calcPumpScore = (v, c) => {
      const score =
        (v / 1_000_000) * 0.5 +  // 24H Volume (M = 50x etki)
        (c * 2) +               // price change %
        Math.random() * 3;      // mikro volatilite (bot için)
      return Number(score.toFixed(2));
    };

    const coins = list.map((item, index) => {
      const price = Number(item.lastPrice);
      const change = Number(item.riseFallRate);
      const volume = Number(item.volume24);

      return {
        id: index + 1,
        symbol: item.symbol,
        price,
        change,
        volume,
        exchange: "MEXC Futures",
        pumpScore: calcPumpScore(volume, change)
      };
    });

    // Pump Score yüksekten düşüğe sırala
    coins.sort((a, b) => b.pumpScore - a.pumpScore);

    const top20 = coins.slice(0, 20);

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
