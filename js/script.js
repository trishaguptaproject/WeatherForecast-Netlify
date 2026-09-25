document.addEventListener("DOMContentLoaded", function () {

    // ==============================
    // HOME PAGE
    // ==============================
    const searchForm = document.getElementById("searchForm");

    if (searchForm) {
        searchForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const cityInput = document.getElementById("cityInput");

            if (!cityInput) {
                alert("City input not found.");
                return;
            }

            const city = cityInput.value.trim();

            if (city === "") {
                alert("Please enter a city name.");
                return;
            }

            // Save city
            sessionStorage.setItem("weatherCity", city);

            // Open weather page
            window.location.href =
                "weather.html?city=" + encodeURIComponent(city);
        });
    }


    // ==============================
    // WEATHER PAGE
    // ==============================

    const weatherPage = document.getElementById("weatherPage");

    if (weatherPage) {
        loadWeatherPage();
    }


    // ==============================
    // LOAD WEATHER
    // ==============================

    async function loadWeatherPage() {

        const params = new URLSearchParams(window.location.search);

        let city = params.get("city");

        // If no city in URL, check session storage
        if (!city) {
            city = sessionStorage.getItem("weatherCity");
        }

        if (!city) {
            showError("Please search for a city first.");
            return;
        }

        // Put city name on page
        const locationName = document.getElementById("locationName");

        if (locationName) {
            locationName.textContent = city;
        }

        try {

            console.log("Searching weather for:", city);

            /*
             * IMPORTANT:
             * When running on localhost, directly use Open-Meteo.
             * When deployed on Netlify, use the Netlify Function.
             */

            const isLocal =
                window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1";

            let data;

            if (isLocal) {

                console.log("Running locally - using Open-Meteo directly.");

                data = await getWeatherFromOpenMeteo(city);

            } else {

                console.log("Running on Netlify - using Netlify Function.");

                const response = await fetch(
                    "/.netlify/functions/weather?city=" +
                    encodeURIComponent(city)
                );

                if (!response.ok) {
                    const errorText = await response.text();

                    console.error(
                        "Netlify Function Error:",
                        response.status,
                        errorText
                    );

                    throw new Error(
                        "Weather function returned error " +
                        response.status
                    );
                }

                data = await response.json();
            }

            console.log("Weather data received:", data);

            displayWeather(data);

            saveWeatherHistory(data);

        } catch (error) {

            console.error("Weather loading error:", error);

            showError(
                "Unable to load weather. " +
                "Please check the city name and try again."
            );
        }
    }


    // ==============================
    // OPEN-METEO DIRECT API
    // ==============================

    async function getWeatherFromOpenMeteo(city) {

        // STEP 1: Find city coordinates

        const geoURL =
            "https://geocoding-api.open-meteo.com/v1/search" +
            "?name=" + encodeURIComponent(city) +
            "&count=1" +
            "&language=en" +
            "&format=json";

        console.log("Geocoding URL:", geoURL);

        const geoResponse = await fetch(geoURL);

        if (!geoResponse.ok) {
            throw new Error("Geocoding API failed.");
        }

        const geoData = await geoResponse.json();

        console.log("Geocoding result:", geoData);

        if (
            !geoData.results ||
            geoData.results.length === 0
        ) {
            throw new Error(
                "City not found: " + city
            );
        }

        const location = geoData.results[0];

        const latitude = location.latitude;
        const longitude = location.longitude;


        // STEP 2: Get weather

        const weatherURL =
            "https://api.open-meteo.com/v1/forecast" +
            "?latitude=" + latitude +
            "&longitude=" + longitude +
            "&current=" +
            "temperature_2m," +
            "relative_humidity_2m," +
            "apparent_temperature," +
            "weather_code," +
            "wind_speed_10m" +
            "&hourly=" +
            "temperature_2m," +
            "weather_code" +
            "&daily=" +
            "weather_code," +
            "temperature_2m_max," +
            "temperature_2m_min" +
            "&timezone=auto" +
            "&forecast_days=7";

        console.log("Weather URL:", weatherURL);

        const weatherResponse = await fetch(weatherURL);

        if (!weatherResponse.ok) {
            throw new Error("Weather API failed.");
        }

        const weather = await weatherResponse.json();

        console.log("Open-Meteo weather:", weather);


        // Convert Open-Meteo response into our application's format

        return {

            location: {
                city: location.name,
                country: location.country || ""
            },

            current: {

                temperature:
                    weather.current.temperature_2m,

                humidity:
                    weather.current.relative_humidity_2m,

                feelsLike:
                    weather.current.apparent_temperature,

                windSpeed:
                    weather.current.wind_speed_10m,

                weatherCode:
                    weather.current.weather_code,

                condition:
                    getWeatherDescription(
                        weather.current.weather_code
                    ),

                icon:
                    getWeatherIcon(
                        weather.current.weather_code
                    )
            },

            hourly: {
                time:
                    weather.hourly.time,

                temperature:
                    weather.hourly.temperature_2m,

                weatherCode:
                    weather.hourly.weather_code
            },

            daily: {
                time:
                    weather.daily.time,

                maxTemperature:
                    weather.daily.temperature_2m_max,

                minTemperature:
                    weather.daily.temperature_2m_min,

                weatherCode:
                    weather.daily.weather_code
            }
        };
    }


    // ==============================
    // DISPLAY WEATHER
    // ==============================

    function displayWeather(data) {

        console.log("Displaying weather:", data);

        const locationName =
            document.getElementById("locationName");

        const weatherIcon =
            document.getElementById("weatherIcon");

        const temperature =
            document.getElementById("temperature");

        const weatherCondition =
            document.getElementById("weatherCondition");

        const feelsLike =
            document.getElementById("feelsLike");

        const humidity =
            document.getElementById("humidity");

        const windSpeed =
            document.getElementById("windSpeed");


        // Location

        if (locationName) {
            locationName.textContent =
                data.location.city +
                (data.location.country
                    ? ", " + data.location.country
                    : "");
        }


        // Temperature

        if (temperature) {
            temperature.textContent =
                Math.round(data.current.temperature) +
                "°C";
        }


        // Condition

        if (weatherCondition) {
            weatherCondition.textContent =
                data.current.condition;
        }


        // Icon

        if (weatherIcon) {
            weatherIcon.textContent =
                data.current.icon;
        }


        // Feels like

        if (feelsLike) {
            feelsLike.textContent =
                Math.round(data.current.feelsLike) +
                "°C";
        }


        // Humidity

        if (humidity) {
            humidity.textContent =
                data.current.humidity +
                "%";
        }


        // Wind

        if (windSpeed) {
            windSpeed.textContent =
                data.current.windSpeed +
                " km/h";
        }


        // Hourly

        displayHourlyForecast(data);


        // Daily

        displayDailyForecast(data);
    }


    // ==============================
    // HOURLY FORECAST
    // ==============================

    function displayHourlyForecast(data) {

        const container =
            document.getElementById("hourlyForecast");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        const times = data.hourly.time;
        const temperatures = data.hourly.temperature;
        const codes = data.hourly.weatherCode;


        // Find current hour

        const now = new Date();

        let startIndex = 0;

        for (let i = 0; i < times.length; i++) {

            const forecastTime =
                new Date(times[i]);

            if (forecastTime >= now) {
                startIndex = i;
                break;
            }
        }


        // Show next 12 hours

        for (
            let i = startIndex;
            i < Math.min(startIndex + 12, times.length);
            i++
        ) {

            const time =
                new Date(times[i]);

            const card =
                document.createElement("div");

            card.className =
                "hour-card";

            card.innerHTML = `
                <div>
                    ${time.toLocaleTimeString([], {
                        hour: "numeric"
                    })}
                </div>

                <div class="small-weather-icon">
                    ${getWeatherIcon(codes[i])}
                </div>

                <strong>
                    ${Math.round(temperatures[i])}°C
                </strong>
            `;

            container.appendChild(card);
        }
    }


    // ==============================
    // DAILY FORECAST
    // ==============================

    function displayDailyForecast(data) {

        const container =
            document.getElementById("dailyForecast");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        const times = data.daily.time;
        const maxTemps = data.daily.maxTemperature;
        const minTemps = data.daily.minTemperature;
        const codes = data.daily.weatherCode;


        for (
            let i = 0;
            i < times.length;
            i++
        ) {

            const date =
                new Date(times[i] + "T00:00:00");

            const card =
                document.createElement("div");

            card.className =
                "daily-card";

            card.innerHTML = `
                <div>
                    ${date.toLocaleDateString([], {
                        weekday: "short"
                    })}
                </div>

                <div class="small-weather-icon">
                    ${getWeatherIcon(codes[i])}
                </div>

                <strong>
                    ${Math.round(maxTemps[i])}°
                    /
                    ${Math.round(minTemps[i])}°
                </strong>
            `;

            container.appendChild(card);
        }
    }


    // ==============================
    // WEATHER DESCRIPTION
    // ==============================

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

        return descriptions[code] ||
            "Unknown weather";
    }


    // ==============================
    // WEATHER ICON
    // ==============================

    function getWeatherIcon(code) {

        if (code === 0) {
            return "☀️";
        }

        if (
            code === 1 ||
            code === 2
        ) {
            return "🌤️";
        }

        if (code === 3) {
            return "☁️";
        }

        if (
            code === 45 ||
            code === 48
        ) {
            return "🌫️";
        }

        if (
            [51, 53, 55, 56, 57,
             61, 63, 65, 66, 67,
             80, 81, 82].includes(code)
        ) {
            return "🌧️";
        }

        if (
            [71, 73, 75, 77,
             85, 86].includes(code)
        ) {
            return "❄️";
        }

        if (
            [95, 96, 99].includes(code)
        ) {
            return "⛈️";
        }

        return "🌤️";
    }


    // ==============================
    // ERROR
    // ==============================

    function showError(message) {

        console.error(message);

        const condition =
            document.getElementById(
                "weatherCondition"
            );

        const temperature =
            document.getElementById(
                "temperature"
            );

        const icon =
            document.getElementById(
                "weatherIcon"
            );


        if (condition) {
            condition.textContent =
                message;
        }

        if (temperature) {
            temperature.textContent =
                "--°C";
        }

        if (icon) {
            icon.textContent =
                "⚠️";
        }
    }


    // ==============================
    // SAVE HISTORY
    // ==============================

    function saveWeatherHistory(data) {

        const history =
            JSON.parse(
                localStorage.getItem(
                    "weatherHistory"
                ) || "[]"
            );


        const record = {

            city:
                data.location.city,

            country:
                data.location.country,

            temperature:
                data.current.temperature,

            condition:
                data.current.condition,

            date:
                new Date().toLocaleString()
        };


        history.unshift(record);


        // Keep only last 20 searches

        const limitedHistory =
            history.slice(0, 20);


        localStorage.setItem(
            "weatherHistory",
            JSON.stringify(limitedHistory)
        );
    }

});
