async function fetchData() {
  const tableBody = document.getElementById("signalTableBody");

  try {
    const res = await fetch("/api/ticker");
    const json = await res.json();

    if (!json.success) {
      tableBody.innerHTML = `
        <tr><td colspan="7" style="color:red; text-align:center;">
          API Hatası: ${json.error}
        </td></tr>`;
      return;
    }

    const data = json.data;

    tableBody.innerHTML = "";

    data.forEach((coin, index) => {
      const row = document.createElement("tr");

      // fiyat
      const price = coin.price ? coin.price.toFixed(4) : "-";

      // değişim rengi
      const changeColor = coin.change >= 0 ? "lightgreen" : "red";
      const changePercent = coin.change
        ? (coin.change * 100).toFixed(2)
        : "-";

      // hacim formatla
      const formatVolume = (v) => {
        if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + "B";
        if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
        if (v >= 1_000) return (v / 1_000).toFixed(2) + "K";
        return v;
      };

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${coin.symbol}</td>
        <td>${price}</td>
        <td style="color:${changeColor};">${changePercent}%</td>
        <td>${formatVolume(coin.volume)}</td>
        <td>${coin.exchange}</td>
        <td style="font-weight:bold; color:#ffd35a;">${coin.pumpScore}</td>
      `;

      tableBody.appendChild(row);
    });

  } catch (err) {
    console.error("Dashboard Hatası:", err);
    tableBody.innerHTML = `
      <tr><td colspan="7" style="color:red; text-align:center;">
        Dashboard Hatası: ${err}
      </td></tr>`;
  }
}

// 10 saniyede bir yenile
fetchData();
setInterval(fetchData, 10000);
