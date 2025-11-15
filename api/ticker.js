// --------------------------------------
// 🔵 RSI Hesaplama
// --------------------------------------
function calculateRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  if (losses === 0) return 70;

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

// --------------------------------------
// 🔥 Funding Score (0–30)
// --------------------------------------
function fundingScore(rate) {
  if (rate === null || isNaN(rate)) return 0;

  const r = Math.abs(rate) * 10000; // normalize
  if (r > 30) return 30;
  return r;
}

// --------------------------------------
// 🟣 OI Score (Open Interest) (0–40)
// --------------------------------------
function oiScore(oiValue) {
  if (!oiValue || oiValue <= 0) return 0;

  let score = Math.log10(oiValue) * 8;
  if (score > 40) score = 40;
  return score;
}

// --------------------------------------
// 🟡 Volume Spike (0–30)
// --------------------------------------
function volumeSpikeScore(volume, avgVolume) {
  if (!volume || !avgVolume) return 0;
  const spike = volume / avgVolume;

  if (spike >= 4) return 30;
  if (spike >= 3) return 22;
  if (spike >= 2) return 15;
  if (spike >= 1.5) return 10;
  return 5;
}

// --------------------------------------
// 🔥 ANA API
// --------------------------------------
export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://contract.mexc.com/api/v1/contract/ticker"
    );
    const json = await response.json();

    if (!json || !json.data)
      return res.status(500).json({ success: false, error: "MEXC veri hatalı", raw: json });

    const list = Array.isArray(json.data) ? json.data : [json.data];

    const usdtFutures = list.filter(
      (x) => x && typeof x.symbol === "string" && x.symbol.endsWith("_USDT")
    );

    // -------------------------------------
    // 🔥 Funding + OI Verileri Topla
    // -------------------------------------
    const fundingRes = await fetch("https://contract.mexc.com/api/v1/contract/funding_rate");
    const fundingJson = await fundingRes.json();

    const oiRes = await fetch("https://contract.mexc.com/api/v1/contract/open_interest");
    const oiJson = await oiRes.json();

    const fundingMap = {};
    const oiMap = {};

    if (fundingJson.data) {
      fundingJson.data.forEach((f) => {
        fundingMap[f.symbol] = Number(f.fundingRate ?? 0);
      });
    }

    if (oiJson.data) {
      oiJson.data.forEach((o) => {
        oiMap[o.symbol] = Number(o.openInterest ?? 0);
      });
    }

    // -------------------------------------
    // 🔥 Kline (RSI & Spike İçin)
    // -------------------------------------
    const closesMap = {};
    const avgVolumeMap = {};

    for (const item of usdtFutures) {
      try {
        const kl = await fetch(
          `https://contract.mexc.com/api/v1/contract/kline?symbol=${item.symbol}&period=Min1`
        );
        const kjson = await kl.json();

        if (kjson.data) {
          const data = kjson.data.slice(-40);

          const closes = data.map((c) => Number(c[4]));
          const volumes = data.map((c) => Number(c[5]));

          closesMap[item.symbol] = closes;
          avgVolumeMap[item.symbol] =
            volumes.reduce((a, b) => a + b, 0) / volumes.length;
        }
      } catch {
        closesMap[item.symbol] = [];
        avgVolumeMap[item.symbol] = 0;
      }
    }

    // -------------------------------------
    // 🔵 Veri İşleme
    // -------------------------------------
    const processed = usdtFutures.map((item, index) => {
      const price = Number(item.lastPrice ?? item.fairPrice ?? 0);
      const changeRatio =
        Number(
          item.riseFallRate ??
          item.changeRate ??
          item.riseFall
        ) || 0;

      const volume =
        Number(item.amount24 ?? item.volume24 ?? item.volume ?? 0) || 0;

      // -------------------------
      // Puan Hesaplama
      // -------------------------
      // VolumeScore (0–60)
      let volumeScore = Math.log10(volume + 1) * 15;
      if (volumeScore > 60) volumeScore = 60;

      // ChangeScore (0–40)
      let changeScore = Math.abs(changeRatio * 100) * 2;
      if (changeScore > 40) changeScore = 40;

      // RSI Score (0–20)
      const rsi = calculateRSI(closesMap[item.symbol] || []);
      let rsiScore = rsi < 30 ? 20 : rsi < 40 ? 12 : rsi < 50 ? 8 : rsi < 60 ? 4 : 2;

      // Funding Score (0–30)
      const fRate = fundingMap[item.symbol] ?? 0;
      const fScore = fundingScore(fRate);

      // OI Score (0–40)
      const oiVal = oiMap[item.symbol] ?? 0;
      const oiSc = oiScore(oiVal);

      // Volume Spike (0–30)
      const spikeScore = volumeSpikeScore(
        volume,
        avgVolumeMap[item.symbol] ?? 0
      );

      // -------------------------------------
      // 🔥 Toplam PumpScore
      // max toplam ~220 puan → normalize → 0–100
      // -------------------------------------
      const total =
        volumeScore +
        changeScore +
        rsiScore +
        fScore +
        oiSc +
        spikeScore;

      const pumpScore = Number(((total / 220) * 100).toFixed(2));

      return {
        id: index + 1,
        symbol: item.symbol,
        price,
        change: changeRatio,
        volume,
        exchange: "MEXC Futures",
        pumpScore,
      };
    });

    processed.sort((a, b) => b.pumpScore - a.pumpScore);

    res.status(200).json({ success: true, data: processed.slice(0, 20) });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
      details: err.toString(),
    });
  }
}
