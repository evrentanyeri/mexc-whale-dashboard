// --------------------------------------
// 🔥 RSI Hesaplayıcı
// --------------------------------------
function calculateRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50; // Yeterli veri yoksa nötr

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 70; // hiç düşüş yok → aşırı alım
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

// --------------------------------------
// 🔥 MEXC API HANDLER
// --------------------------------------
export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://contract.mexc.com/api/v1/contract/ticker"
    );

    const json = await response.json();

    if (!json || !json.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC veri formatı hatalı",
        raw: json,
      });
    }

    const list = Array.isArray(json.data) ? json.data : [json.data];

    // ✔ SADECE USDT Perpetual
    const usdtFutures = list.filter(
      (item) =>
        item &&
        typeof item.symbol === "string" &&
        item.symbol.endsWith("_USDT")
    );

    const processed = [];

    // --------------------------------------
    // 🔥 Kline verisini toplu şekilde çekelim
    // --------------------------------------
    const klineResponse = await fetch(
      "https://contract.mexc.com/api/v1/contract/kline?symbol=BTC_USDT&period=Min1"
    );
    const sampleKline = await klineResponse.json();

    // Eğer MEXC rate-limit ile kline vermiyorsa kapanışları boş bırakacağız
    const closesMap = {};

    for (const item of usdtFutures) {
      try {
        const kl = await fetch(
          `https://contract.mexc.com/api/v1/contract/kline?symbol=${item.symbol}&period=Min1`
        );
        const kljson = await kl.json();

        if (kljson.data && Array.isArray(kljson.data)) {
          closesMap[item.symbol] = kljson.data
            .map((c) => Number(c[4])) // kapanış fiyatı
            .slice(-20); // son 20 kapanış
        }
      } catch (e) {
        closesMap[item.symbol] = [];
      }
    }

    // --------------------------------------
    // 🔥 Veri işleme
    // --------------------------------------
    usdtFutures.forEach((item, index) => {
      // Fiyat
      const price = Number(
        item.lastPrice ?? item.fairPrice ?? 0
      );

      // Değişim
      const rawChange =
        item.riseFallRate ??
        item.changeRate ??
        item.riseFall ??
        0;
      const changeRatio = Number(rawChange) || 0;

      // Hacim (USDT)
      const volume =
        Number(item.amount24 ?? item.volume24 ?? item.volume ?? 0) || 0;

      // --------------------------------------
      // 🔥 1) VolumeScore (0–60)
      // --------------------------------------
      let volumeScore = 0;
      if (volume > 0) {
        volumeScore = Math.log10(volume + 1) * 15;
      }
      if (volumeScore > 60) volumeScore = 60;

      // --------------------------------------
      // 🔥 2) ChangeScore (0–40)
      // --------------------------------------
      const changePct = Math.abs(changeRatio * 100);
      let changeScore = changePct * 2;
      if (changeScore > 40) changeScore = 40;

      // --------------------------------------
      // 🔥 3) RSI Score (0–20)
      // --------------------------------------
      const closes = closesMap[item.symbol] ?? [];
      const rsi = calculateRSI(closes);

      let rsiScore = 0;
      if (rsi < 25) rsiScore = 20;
      else if (rsi < 35) rsiScore = 15;
      else if (rsi < 45) rsiScore = 10;
      else if (rsi < 55) rsiScore = 6;
      else if (rsi < 65) rsiScore = 3;
      else rsiScore = 1;

      // --------------------------------------
      // 🔥 4) Toplam PumpScore
      // --------------------------------------
      const totalRaw = volumeScore + changeScore + rsiScore; // max 120
      const pumpScore = Number(((totalRaw / 120) * 100).toFixed(2)); // normalize 0–100

      processed.push({
        id: index + 1,
        symbol: item.symbol,
        price: isNaN(price) ? null : price,
        change: isNaN(changeRatio) ? 0 : changeRatio,
        volume,
        exchange: "MEXC Futures",
        pumpScore,
      });
    });

    processed.sort((a, b) => b.pumpScore - a.pumpScore);

    return res.status(200).json({
      success: true,
      data: processed.slice(0, 20),
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Sunucu hatası",
      details: err.toString(),
    });
  }
}
