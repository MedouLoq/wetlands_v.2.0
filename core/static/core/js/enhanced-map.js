// Enhanced Map JavaScript for GeoWetlands Mauritania
// Advanced interactive map with multiple layers, heat maps, and filters

let map;
let siteMarkers = [];
let heatmapLayer;
let layerControl;
let currentFilter = 'all';

// Map layers
let baseLayers = {};
let overlayLayers = {};

// Initialize enhanced map
function initializeMap() {
    // Create map centered on Mauritania with better initial view

    if (map) {
        map.remove(); // Supprime l'instance de carte existante si elle existe
    }
    map = L.map('map', {
        center: [20.5, -10.5],
        zoom: 6,
        zoomControl: false,
        attributionControl: true
    });

    // Add custom zoom control
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Define base layers with better styling
    baseLayers = {
        "Carte Standard": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }),
        
        "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18
        }),
        
        "Terrain": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
            maxZoom: 17
        }),
        
        "Géographique": L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: 'abcd',
            maxZoom: 18
        })
    };

    // Add default base layer
    baseLayers["Carte Standard"].addTo(map);

    // Initialize overlay layers
    overlayLayers = {
        "Sites Ramsar": L.layerGroup(),
        "Zones Humides": L.layerGroup(),
        "Carte de Chaleur": L.layerGroup(),
        "Limites Administratives": L.layerGroup()
    };

    // Add layer control
    layerControl = L.control.layers(baseLayers, overlayLayers, {
        position: 'topright',
        collapsed: false
    }).addTo(map);

    // Load and display site data
    loadSiteData();
    
    // Add scale control
    L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false
    }).addTo(map);

    // Add fullscreen control
    map.addControl(new L.Control.Fullscreen({
        title: {
            'false': 'Voir en plein écran',
            'true': 'Quitter le plein écran'
        }
    }));

    // Add search control
    addSearchControl();
    
    // Add custom legend
    addCustomLegend();
    
    // Add administrative boundaries
    addAdministrativeBoundaries();
}

