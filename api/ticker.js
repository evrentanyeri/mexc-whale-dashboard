export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://contract.mexc.com/api/v1/contract/ticker"
    );

    const json = await response.json();

    // MEXC beklenen formatta dönmezse
    if (!json || !json.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC veri formatı hatalı",
        raw: json,
      });
    }

    // Güvenlik: data dizi değilse diziye çevir
    const list = Array.isArray(json.data) ? json.data : [json.data];

    // 🔥 SADECE USDT PERPETUAL SÖZLEŞMELER
    const usdtFutures = list.filter(
      (item) =>
        item &&
        typeof item.symbol === "string" &&
        item.symbol.endsWith("_USDT")
    );

    const processed = usdtFutures.map((item, index) => {
      // Fiyat
      const price = Number(
        item.lastPrice ?? item.fairPrice ?? 0
      );

      // Değişim oranı (0–1 arası) – MEXC bazı alan adları:
      // riseFallRate, changeRate, riseFall vb. olabilir
      const rawChange =
        item.riseFallRate ??
        item.changeRate ??
        item.riseFall ??
        0;
      const changeRatio = Number(rawChange) || 0; // 0.03 = %3

      // Hacim (USDT bazlı) – amount24 veya volume24
      const volume =
        Number(item.amount24 ?? item.volume24 ?? item.volume ?? 0) || 0;

      // -------------------------
      // 🔥 PumpScore 0–100 arası
      // -------------------------
      // 1) VolumeScore (0–60 arası)
      //    log10(volume) ile ölçekliyoruz
      let volumeScore = 0;
      if (volume > 0) {
        volumeScore = Math.log10(volume + 1) * 15; // teorik max ~ 180
      }
      if (volumeScore > 60) volumeScore = 60;

      // 2) ChangeScore (0–40 arası)
      //    % değişim ne kadar büyükse o kadar puan
      const changePct = Math.abs(changeRatio * 100); // 0.03 → 3
      let changeScore = changePct * 2; // 20% → 40
      if (changeScore > 40) changeScore = 40;

      // 3) Toplam PumpScore = 0–100
      const pumpRaw = volumeScore + changeScore; // max 100
      const pumpScore = Number(pumpRaw.toFixed(2));

      return {
        id: index + 1,
        symbol: item.symbol,
        price: isNaN(price) ? null : price,
        // front-end zaten change * 100 yapıyor, bu yüzden buraya oran olarak veriyoruz
        change: isNaN(changeRatio) ? 0 : changeRatio, // 0.03 = %3
        volume: volume,
        exchange: "MEXC Futures",
        pumpScore, // her zaman 0–100 arası
      };
    });

    // PumpScore’a göre sırala (büyükten küçüğe)
    processed.sort((a, b) => b.pumpScore - a.pumpScore);

    // İlk 20
    const top20 = processed.slice(0, 20);

    return res.status(200).json({
      success: true,
      data: top20,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Sunucu hatası",
      details: err.toString(),
    });
  }
}
