const API_URL = "/api/ticker";

/* Hacim Formatlama B-M-K-T */
function formatVolume(num) {
    if (!num || isNaN(num)) return "-";

    const n = Number(num);
    if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return n.toFixed(2);
}

async function fetchData() {
    try {
        const res = await fetch(API_URL);
        const json = await res.json();

        if (!json.success || !json.data) {
            document.getElementById("signalBody").innerHTML =
                `<tr><td colspan="7" class="loading">API Hatası</td></tr>`;
            return;
        }

        let data = json.data;

        // Sadece USDT Perp
        data = data.filter(coin => coin.symbol.endsWith("USDT"));

        // İlk 20
        data = data.slice(0, 20);

        let html = "";

        data.forEach((coin, i) => {
            const price = Number(coin.price) || 0;

            // NULL değişim durumunu düzelt
            const rawChange = Number(coin.change);
            const changeValue = isNaN(rawChange) ? 0 : rawChange;  
            const changePercent = (changeValue * 100).toFixed(2);
            const changeColor = changeValue >= 0 ? "green" : "red";

            const volume = formatVolume(coin.volume);
            const pump = Number(coin.pumpScore);
            const pumpScore = isNaN(pump) ? "0.00" : pump.toFixed(2);

            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${coin.symbol}</td>
                    <td>${price.toFixed(4)}</td>
                    <td class="${changeColor}">${changePercent}%</td>
                    <td class="volume">${volume}</td>
                    <td>${coin.exchange}</td>
                    <td class="pumpscore">${pumpScore}</td>
                </tr>
            `;
        });

        document.getElementById("signalBody").innerHTML = html;

    } catch (err) {
        console.log("Hata:", err);
        document.getElementById("signalBody").innerHTML =
            `<tr><td colspan="7" class="loading">Dashboard Hatası</td></tr>`;
    }
}

fetchData();
setInterval(fetchData, 6000);
