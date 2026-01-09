export async function handler(event) {
    // CORS headers for browser requests
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers,
            body: ""
        };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    try {
        const { location } = JSON.parse(event.body);

        if (!location || typeof location !== "string" || location.trim().length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Valid location is required" })
            };
        }

        // 🔧 FIX: Don't append ", Nigeria" again - frontend already does this
        const query = encodeURIComponent(location.trim());
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=ng`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "HauserNG/1.0 (support@hauser.ng)",
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Nominatim API error:", response.status, response.statusText);
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({ error: "Geocoding service unavailable" })
            };
        }

        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: "Location not found",
                    message: "Could not find coordinates for this location. Please be more specific."
                })
            };
        }

        const latitude = parseFloat(data[0].lat);
        const longitude = parseFloat(data[0].lon);

        // 🔧 FIX: Validate coordinates are valid numbers
        if (isNaN(latitude) || isNaN(longitude)) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: "Invalid coordinates",
                    message: "Received invalid coordinates from geocoding service"
                })
            };
        }

        // 🔧 FIX: Validate coordinates are within Nigeria's bounds
        // Nigeria: lat ~4° to ~14°N, lon ~3° to ~15°E
        if (latitude < 4 || latitude > 14 || longitude < 2.5 || longitude > 15) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: "Location outside Nigeria",
                    message: "The coordinates found are outside Nigeria. Please check the location."
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                latitude,
                longitude,
                displayName: data[0].display_name || location
            })
        };

    } catch (err) {
        console.error("Geocoding error:", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Geocoding failed",
                message: err.message || "An unexpected error occurred"
            })
        };
    }
}