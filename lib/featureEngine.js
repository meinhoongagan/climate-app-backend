function engineerFeatures(current, forecast) {
  // avg_temp_24h: average temp over next 24h (8 × 3h slots)
  const next24 = forecast.slice(0, 8);
  const avg_temp_24h =
    next24.length > 0
      ? next24.reduce((s, f) => s + f.temp, 0) / next24.length
      : current.temp;

  // rainfall_intensity: total rain over next 6h (2 × 3h slots) + current 1h
  const next6h = forecast.slice(0, 2);
  const rainfall_intensity =
    current.rainfall_1h * 6 + next6h.reduce((s, f) => s + f.rainfall_3h, 0);

  // humidity_trend: compare current humidity to avg of next 8h (≈3 slots)
  const next3 = forecast.slice(0, 3);
  const futureHumAvg =
    next3.length > 0
      ? next3.reduce((s, f) => s + f.humidity, 0) / next3.length
      : current.humidity;
  const humidity_trend =
    futureHumAvg > current.humidity + 5
      ? 'rising'
      : futureHumAvg < current.humidity - 5
      ? 'falling'
      : 'stable';

  return { avg_temp_24h, rainfall_intensity, humidity_trend };
}

module.exports = { engineerFeatures };
