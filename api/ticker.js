export default async function handler(req, res) {
  try {
    // Tüm futures çiftlerini çeken doğru endpoint
    const response = await fetch(
      "https://contract.mexc.com/api/v1/contract/ticker?symbol=all"
    );

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: "MEXC HTTP hatası",
        status: response.status,
      });
    }

    const json = await response.json();

    if (!json?.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC veri formatı hatalı",
        raw: json,
      });
    }

    const list = json.data;

    // Pump Score hesaplayan küçük fonksiyon
    const calcPumpScore = (vol, change) => {
      return Number(((vol / 1_000_000) * 0.5 + change * 2).toFixed(2));
    };

    // Veriyi normalize ediyoruz
    const coins = list.map((item, index) => {
      const price = Number(item.fairPrice);
      const change = Number(item.riseFallRate);
      const volume = Number(item.volume24);

      return {
        id: index + 1,
        symbol: item.symbol,
        price,
        change,
        volume,
        exchange: "MEXC Futures",
        pumpScore: calcPumpScore(volume, change),
      };
    });

    // Pump skoruna göre sırala
    coins.sort((a, b) => b.pumpScore - a.pumpScore);

    // İlk 20
    const top20 = coins.slice(0, 20);

    res.status(200).json({
      success: true,
      data: top20,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
      details: err.toString(),
    });
  }
}
