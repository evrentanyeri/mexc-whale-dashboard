async function fetchData() {
    try {
        const r = await fetch("/api/ticker");
        const data = await r.json();

        if (!data.success || !data.data) {
            throw new Error("API veri yapısı hatalı");
        }

        const tbody = document.getElementById("signalTableBody");
        tbody.innerHTML = "";

        const coins = data.data.slice(0, 20); // sadece ilk 20 coin

        coins.forEach((coin, index) => {

            // güvenli sayı dönüştürme
            const price = Number(coin.price);
            const change = Number(coin.change);
            const volume = Number(coin.volume);
            const pumpScore = Number(coin.pumpScore);

            // bozuk değerleri düzelt (NaN ise '-' göster)
            const formattedPrice = isNaN(price) ? "-" : price.toFixed(4);
            const formattedChange = isNaN(change) ? "-" : (change * 100).toFixed(2) + "%";
            const formattedVolume = isNaN(volume) ? "-" : volume.toLocaleString();
            const formattedPump = isNaN(pumpScore) ? "-" : pumpScore.toFixed(2);

            const row = `
                <tr>
                    <td>${index + 1}</td>
                    <td>${coin.symbol}</td>
                    <td>${formattedPrice}</td>

                    <td style="color:${change >= 0 ? "lightgreen" : "red"}">
                        ${formattedChange}
                    </td>

                    <td>${formattedVolume}</td>
                    <td>${coin.exchange}</td>

                    <td style="color:${pumpScore >= 0 ? "gold" : "red"}">
                        ${formattedPump}
                    </td>
                </tr>
            `;

            tbody.innerHTML += row;
        });

    } catch (err) {
        console.error("Dashboard Hatası:", err);

        document.getElementById("signalTableBody").innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;color:red;">
                    Dashboard Hatası: ${err.message}
                </td>
            </tr>
        `;
    }
}

// 5 saniyede bir yenile
setInterval(fetchData, 5000);
fetchData();
