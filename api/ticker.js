// api/ticker.js

export default async function handler(req, res) {
  try {
    // 1) MEXC Futures Ticker endpoint'i (doğrusu bu)
    const response = await fetch("https://contract.mexc.com/api/v1/contract/ticker");

    // MEXC HTTP statüsü 200 değilse, ham cevabı loglayalım
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({
        success: false,
        error: "MEXC HTTP hatası",
        status: response.status,
        bodySample: text.slice(0, 300) // sadece ilk 300 karakteri döndürüyoruz
      });
    }

    // 2) JSON parse
    let mexcJson;
    try {
      mexcJson = await response.json();
    } catch (parseErr) {
      return res.status(502).json({
        success: false,
        error: "MEXC JSON parse hatası",
        details: parseErr.toString()
      });
    }

    // 3) Beklenen format: { success: true, code: 0, data: ... }
    if (!mexcJson || mexcJson.success !== true || !mexcJson.data) {
      return res.status(502).json({
        success: false,
        error: "MEXC API beklenmeyen yanıt",
        raw: mexcJson
      });
    }

    // data bazen tek obje, bazen dizi olabilir → ikisini de destekleyelim
    const rawTickers = Array.isArray(mexcJson.data)
      ? mexcJson.data
      : [mexcJson.data];

    // 4) Dashboard için sadeleştirilmiş liste
    const coins = rawTickers.map((t, index) => ({
      id: index + 1,
      symbol: t.symbol || "",
      price: Number(t.lastPrice || 0),
      changeRate: typeof t.riseFallRate === "number" ? t.riseFallRate : null,
      volume: Number(t.volume24 || 0),     // 24 saatlik kontrat hacmi
      exchange: "MEXC Futures"
    }));

    // 5) Hacme göre sırala, ilk 20 coin
    coins.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    const top20 = coins.slice(0, 20);

    // 6) Frontend'e JSON olarak gönder
    res.status(200).json({
      success: true,
      data: top20
    });
  } catch (err) {
    // Sunucuda beklenmeyen hata
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
      details: err.toString()
    });
  }
}
