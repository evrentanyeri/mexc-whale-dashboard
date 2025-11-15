// /api/ticker.js

export default async function handler(req, res) {
  try {
    const r = await fetch("https://contract.mexc.com/api/v1/contract/ticker");
    const json = await r.json();

    if (!json || !json.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC veri formatı hatalı",
        raw: json
      });
    }

    // Bazı ortamlarda data obje, bazılarında dizi olabiliyor
    const list = Array.isArray(json.data) ? json.data : [json.data];

    // 🔥 SADECE USDT PERPETUAL FUTURES
    const onlyUSDT = list.filter(
      (item) => typeof item.symbol === "string" && item.symbol.endsWith("_USDT")
    );

    const processed = onlyUSDT.map((item, index) => {
      const price = Number(item.lastPrice);          // Son fiyat
      const changeRate = Number(item.riseFallRate);  // Örn: -0.0176  (% değil, oran)
      const amount24 = Number(item.amount24);        // 24h notional hacim (USDT)
      const volume24 = Number(item.volume24);        // 24h kontrat adedi

      // 🔥 PumpScore: hem hacim hem değişim birleşik skor
      const volumeScore = isNaN(amount24) ? 0 : amount24 / 1_000_000; // milyon USDT
      const changeScore = isNaN(changeRate) ? 0 : changeRate * 100;   // % cinsinden

      const pumpScore = Number((volumeScore * 0.4 + changeScore * 0.6).toFixed(2));

      return {
        id: index + 1,
        symbol: item.symbol,
        price: isNaN(price) ? null : price,
        change: isNaN(changeRate) ? null : changeRate, // oran
        volume: isNaN(amount24) ? null : amount24,     // USDT bazlı hacim
        contracts: isNaN(volume24) ? null : volume24,  // istersek sonra kullanırız
        pumpScore,
        exchange: "MEXC Futures"
      };
    });

    // Server tarafında da skora göre sırala
    processed.sort((a, b) => b.pumpScore - a.pumpScore);

    return res.status(200).json({
      success: true,
      data: processed
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "MEXC bağlantı hatası",
      details: err.toString()
    });
  }
}