// Load and process site data
function loadSiteData() {
    const sitesDataElement = document.getElementById('sites-data');
    if (!sitesDataElement) return;

    try {
        const sitesData = JSON.parse(sitesDataElement.getAttribute('data-sites'));
        
        // Clear existing markers
        siteMarkers = [];
        overlayLayers["Sites Ramsar"].clearLayers();
        overlayLayers["Zones Humides"].clearLayers();
        overlayLayers["Carte de Chaleur"].clearLayers();

        // Prepare data for heatmap
        let heatmapData = [];

        sitesData.forEach(site => {
            if (site.geometry) {
                const lat = site.geometry.coordinates[1];
                const lng = site.geometry.coordinates[0];
                
                // Determine if it's a Ramsar site
                const isRamsar = site.name.includes('Parc National') || 
                                site.name.includes('Chat Tboul') || 
                                site.name.includes('Lac Gabou');

                // Create custom icon based on site type
                const icon = createCustomIcon(isRamsar);
                
                // Create marker
                const marker = L.marker([lat, lng], { icon: icon })
                    .bindPopup(createPopupContent(site), {
                        maxWidth: 300,
                        className: 'custom-popup'
                    });

                // Store site data with marker
                marker._site = site;
                marker._isRamsar = isRamsar;
                
                // Add to appropriate layer
                if (isRamsar) {
                    overlayLayers["Sites Ramsar"].addLayer(marker);
                } else {
                    overlayLayers["Zones Humides"].addLayer(marker);
                }
                
                siteMarkers.push(marker);
                
                // Add to heatmap data
                heatmapData.push([lat, lng, isRamsar ? 1.0 : 0.5]);
            }
        });

        // Create heatmap layer
        if (heatmapData.length > 0) {
            heatmapLayer = L.heatLayer(heatmapData, {
                radius: 25,
                blur: 15,
                maxZoom: 10,
                gradient: {
                    0.0: '#3388ff',
                    0.5: '#ffff00',
                    1.0: '#ff0000'
                }
            });
            overlayLayers["Carte de Chaleur"].addLayer(heatmapLayer);
        }

        // Add default layers to map
        overlayLayers["Sites Ramsar"].addTo(map);
        overlayLayers["Zones Humides"].addTo(map);

        // Fit map to markers
        if (siteMarkers.length > 0) {
            const group = new L.featureGroup(siteMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
        }

        // Update global reference
        window.siteMarkers = siteMarkers;

    } catch (e) {
        console.error("Error loading site data:", e);
    }
}

// Create custom icons for different site types
function createCustomIcon(isRamsar) {
    const iconHtml = isRamsar ? 
        '<i class="fas fa-star" style="color: #ffd700;"></i>' :
        '<i class="fas fa-tint" style="color: #1a7a4c;"></i>';
    
    return L.divIcon({
        html: `<div class="custom-marker ${isRamsar ? 'ramsar-marker' : 'wetland-marker'}">${iconHtml}</div>`,
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
}

// Create enhanced popup content
function createPopupContent(site) {
    const isRamsar = site.name.includes('Parc National') || 
                    site.name.includes('Chat Tboul') || 
                    site.name.includes('Lac Gabou');
    
    return `
        <div class="map-popup">
            <div class="popup-header ${isRamsar ? 'ramsar-header' : 'wetland-header'}">
                <h5>${site.name}</h5>
                ${isRamsar ? '<span class="ramsar-badge"><i class="fas fa-star"></i> Site Ramsar</span>' : ''}
            </div>
            <div class="popup-content">
                <p><i class="fas fa-map-marker-alt"></i> <strong>Wilaya:</strong> ${site.region || 'N/A'}</p>
                ${site.commune ? `<p><i class="fas fa-building"></i> <strong>Commune:</strong> ${site.commune}</p>` : ''}
                <div class="popup-actions">
                    <a href="/wetland-sites/${site.id}/" class="btn btn-primary btn-sm">
                        <i class="fas fa-info-circle"></i> Détails
                    </a>
                    <button onclick="zoomToSite(${site.geometry.coordinates[1]}, ${site.geometry.coordinates[0]})" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-search-plus"></i> Zoom
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Add search control
function addSearchControl() {
    const searchControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.padding = '10px';
            container.style.minWidth = '200px';
            
            container.innerHTML = `
                <div class="search-control">
                    <input type="text" id="map-search" placeholder="Rechercher un site..." class="form-control form-control-sm">
                    <div id="search-results" class="search-results"></div>
                </div>
            `;
            
            L.DomEvent.disableClickPropagation(container);
            
            return container;
        }
    });
    
    map.addControl(new searchControl({ position: 'topleft' }));
    
    // Add search functionality
    setTimeout(() => {
        const searchInput = document.getElementById('map-search');
        const searchResults = document.getElementById('search-results');
        
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const query = this.value.toLowerCase();
                searchResults.innerHTML = '';
                
                if (query.length < 2) return;
                
                const matches = siteMarkers.filter(marker => 
                    marker._site.name.toLowerCase().includes(query) ||
                    (marker._site.region && marker._site.region.toLowerCase().includes(query))
                ).slice(0, 5);
                
                matches.forEach(marker => {
                    const result = document.createElement('div');
                    result.className = 'search-result-item';
                    result.innerHTML = `
                        <div onclick="selectSearchResult(${marker._site.id})" style="cursor: pointer; padding: 5px; border-bottom: 1px solid #eee;">
                            <strong>${marker._site.name}</strong><br>
                            <small>${marker._site.region || 'N/A'}</small>
                        </div>
                    `;
                    searchResults.appendChild(result);
                });
            });
        }
    }, 1000);
}

// Add custom legend
function addCustomLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
            <div class="legend-content">
                <h6><i class="fas fa-info-circle"></i> Légende</h6>
                <div class="legend-item">
                    <i class="fas fa-star" style="color: #ffd700;"></i>
                    <span>Sites Ramsar</span>
                </div>
                <div class="legend-item">
                    <i class="fas fa-tint" style="color: #1a7a4c;"></i>
                    <span>Zones Humides</span>
                </div>
                <div class="legend-item">
                    <div class="heatmap-gradient"></div>
                    <span>Densité (Carte de Chaleur)</span>
                </div>
            </div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

// Add administrative boundaries (placeholder for now)
function addAdministrativeBoundaries() {
    // This would typically load GeoJSON data for Mauritanian wilayas
    // For now, we'll add a placeholder
    const boundariesLayer = L.geoJSON(null, {
        style: {
            color: '#666',
            weight: 2,
            opacity: 0.6,
            fillOpacity: 0.1
        }
    });
    
    overlayLayers["Limites Administratives"].addLayer(boundariesLayer);
}

// Utility functions
function zoomToSite(lat, lng) {
    map.setView([lat, lng], 12);
}

function selectSearchResult(siteId) {
    const marker = siteMarkers.find(m => m._site.id === siteId);
    if (marker) {
        map.setView(marker.getLatLng(), 12);
        marker.openPopup();
    }
    
    // Clear search
    const searchInput = document.getElementById('map-search');
    const searchResults = document.getElementById('search-results');
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.innerHTML = '';
}

// Filter functions
function filterByRegion(region) {
    currentFilter = region;
    
    siteMarkers.forEach(marker => {
        const site = marker._site;
        if (region === 'all' || site.region === region) {
            if (marker._isRamsar) {
                overlayLayers["Sites Ramsar"].addLayer(marker);
            } else {
                overlayLayers["Zones Humides"].addLayer(marker);
            }
        } else {
            overlayLayers["Sites Ramsar"].removeLayer(marker);
            overlayLayers["Zones Humides"].removeLayer(marker);
        }
    });
}

function filterByType(type) {
    siteMarkers.forEach(marker => {
        if (type === 'all') {
            if (marker._isRamsar) {
                overlayLayers["Sites Ramsar"].addLayer(marker);
            } else {
                overlayLayers["Zones Humides"].addLayer(marker);
            }
        } else if (type === 'ramsar' && marker._isRamsar) {
            overlayLayers["Sites Ramsar"].addLayer(marker);
            overlayLayers["Zones Humides"].removeLayer(marker);
        } else if (type === 'wetland' && !marker._isRamsar) {
            overlayLayers["Zones Humides"].addLayer(marker);
            overlayLayers["Sites Ramsar"].removeLayer(marker);
        } else {
            overlayLayers["Sites Ramsar"].removeLayer(marker);
            overlayLayers["Zones Humides"].removeLayer(marker);
        }
    });
}

// Export functions for global access
window.filterByRegion = filterByRegion;
window.filterByType = filterByType;
window.zoomToSite = zoomToSite;
window.selectSearchResult = selectSearchResult;

