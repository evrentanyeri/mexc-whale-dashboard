export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://contract.mexc.com/api/v1/contract/detail",
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0",
        }
      }
    );

    if (!response.ok) {
      return res.status(500).json({ success: false, error: "MEXC HTTP hatası" });
    }

    const json = await response.json();

    if (!json.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC veri formatı hatalı",
        raw: json
      });
    }

    // Pump score fonksiyonu
    const calcPumpScore = (vol, change) => {
      return Number(((vol / 1_000_000) * 0.5 + change * 2).toFixed(2));
    };

    const coins = json.data.map((item, index) => ({
      id: index + 1,
      symbol: item.symbol,
      price: Number(item.fairPrice),
      change: Number(item.riseFallRate),
      volume: Number(item.volume24),
      pumpScore: calcPumpScore(Number(item.volume24), Number(item.riseFallRate)),
      exchange: "MEXC Futures"
    }));

    // Pump skoruna göre sırala
    const sorted = coins.sort((a, b) => b.pumpScore - a.pumpScore).slice(0, 20);

    return res.status(200).json({ success: true, data: sorted });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Sunucu hatası",
      detail: err.toString(),
    });
  }
}
