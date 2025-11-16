console.log("Dashboard JS Yüklendi");   // DEBUG

const API_URL = "/api/ticker";

/* ------------------------------
   PumpScore Neon Class Function
-------------------------------- */
function pumpClass(score) {
    score = Number(score);
    if (isNaN(score)) return "pump-low";

    if (score > 100) return "pump-high";
    if (score > 20)  return "pump-mid";
    return "pump-low";
}

/* ------------------------------
   RSI Hesaplama (yaklaşık RSI)
-------------------------------- */
function calculateRSI(changeRatio) {
    // changeRatio = 0.03 => %3
    const pct = changeRatio * 100;

    // basite indirgenmiş (fiyat ivmesi ağırlıklı)
    let rsi = 50 + pct * 2;

    if (rsi > 100) rsi = 100;
    if (rsi < 0)   rsi = 0;

    return Number(rsi.toFixed(2));
}

/* ------------------------------
   RSI BAR Oluşturma
-------------------------------- */
function rsiBar(rsi) {
    const total = 20; // toplam blok
    const filled = Math.round((rsi / 100) * total);
    const empty = total - filled;

    const bar = "■".repeat(filled) + "□".repeat(empty);

    return `<span class="rsi-bar">[${bar}]</span> <span class="rsi-num">${rsi}</span>`;
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
        console.log("Veri çekiliyor...");

        const res = await fetch(API_URL + "?t=" + Date.now());
        const json = await res.json();

        if (!json.success || !json.data) {
            document.getElementById("signalBody").innerHTML =
                `<tr><td colspan="8" class="loading">API Hatası</td></tr>`;
            return;
        }

        let data = json.data
            .filter(c => c.symbol.endsWith("USDT"))
            .slice(0, 20);

        let html = "";
        data.forEach((coin, i) => {

            const price = Number(coin.price) || 0;

            const rawChange = Number(coin.change);
            const change = isNaN(rawChange) ? 0 : rawChange;
            const changePercent = (change * 100).toFixed(2);
            const changeColor = change >= 0 ? "green" : "red";

            const volume = formatVolume(coin.volume);

            const pumpScore = isNaN(Number(coin.pumpSc
