const axios = require('axios');

const BASE = 'https://api.openweathermap.org/data/2.5';
const KEY = process.env.OPENWEATHER_API_KEY;

async function fetchWeatherData(city) {
  const [currentRes, forecastRes] = await Promise.all([
    axios.get(`${BASE}/weather`, { params: { q: city, appid: KEY, units: 'metric' } }),
    axios.get(`${BASE}/forecast`, { params: { q: city, appid: KEY, units: 'metric' } }),
  ]);

  const c = currentRes.data;
  const current = {
    temp: c.main.temp,
    humidity: c.main.humidity,
    wind_speed: c.wind.speed,
    visibility: c.visibility ?? 10000,
    rainfall_1h: c.rain?.['1h'] ?? 0,
    description: c.weather[0].description,
    icon: c.weather[0].icon,
  };

  const forecast = forecastRes.data.list.slice(0, 16).map((item) => ({
    dt: item.dt,
    temp: item.main.temp,
    humidity: item.main.humidity,
    wind_speed: item.wind.speed,
    rainfall_3h: item.rain?.['3h'] ?? 0,
    description: item.weather[0].description,
  }));

  return { city: c.name, current, forecast };
}

module.exports = { fetchWeatherData };
