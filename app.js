async function fetchData() {
    const tbody = document.getElementById("cryptoBody");

    tbody.innerHTML = `
        <tr><td colspan="6" class="loading">Yükleniyor...</td></tr>
    `;

    try {
        const res = await fetch("/api/ticker");  // artık backend’ten çekiyoruz
        const json = await res.json();

        let data = json.data;

        let futures = data.filter(item => item.symbol.endsWith("_USDT"));

        let formatted = futures.map((c) => ({
            symbol: c.symbol.replace("_", ""),
            price: parseFloat(c.lastPrice),
            percent: parseFloat((c.riseFallRate * 100).toFixed(2)),
            volume: formatVolume(c.volume),
            exchange: "MEXC Futures"
        }));

        formatted = formatted.sort((a, b) => b.percent - a.percent).slice(0, 20);

        tbody.innerHTML = "";

        formatted.forEach((coin, index) => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${coin.symbol}</td>
                <td>${coin.price}</td>
                <td style="color:${coin.percent >= 0 ? "lime" : "red"}">
                    ${coin.percent}%
                </td>
                <td>${coin.volume}</td>
                <td>${coin.exchange}</td>
            `;

            tbody.appendChild(row);
        });

    } catch (err) {
        console.error("Futures API Hatası:", err);
        tbody.innerHTML = `
            <tr><td colspan="6" class="loading" style="color:red">
                Futures verisi alınamadı!
            </td></tr>
        `;
    }
}

function formatVolume(num) {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
    return num.toFixed(2);
}

setInterval(fetchData, 8000);
fetchData();
