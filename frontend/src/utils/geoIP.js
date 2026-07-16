export function getCountryFlag(countryCode) {
  if (!countryCode) return '';
  return countryCode
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

// POST to ip-api.com/batch
// Expects an array of IPs, returns an array of objects
export async function fetchGeoIPBatch(ips) {
  if (!ips || ips.length === 0) return [];

  // ip-api limits batch to 100 max, but we batch in max 10 to be safe
  const chunks = [];
  for (let i = 0; i < ips.length; i += 10) {
    chunks.push(ips.slice(i, i + 10));
  }

  let results = [];

  for (const chunk of chunks) {
    try {
      const response = await fetch('http://ip-api.com/batch', {
        method: 'POST',
        body: JSON.stringify(chunk.map(query => ({ query, fields: 'query,country,countryCode,city,status' }))),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        results = results.concat(data);
      }
    } catch (e) {
      console.error("GeoIP Batch Fetch Error:", e);
    }
  }

  return results;
}
