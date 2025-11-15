export default async function handler(req, res) {
  try {
    const listRes = await fetch("https://contract.mexc.com/api/v1/contract/detail");
    const listJson = await listRes.json();

    if (!listJson || !listJson.data) {
      return res.status(500).json({
        success: false,
        error: "MEXC sözleşme listesi hatalı",
        raw: listJson
      });
    }

    const symbols = listJson.data
      .filter(c => c.symbol.endsWith("_USDT"))
      .map(c => c.symbol);

    const results = [];

    function calcPumpScore(price, change, volume) {
      if (!price || !volume) return 0;
      return (
        Math.abs(change) * 12 +
        volume / 10000000 +
        price / 8000
      );
    }

    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      try {
        const tickRes = await fetch(
          `https://contract.mexc.com/api/v1/contract/ticker?symbol=${sym}`
        );
        const tickJson = await tickRes.json();

        if (!tickJson || !tickJson.data) {
          results.push({
            id: i + 1,
            symbol: sym,
            price: null,
            change: null,
            volume: null,
            pumpScore: 0,
            exchange: "MEXC Futures"
          });
          continue;
        }

        const t = tickJson.data;
        const price = parseFloat(t.lastPrice || 0);
        const change = parseFloat((t.changeRate || 0) * 100);
        const volume = parseFloat(t.volume || 0);

        results.push({
          id: i + 1,
          symbol: sym,
          price,
          change,
          volume,
          pumpScore: parseFloat(calcPumpScore(price, change, volume).toFixed(2)),
          exchange: "MEXC Futures"
        });

      } catch (err) {
        results.push({
          id: i + 1,
          symbol: sym,
          price: null,
          change: null,
          volume: null,
          pumpScore: 0,
          exchange: "MEXC Futures"
        });
      }
    }

    const top20 = results
      .sort((a, b) => b.pumpScore - a.pumpScore)
      .slice(0, 20);

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
