console.log("Dashboard JS Yüklendi");

const API_URL = "/api/ticker";

/* PumpScore sınıfı */
function pumpClass(score) {
    score = Number(score);
    if (score > 70) return "pump-high";
    if (score > 20) return "pump-mid";
    return "pump-low";
}

/* Hacim formatlama */
function formatVolume(num) {
    if (!num || isNaN(num)) return "-";
    const n = Number(num);
    if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return n.toFixed(2);
}

/* ===========================
   BASİT RSI HESAPLAMA
=========================== */
function calcRSI(change) {
    const pct = change * 100; 
    let rsi = 50 + pct;

    if (rsi > 100) rsi = 100;
    if (rsi < 0) rsi = 0;

    return rsi.toFixed(2);
}

/* ===========================
   VERİ ÇEKME
=========================== */
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

        let data = json.data.slice(0, 20);

        let html = "";
        data.forEach((coin, i) => {

            const price = Number(coin.price) || 0;

            const rawChange = Number(coin.change);
            const change = isNaN(rawChange) ? 0 : rawChange;
            const changePercent = (change * 100).toFixed(2);
            const changeColor = change >= 0 ? "green" : "red";

            const volume = formatVolume(coin.volume);

            const pumpScore = Number(coin.pumpScore) || 0;

            const rsi = calcRSI(change);

            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${coin.symbol}</td>
                    <td>${price.toFixed(4)}</td>
                    <td class="${changeColor}">${changePercent}%</td>
                    <td class="volume">${volume}</td>
                    <td>${coin.exchange}</td>
                    <td><span class="${pumpClass(pumpScore)}">${pumpScore.toFixed(2)}</span></td>
                    <td class="rsi">${rsi}</td>
                </tr>
            `;
        });

        document.getElementById("signalBody").innerHTML = html;

        console.log("Tablo güncellendi.");

    } catch (err) {
        console.error("Fetch Hatası:", err);
    }
}

/* ===========================
   GERİ SAYIM
=========================== */
const REFRESH_INTERVAL = 6;
let countdown = REFRESH_INTERVAL;

function startCountdown() {
    const el = document.getElementById("countdown");

    setInterval(() => {
        countdown--;
        if (countdown <= 0) countdown = REFRESH_INTERVAL;
        el.innerText = countdown;
    }, 1000);
}

startCountdown();

/* Dashboard update + geri sayım reset */
async function updateDashboard() {
    await fetchData();
    countdown = REFRESH_INTERVAL;
    document.getElementById("countdown").innerText = countdown;
}

updateDashboard();
setInterval(updateDashboard, REFRESH_INTERVAL * 1000);
