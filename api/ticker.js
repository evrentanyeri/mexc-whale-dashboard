export default async function handler(req, res) {
    try {
        const r = await fetch("https://contract.mexc.com/api/v1/contract/details");
        const json = await r.json();
        res.status(200).json(json);
    } catch (err) {
        res.status(500).json({
            error: "MEXC bağlantı hatası",
            details: err.toString()
        });
    }
}
