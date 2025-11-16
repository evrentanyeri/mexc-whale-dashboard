console.log("Dashboard JS Yüklendi");   // DEBUG

const API_URL = "/api/ticker";

/* ------------------------------
   PumpScore Neon Class Function
-------------------------------- */
function pumpClass(score) {
    score = Number(score);
    if (isNaN(score)) return "pump-low";

    if (score > 70) return "pump-high";
    if (score > 30) return "pump-mid";
    return "pump-low";
}

/* ------------------------------
   HACİM FORMATLAMA
-------------------------------- */
function formatVolume(num) {
    if (!num || isNaN(num)) return "-";
    const n = Number(num);
    if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9)  return (n / 1e9).toFixed(2)  + "B";
    if (n >= 1e6)  return (n / 1e6).toFixed(2)  + "M";
    if (n >= 1e3)  return (n / 1e3).toFixed(2)  + "K";
    return n.toFixed(2);
}

/* ------------------------------
   VERİ ÇEKME
-------------------------------- */
async function fetchData() {
    try {
        console.log("Veri çekiliyor...");

        const res = await fetch(API_URL + "?t=" + Date.now());
        const json = await res.json();

        if (!json.success || !json.data) {
            document.getElementById("signalBody").innerHTML =
                `<tr><td colspan="8" class="loading">API Hatası</td></tr>`;
            return;
        }

        // İlk 20 USDT çiftleri
        let data = json.data
            .filter(c => c.symbol.endsWith("USDT"))
            .slice(0, 20);

        let html = "";

        data.forEach((coin, i) => {
            const price = Number(coin.price) || 0;

            // Değişim
            const change = Number(coin.change);
            const changePercent = isNaN(change) ? "0.00" : (change * 100).toFixed(2);
            const changeColor = change >= 0 ? "green" : "red";

            // Hacim
            const volume = formatVolume(coin.volume);

            // PumpScore
            const pumpScore = Number(coin.pumpScore) || 0;

            // RSI (sunucudan gelmiyorsa 50 veriyoruz)
            const rsi = Number(coin.rsi) || 50;

            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${coin.symbol}</td>
                    <td>${price.toFixed(4)}</td>
                    <td class="${changeColor}">${changePercent}%</td>
                    <td class="volume">${volume}</td>
                    <td>${coin.exchange}</td>

                    <td><span class="${pumpClass(pumpScore)}">
                        ${pumpScore.toFixed(2)}
                    </span></td>

                    <!-- SADE RSI SAYISI -->
                    <td class="rsi-num">
                        ${rsi.toFixed(2)}
                    </td>
                </tr>
            `;
        });

        document.getElementById("signalBody").innerHTML = html;
        console.log("Tablo güncellendi.");

    } catch (err) {
        console.error("Fetch Hatası:", err);
    }
}

fetchData();
setInterval(fetchData, 6000);
