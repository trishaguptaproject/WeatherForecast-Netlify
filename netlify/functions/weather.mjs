export default async (req) => {
    try {
        const url = new URL(req.url);
        const city = url.searchParams.get("city");

        if (!city || !city.trim()) {
            return Response.json(
                { error: "Please enter a city name." },
                { status: 400 }
            );
        }

        // Find city coordinates
        const geoURL =
            "https://geocoding-api.open-meteo.com/v1/search?" +
            "name=" + encodeURIComponent(city.trim()) +
            "&count=10" +
            "&language=en" +
            "&format=json";

        const geoResponse = await fetch(geoURL);

        if (!geoResponse.ok) {
            throw new Error(
                "Geocoding service returned HTTP " + geoResponse.status
            );
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            return Response.json(
                { error: `City "${city}" was not found.` },
                { status: 404 }
            );
        }

        // Prefer an exact city-name match when possible
        const searchName = city.trim().toLowerCase();

        const location =
            geoData.results.find(
                item => item.name &&
                        item.name.toLowerCase() === searchName
            ) || geoData.results[0];

        const latitude = location.latitude;
        const longitude = location.longitude;

        // Get weather
        const weatherURL =
            "https://api.open-meteo.com/v1/forecast?" +
            "latitude=" + latitude +
            "&longitude=" + longitude +
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
            "&hourly=temperature_2m,weather_code" +
            "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
            "&timezone=auto" +
            "&forecast_days=7";

        const weatherResponse = await fetch(weatherURL);

        if (!weatherResponse.ok) {
            throw new Error(
                "Weather service returned HTTP " + weatherResponse.status
            );
        }

        const weatherData = await weatherResponse.json();

        return Response.json({
            location: {
                city: location.name,
                country: location.country || "",
                latitude: latitude,
                longitude: longitude,
                timezone: weatherData.timezone
            },

            current: {
                temperature: weatherData.current.temperature_2m,
                humidity: weatherData.current.relative_humidity_2m,
                feelsLike: weatherData.current.apparent_temperature,
                windSpeed: weatherData.current.wind_speed_10m,
                weatherCode: weatherData.current.weather_code,
                condition: getWeatherDescription(
                    weatherData.current.weather_code
                ),
                icon: getWeatherIcon(
                    weatherData.current.weather_code
                )
            },

            hourly: {
                time: weatherData.hourly.time,
                temperature: weatherData.hourly.temperature_2m,
                weatherCode: weatherData.hourly.weather_code
            },

            daily: {
                time: weatherData.daily.time,
                maxTemperature: weatherData.daily.temperature_2m_max,
                minTemperature: weatherData.daily.temperature_2m_min,
                weatherCode: weatherData.daily.weather_code
            }
        });

    } catch (error) {

        console.error("Weather function error:", error);

        return Response.json(
            {
                error: error.message || "Weather service failed."
            },
            { status: 500 }
        );
    }
};


function getWeatherDescription(code) {

    const descriptions = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    };

    return descriptions[code] || "Unknown weather";
}


function getWeatherIcon(code) {

    if (code === 0) return "☀️";

    if (code === 1 || code === 2) return "🌤️";

    if (code === 3) return "☁️";

    if ([45, 48].includes(code)) return "🌫️";

    if (
        [51, 53, 55, 56, 57, 61, 63, 65,
         66, 67, 80, 81, 82].includes(code)
    ) {
        return "🌧️";
    }

    if (
        [71, 73, 75, 77, 85, 86].includes(code)
    ) {
        return "❄️";
    }

    if ([95, 96, 99].includes(code)) {
        return "⛈️";
    }

    return "🌤️";
}
