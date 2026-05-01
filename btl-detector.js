/* BTL Detection based on GeoJSON and KML polygon maps (uses free Nominatim geocoding) */
import { getData } from './database.js';

let btlPolygons = null;

function updateMapWithIframe(lat, lon) {
    const mapDiv = document.getElementById('btlMap');
    if (!mapDiv) return;

    mapDiv.style.display = 'block';
    
    // Create iframe + overlay once
    if (!document.getElementById('btlMapIframe')) {
        mapDiv.innerHTML = '';
        
        const iframe = document.createElement('iframe');
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.style.border = '0';
        iframe.id = 'btlMapIframe';
        mapDiv.appendChild(iframe);
        
        const overlay = document.createElement('div');
        overlay.className = 'map-overlay-container';
        overlay.innerHTML = `
            <div class="map-marker-overlay">
                <div class="pin-icon"></div>
                <div class="pin-pulse"></div>
            </div>
        `;
        mapDiv.appendChild(overlay);
    }
    
    const iframe = document.getElementById('btlMapIframe');
    iframe.src = `https://www.google.com/maps/d/embed?mid=1IZQYhjM25zcrjnTEByfibpcDAE59r9o&ll=${lat},${lon}&z=14`;
}

/* Map of BTL -> primary local filename (usually geojson). We'll try geojson first, then attempt a same-base KML file if geojson missing. */
export const BTL_FILES = {
    '01º BPM/M': '1.BPM_M (3).geojson',
    '02º BPM/M': '2.BPM_M (3).geojson',
    '03º BPM/M': '3.BPM_M (5).geojson',
    '04º BPM/M': '4.BPM_M.geojson',
    '05º BPM/M': '5.BPM_M.geojson',
    '06º BPM/M': '6.BPM_M.geojson',
    '07º BPM/M': '7.BPM_M (8).geojson',
    '08º BPM/M': '8.BPM_M.geojson',
    '09º BPM/M': '9.BPM_M.geojson',
    '10º BPM/M': '10.BPM_M.geojson',
    '11º BPM/M': '11.BPM_M (6).geojson',
    '12º BPM/M': '12.BPM_M.geojson',
    '13º BPM/M': '13.BPM_M (6).geojson',
    '14º BPM/M': '14.BPM_M.geojson',
    '15º BPM/M': '15.BPM_M.geojson',
    '16º BPM/M': '16.BPM_M.geojson',
    '17º BPM/M': '17.BPM_M.geojson',
    '18º BPM/M': '18.BPM_M.geojson',
    '19º BPM/M': '19.BPM_M.geojson',
    '20º BPM/M': '20.BPM_M.geojson',
    '21º BPM/M': '21.BPM_M.geojson',
    '22º BPM/M': '22.BPM_M (4).geojson',
    '23º BPM/M': '23.BPM_M.geojson',
    '24º BPM/M': '24.BPM_M.geojson',
    '25º BPM/M': '25.BPM_M.geojson',
    '26º BPM/M': '26.BPM_M.geojson',
    '27º BPM/M': '27.BPM_M.geojson',
    '28º BPM/M': '28.BPM_M (4).geojson',
    '29º BPM/M': '29.BPM_M.geojson',
    '30º BPM/M': '30.BPM_M.geojson',
    '31º BPM/M': '31.BPM_M.geojson',
    '32º BPM/M': '32.BPM_M.geojson',
    '33º BPM/M': '33.BPM_M.geojson',
    '35º BPM/M': '35.BPM_M.geojson',
    '36º BPM/M': '36.BPM_M.geojson',
    '37º BPM/M': '37.BPM_M.geojson',
    '38º BPM/M': '38.BPM_M.geojson',
    '39º BPM/M': '39.BPM_M.geojson',
    '43º BPM/M': '43.BPM_M.geojson',
    '46º BPM/M': '46.BPM_M.geojson',
    '48º BPM/M': '48.BPM_M.geojson',
    '49º BPM/M': '49.BPM_M.geojson'
};

