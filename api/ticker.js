export default async function handler(req, res) {
  try {
    // MEXC Futures Ticker Endpoint
    const r = await fetch("https://contract.mexc.com/api/v1/contract/ticker");
    const json = await r.json();

    if (!json || !json.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC veri formatı hatalı",
        raw: json
      });
    }

    // 🔥 SADECE USDT PERPETUAL FUTURES
    const onlyUSDT = json.data.filter(item => item.symbol.endsWith("_USDT"));

    // 🔥 PumpScore Hesaplama
    const processed = onlyUSDT.map((item, index) => {
      const price = parseFloat(item.lastPrice);
      const change = parseFloat(item.riseFallRate);  // yüzde değişim
      const volume = parseFloat(item.quoteVolume);   // quote vol (USDT hacmi)

      // PumpScore formülü
      const pumpScore =
        (isNaN(volume) ? 0 : volume / 1_000_000) * 0.4 +
        (isNaN(change) ? 0 : change * 2);

      return {
        id: index + 1,
        symbol: item.symbol,
        price: isNaN(price) ? null : price,
        change: isNaN(change) ? null : change,
        volume: isNaN(volume) ? null : volume,
        pumpScore: parseFloat(pumpScore.toFixed(2)),
        exchange: "MEXC Futures"
      };
    });

    res.status(200).json({
      success: true,
      data: processed
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: "MEXC bağlantı hatası",
      details: err.toString()
    });
  }
}
