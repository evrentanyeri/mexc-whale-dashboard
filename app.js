console.log("Dashboard JS Yüklendi");   // DEBUG

const API_URL = "http://api.chainove.com";

/* ------------------------------
   PumpScore Neon Class Function
-------------------------------- */
function pumpClass(score) {
    score = Number(score);
    if (isNaN(score)) return "pump-low";

    if (score > 100) return "pump-high";
    if (score > 20) return "pump-mid";
    return "pump-low";
}

/* ------------------------------
   Hacim Formatlama
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
   Veri Çekme ve Tablo Güncelleme
-------------------------------- */
async function fetchData() {
    try {
        console.log("Veri çekiliyor...");    // DEBUG

        const res = await fetch(API_URL + "?t=" + Date.now()); 
        const json = await res.json();

        if (!json.success || !json.data) {
            document.getElementById("signalBody").innerHTML =
                `<tr><td colspan="7" class="loading">API Hatası</td></tr>`;
            return;
        }

        // USDT çiftleri + ilk 20 filtre
        let data = json.data
            .filter(c => c.symbol.endsWith("USDT"))
            .slice(0, 20);

        let html = "";
        data.forEach((coin, i) => {

            // PRICE
            const price = Number(coin.price) || 0;

            // CHANGE
            const rawChange = Number(coin.change);
            const change = isNaN(rawChange) ? 0 : rawChange;
            const changePercent = (change * 100).toFixed(2);
            const changeColor = change >= 0 ? "green" : "red";

            // VOLUME
            const volume = formatVolume(coin.volume);

            // PUMP SCORE (Neon)
            const pumpScore =
                isNaN(Number(coin.pumpScore)) ? 0 : Number(coin.pumpScore);

            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${coin.symbol}</td>
                    <td>${price.toFixed(4)}</td>
                    <td class="${changeColor}">${changePercent}%</td>
                    <td class="volume">${volume}</td>
                    <td>${coin.exchange}</td>

                    <!-- PUMP SCORE - NEON -->
                    <td>
                        <span class="${pumpClass(pumpScore)}">
                            ${pumpScore.toFixed(2)}
                        </span>
                    </td>
                </tr>
            `;
        });

        document.getElementById("signalBody").innerHTML = html;
        console.log("Tablo güncellendi.");   // DEBUG

    } catch (err) {
        console.error("Fetch Hatası:", err);
    }
}

/* ------------------------------
   Otomatik Güncelleme
-------------------------------- */
fetchData();
setInterval(fetchData, 6000);