/* Search recent attendances for historical BTL by exact rua+numero (fast fallback) */
async function findHistoricalBTL(rua, numero, municipio) {
    if (!rua || !numero) return null;
    
    try {
        const atendimentos = await getData('atendimentos');
        if (!atendimentos) return null;

        const ruaSearch = rua.toUpperCase().trim();
        const numeroSearch = numero.toUpperCase().trim();
        const municipioSearch = municipio ? municipio.toUpperCase().trim() : '';

        const entries = Object.values(atendimentos).sort((a, b) => b.timestamp - a.timestamp);

        for (const atendimento of entries) {
            if (!atendimento.rua || !atendimento.numero || !atendimento.btl) continue;
            
            const r = atendimento.rua.toUpperCase().trim();
            const n = atendimento.numero.toUpperCase().trim();
            
            if (r === ruaSearch && n === numeroSearch) {
                if (municipioSearch && atendimento.municipio) {
                    if (atendimento.municipio.toUpperCase().trim() === municipioSearch) {
                        return atendimento.btl;
                    }
                } else {
                    return atendimento.btl;
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Error finding historical BTL:', error);
        return null;
    }
}

/* Attempt to load GeoJSON or fallback to parsing a KML with same base name */
async function tryLoadFileAsGeoJSON(baseFilename) {
    // Try exact filename first (geojson)
    try {
        const res = await fetch(`/${baseFilename}`);
        if (res.ok) {
            const json = await res.json();
            // basic validation
            if (json && json.type === 'FeatureCollection') return json;
        }
    } catch (err) {
        // continue to kml attempt
    }

    // Attempt to find same-base KML (replace extension with .kml)
    const base = baseFilename.replace(/\.[^.]+$/, '');
    const kmlCandidates = [
        `${base}.kml`,
        `${base}.KML`
    ];

    for (const kmlName of kmlCandidates) {
        try {
            const r = await fetch(`/${kmlName}`);
            if (r.ok) {
                const text = await r.text();
                const geojson = parseKMLtoGeoJSON(text);
                if (geojson) return geojson;
            }
        } catch (err) {
            // ignore and try next
        }
    }

    // Not found
    return null;
}

/* Minimal KML -> GeoJSON parser: extracts Polygon and MultiGeometry coordinates from <coordinates> tags.
   Builds a FeatureCollection with Polygon/MultiPolygon features. */
function parseKMLtoGeoJSON(kmlText) {
    if (!kmlText) return null;
    try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(kmlText, 'text/xml');
        if (!xml) return null;

        const placemarks = Array.from(xml.getElementsByTagName('Placemark'));
        const features = [];

        placemarks.forEach(pm => {
            // find any <coordinates> nodes inside this placemark
            const coordNodes = Array.from(pm.getElementsByTagName('coordinates'));
            const polygons = [];

            coordNodes.forEach(node => {
                const coordsText = node.textContent.trim();
                if (!coordsText) return;

                // coordinates may be separated by whitespace; each coord is lon,lat[,alt]
                const rawCoords = coordsText.split(/\s+/).map(s => s.trim()).filter(Boolean);
                const ring = rawCoords.map(item => {
                    const parts = item.split(',').map(p => p.trim());
                    const lon = parseFloat(parts[0]);
                    const lat = parseFloat(parts[1]);
                    return [lon, lat];
                }).filter(c => !Number.isNaN(c[0]) && !Number.isNaN(c[1]));

                if (ring.length > 0) {
                    polygons.push(ring);
                }
            });

            if (polygons.length === 0) return;

            // If there's more than one polygon set, treat as MultiPolygon
            if (polygons.length === 1) {
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [polygons[0]]
                    },
                    properties: {}
                });
            } else {
                // MultiPolygon expects array of polygons, each polygon is array of rings
                const mp = polygons.map(ring => [ring]);
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'MultiPolygon',
                        coordinates: mp
                    },
                    properties: {}
                });
            }
        });

        if (features.length === 0) return null;

        return {
            type: 'FeatureCollection',
            features
        };
    } catch (err) {
        console.warn('KML parse error', err);
        return null;
    }
}

async function loadBTLPolygons() {
    if (btlPolygons) return btlPolygons;

    try {
        // Try remote maps in Firebase first
        const mapasRemote = await getData('mapas');
        
        if (mapasRemote) {
            btlPolygons = {};
            Object.values(mapasRemote).forEach(item => {
                if (item.id && item.geojson) {
                    btlPolygons[item.id] = item.geojson;
                }
            });
            if (Object.keys(btlPolygons).length > 0) return btlPolygons;
        }

        // Fallback: local files
        btlPolygons = {};

        const entries = Object.entries(BTL_FILES);
        // load in parallel (but not too many at once could be heavy; keep simple)
        await Promise.all(entries.map(async ([btl, filename]) => {
            try {
                const geojson = await tryLoadFileAsGeoJSON(filename);
                if (geojson) {
                    btlPolygons[btl] = geojson;
                } else {
                    console.warn(`No geo data for ${btl} (${filename})`);
                }
            } catch (err) {
                console.warn('Error loading', filename, err);
            }
        }));

        return btlPolygons;
    } catch (error) {
        console.error('Error loading BTL polygons:', error);
        return null;
    }
}

