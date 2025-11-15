export default async function handler(req, res) {
    try {

        const r = await fetch("https://contract.mexc.com/api/v1/contract/ticker");
        const raw = await r.json();

        if (!raw.success || !raw.data) {
            return res.status(500).json({
                success: false,
                error: "MEXC Futures veri hatası",
                raw: raw
            });
        }

        // Sadece USDT perpetual filtrele
        let filtered = raw.data.filter(c => c.symbol.endsWith("_USDT"));

        // PumpScore hesaplama
        const result = filtered.map((coin, index) => {

            const price = Number(coin.lastPrice);
            const change = Number(coin.riseFall);  // MEXC: riseFall = yüzde değil SAYI
            const volume = Number(coin.amount24);  // 24 saatlik USD volume

            let pumpScore = 0;

            if (!isNaN(change) && !isNaN(volume)) {
                pumpScore = (change * volume) / 1_000_000;
            }

            return {
                id: index + 1,
                symbol: coin.symbol,
                price: price,
                change: change / 100,      // yüzdeye çevirme → örn: 28 → 0.28 (%28)
                volume: volume,
                pumpScore: pumpScore,
                exchange: "MEXC Futures"
            };
        });

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: "API Hatası",
            details: err.toString()
        });
    }
}
