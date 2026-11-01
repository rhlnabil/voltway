// src/services/weather.ts

export type WeatherInfo = {
  temperature: number;
  weatherCode: number;
  description: string;
  icon: string;
  autonomyPenalty: number; // en pourcentage (ex: 15 pour -15%)
};

const WEATHER_MAP: Record<number, { desc: string; icon: string }> = {
  0: { desc: 'Ciel dégagé', icon: '☀️' },
  1: { desc: 'Principalement dégagé', icon: '🌤️' },
  2: { desc: 'Partiellement nuageux', icon: '⛅' },
  3: { desc: 'Couvert', icon: '☁️' },
  45: { desc: 'Brouillard', icon: '🌫️' },
  48: { desc: 'Brouillard givrant', icon: '🌫️' },
  51: { desc: 'Bruine légère', icon: '🌦️' },
  53: { desc: 'Bruine modérée', icon: '🌦️' },
  55: { desc: 'Bruine dense', icon: '🌧️' },
  61: { desc: 'Pluie légère', icon: '🌧️' },
  63: { desc: 'Pluie modérée', icon: '🌧️' },
  65: { desc: 'Pluie forte', icon: '🌧️' },
  71: { desc: 'Neige légère', icon: '🌨️' },
  73: { desc: 'Neige modérée', icon: '🌨️' },
  75: { desc: 'Neige forte', icon: '❄️' },
  95: { desc: 'Orage', icon: '⛈️' },
};

export async function fetchWeather(
  lat: number,
  lon: number
): Promise<WeatherInfo | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

    const data = await res.json();
    const temp = data.current.temperature_2m;
    const code = data.current.weather_code;

    let penalty = 0;
    if (temp < 20) {
      penalty = (20 - temp) * 1;
    } else if (temp > 30) {
      penalty = (temp - 30) * 0.5;
    }

    const mapped = WEATHER_MAP[code] ?? { desc: 'Inconnu', icon: '🌡️' };

    return {
      temperature: temp,
      weatherCode: code,
      description: mapped.desc,
      icon: mapped.icon,
      autonomyPenalty: Math.round(penalty),
    };
  } catch (e) {
    console.warn('[weather]', e);
    return null;
  }
}