/* Ray-casting point-in-polygon */
function pointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];

        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

/* Check lat/lon against GeoJSON features (Polygon / MultiPolygon) */
function checkPointInGeoJSON(lat, lon, geojson) {
    if (!geojson || !geojson.features) return false;

    for (const feature of geojson.features) {
        if (!feature.geometry) continue;
        if (feature.geometry.type === 'Polygon') {
            for (const ring of feature.geometry.coordinates) {
                if (pointInPolygon([lon, lat], ring)) {
                    return true;
                }
            }
        } else if (feature.geometry.type === 'MultiPolygon') {
            for (const polygon of feature.geometry.coordinates) {
                for (const ring of polygon) {
                    if (pointInPolygon([lon, lat], ring)) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

export async function preloadMaps() {
    // Start background load
    loadBTLPolygons().catch(err => console.error('Error preloading maps:', err));
}

/* Free geocoding via Nominatim (OpenStreetMap) */
async function geocodeAddressNominatim(address) {
    try {
        const params = new URLSearchParams({
            q: address,
            format: 'jsonv2',
            addressdetails: 0,
            limit: 1
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            headers: { 'Accept-Language': 'pt-BR' },
            // Nominatim requires a sensible user agent in some environments; browsers are fine.
        });
        if (!res.ok) throw new Error('Nominatim geocode failed');
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
            const r = results[0];
            return { lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
        }
        return null;
    } catch (err) {
        console.warn('Geocode error (Nominatim):', err);
        return null;
    }
}

export async function detectBTLFromAddress(rua, numero, municipio, estado) {
    const btlSelect = document.getElementById('btl');
    const btlStatus = document.getElementById('btlStatus');
    const btlCoordinates = document.getElementById('btlCoordinates');
    const btlMap = document.getElementById('btlMap');

    if (btlMap) btlMap.style.display = 'none';
    if (btlCoordinates) btlCoordinates.textContent = '';

    if (!btlStatus) return;

    btlStatus.textContent = 'Detectando BTL...';
    btlStatus.style.color = '#666';

    try {
        let address;
        if (numero) {
            address = `${rua}, ${numero}, ${municipio || ''}, ${estado || ''}, Brasil`.replace(/\s+,/g, ',').trim();
        } else {
            address = `${rua}, ${municipio || ''}, ${estado || ''}, Brasil`.replace(/\s+,/g, ',').trim();
        }

        const [historicalBTL, geocodeResult, polygons] = await Promise.all([
            findHistoricalBTL(rua, numero, municipio),
            geocodeAddressNominatim(address).catch(() => null),
            loadBTLPolygons()
        ]);

        if (historicalBTL) {
            btlSelect.value = historicalBTL;
            btlStatus.textContent = `✓ BTL: ${historicalBTL}`;
            btlStatus.style.color = '#1976d2';
        }

        if (!geocodeResult) {
            if (!historicalBTL) {
                btlStatus.textContent = 'Endereço não localizado';
                btlStatus.style.color = '#ff9800';
            }
            return;
        }

        const { lat, lon } = geocodeResult;

        if (btlCoordinates) {
            btlCoordinates.textContent = `📍 Lat: ${lat.toFixed(6)}, Long: ${lon.toFixed(6)}`;
        }

        updateMapWithIframe(lat, lon);

        if (!polygons) {
            if (!historicalBTL) {
                btlStatus.textContent = 'Erro ao carregar mapas';
                btlStatus.style.color = '#d32f2f';
            }
            return;
        }

        let mapBTL = null;
        for (const [btl, geojson] of Object.entries(polygons)) {
            if (checkPointInGeoJSON(lat, lon, geojson)) {
                mapBTL = btl;
                break;
            }
        }

        const finalBTL = mapBTL || historicalBTL;

        if (finalBTL) {
            btlSelect.value = finalBTL;
            if (mapBTL) {
                btlStatus.textContent = `✓ BTL: ${mapBTL} (Geo-referenciado)`;
                btlStatus.style.color = '#388e3c';
            } else if (historicalBTL) {
                btlStatus.textContent = `✓ BTL: ${historicalBTL} (Histórico)`;
                btlStatus.style.color = '#1976d2';
            }
        } else {
            btlStatus.textContent = 'BTL não identificado nas coordenadas';
            btlStatus.style.color = '#ff9800';
        }

    } catch (error) {
        console.error('Error detecting BTL:', error);
        btlStatus.textContent = 'Erro na detecção';
        btlStatus.style.color = '#d32f2f';
    }
}