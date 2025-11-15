export default async function handler(req, res) {
    try {
        const symbols = [
            "BTC_USDT","ETH_USDT","SOL_USDT","ZEC_USDT","XRP_USDT","SUI_USDT",
            "LTC_USDT","COAI_USDT","CROSS_USDT","STRK_USDT","DASH_USDT",
            "BEAT_USDT","PIEVERSE_USDT","ASTER_USDT","MYX_USDT","TAO_USDT",
            "DREAMSX402_USDT","BULLISH_USDT","DOGE_USDT","SOONNETWORK_USDT"
        ];

        let results = [];

        for (let sym of symbols) {
            const r = await fetch(`https://contract.mexc.com/api/v1/contract/ticker?symbol=${sym}`);
            const json = await r.json();

            if (json.data) {
                results.push({
                    symbol: sym,
                    price: Number(json.data.lastPrice),
                    change: Number(json.data.priceChangeRate),   // ← gerçek değişim %
                    volume: Number(json.data.volume24),          // ← gerçek 24h hacim
                    exchange: "MEXC Futures",
                    pumpScore: 0
                });
            }
        }

        res.status(200).json({
            success: true,
            data: results
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Backend Error",
            details: err.toString()
        });
    }
}
