// Enhanced Map JavaScript for GeoWetlands Mauritania
// Advanced interactive map with multiple layers, heat maps, and filters

let map;
let siteMarkers = [];
let heatmapLayer;
let speciesHeatmapLayer;
let wilayasLayer;
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
        
        "Géographique": L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 20
        })
    };

    // Add default base layer
    baseLayers["Carte Standard"].addTo(map);

    // Initialize overlay layers
    overlayLayers = {
        "Sites Ramsar": L.layerGroup(),
        "Zones Humides": L.layerGroup(),
        "Heatmap Zones Humides": L.layerGroup(),
        "Heatmap Espèces": L.layerGroup(),
        "Wilayas": L.layerGroup(),
        "Couches Espèces": L.layerGroup(),
        "Zones de Danger": L.layerGroup()
    };

    // Add layer control
    layerControl = L.control.layers(baseLayers, overlayLayers, {
        position: 'topright',
        collapsed: false
    }).addTo(map);

    // Load and display site data
    loadSiteData();
    
    // Load wilayas data
    loadWilayasData();
    
    // Load heatmap data
    loadHeatmapData();
    
    // Load species and threats data
    loadSpeciesAndThreatsData();
    
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
    
    // Add measurement tool
    addMeasurementTool();
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

        sitesData.forEach(site => {
            if (site.geometry) {
                const lat = site.geometry.coordinates[1];
                const lng = site.geometry.coordinates[0];
                
                // Determine if it's a Ramsar site
                const isRamsar = site.isRamsar || site.name.includes('Parc National') || 
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
            }
        });

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

// Load wilayas data with statistics
function loadWilayasData() {
    fetch('/api/wilayas/')
        .then(response => response.json())
        .then(data => {
            wilayasLayer = L.geoJSON(data, {
                style: function(feature) {
                    return {
                        fillColor: feature.properties.color,
                        weight: 2,
                        opacity: 1,
                        color: '#666',
                        dashArray: '3',
                        fillOpacity: feature.properties.fillOpacity
                    };
                },
                onEachFeature: function(feature, layer) {
                    const props = feature.properties;
                    const popupContent = `
                        <div class="wilaya-popup">
                            <h5>${props.name}</h5>
                            <p><strong>Nombre de sites:</strong> ${props.site_count}</p>
                            <div class="site-count-indicator" style="background-color: ${props.color}; width: 20px; height: 20px; border-radius: 50%; display: inline-block;"></div>
                            <span style="margin-left: 10px;">
                                ${props.site_count >= 5 ? 'Zone à forte densité' : 
                                  props.site_count >= 1 ? 'Zone à densité modérée' : 'Zone sans sites répertoriés'}
                            </span>
                        </div>
                    `;
                    layer.bindPopup(popupContent);
                }
            });
            
            overlayLayers["Wilayas"].addLayer(wilayasLayer);
        })
        .catch(error => console.error('Error loading wilayas:', error));
}

// Load species by type and threats data
function loadSpeciesAndThreatsData() {
    // Load species by type
    fetch('/api/species-by-type/')
        .then(response => response.json())
        .then(data => {
            const speciesData = data.species_by_type;
            
            Object.keys(speciesData).forEach(groupName => {
                const group = speciesData[groupName];
                const layerGroup = L.layerGroup();
                
                group.data.forEach(species => {
                    const circle = L.circleMarker([species.lat, species.lng], {
                        radius: 8,
                        fillColor: group.color,
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).bindPopup(`
                        <div class="species-popup">
                            <h6><i class="${group.icon}"></i> ${groupName}</h6>
                            <p><strong>Espèce:</strong> ${species.species_name}</p>
                            <p><strong>Site:</strong> ${species.site_name}</p>
                            <a href="/wetland-sites/${species.site_id}/" class="btn btn-sm btn-primary">Voir le site</a>
                        </div>
                    `);
                    
                    layerGroup.addLayer(circle);
                });
                
                overlayLayers[`Espèces: ${groupName}`] = layerGroup;
                
                // Update layer control
                if (layerControl) {
                    layerControl.addOverlay(layerGroup, `Espèces: ${groupName}`);
                }
            });
        })
        .catch(error => console.error('Error loading species data:', error));

    // Load threats data
    fetch('/api/threats/')
        .then(response => response.json())
        .then(data => {
            const threatsData = data.threats_data;
            const threatsLayer = L.layerGroup();
            
            threatsData.forEach(threat => {
                // Create danger zone circle with dashed border
                const dangerZone = L.circle([threat.lat, threat.lng], {
                    radius: 2000, // 2km radius
                    fillColor: threat.color,
                    color: threat.color,
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.2,
                    dashArray: '10, 10'
                }).bindPopup(`
                    <div class="threat-popup">
                        <h6><i class="fas fa-exclamation-triangle" style="color: ${threat.color};"></i> Zone de Danger</h6>
                        <p><strong>Menace:</strong> ${threat.threat_name}</p>
                        <p><strong>Type:</strong> ${threat.threat_type}</p>
                        <p><strong>Niveau de risque:</strong> 
                            <span class="badge" style="background-color: ${threat.color};">${threat.risk_level}</span>
                        </p>
                        <p><strong>Site:</strong> ${threat.site_name}</p>
                        ${threat.notes ? `<p><strong>Notes:</strong> ${threat.notes}</p>` : ''}
                        <a href="/wetland-sites/${threat.site_id}/" class="btn btn-sm btn-primary">Voir le site</a>
                    </div>
                `);
                
                threatsLayer.addLayer(dangerZone);
            });
            
            overlayLayers["Zones de Danger"] = threatsLayer;
            
            // Update layer control
            if (layerControl) {
                layerControl.addOverlay(threatsLayer, "Zones de Danger");
            }
        })
        .catch(error => console.error('Error loading threats data:', error));
}

// Load heatmap data
function loadHeatmapData() {
    fetch('/api/wetlands-heatmap/')
        .then(response => response.json())
        .then(data => {
            const heatmapData = data.wetlands_data.map(item => [
                item.lat, 
                item.lng, 
                item.intensity
            ]);
            
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
            overlayLayers["Heatmap Zones Humides"].addLayer(heatmapLayer);
        })
        .catch(error => console.error('Error loading wetlands heatmap:', error));

    // Load species heatmap
    fetch('/api/species-heatmap/')
        .then(response => response.json())
        .then(data => {
            const speciesHeatmapData = data.species_data.map(item => [
                item.lat, 
                item.lng, 
                item.intensity
            ]);
            
            speciesHeatmapLayer = L.heatLayer(speciesHeatmapData, {
                radius: 20,
                blur: 10,
                maxZoom: 12,
                gradient: {
                    0.0: '#00ff00',
                    0.5: '#ffff00',
                    1.0: '#ff6600'
                }
            });
            overlayLayers["Heatmap Espèces"].addLayer(speciesHeatmapLayer);
        })
        .catch(error => console.error('Error loading species heatmap:', error));
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
    const isRamsar = site.isRamsar || site.name.includes('Parc National') || 
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
            container.style.minWidth = '300px';
            container.style.borderRadius = '10px';
            container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            
            container.innerHTML = `
                <div class="search-control">
                    <div class="search-input-container">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="map-search" placeholder="Rechercher sites, wilayas, espèces..." class="form-control form-control-sm">
                        <div class="search-spinner" id="search-spinner" style="display: none;">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                    </div>
                    <div id="search-results" class="search-results"></div>
                </div>
            `;
            
            L.DomEvent.disableClickPropagation(container);
            
            return container;
        }
    });
    
    map.addControl(new searchControl({ position: 'topleft' }));
    
    // Add enhanced search functionality
    setTimeout(() => {
        const searchInput = document.getElementById('map-search');
        const searchResults = document.getElementById('search-results');
        const searchSpinner = document.getElementById('search-spinner');
        let searchTimeout;
        
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const query = this.value.trim();
                
                // Clear previous timeout
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                }
                
                if (query.length < 2) {
                    searchResults.innerHTML = '';
                    searchSpinner.style.display = 'none';
                    return;
                }
                
                // Show spinner
                searchSpinner.style.display = 'block';
                
                // Debounce search
                searchTimeout = setTimeout(() => {
                    fetch(`/api/search/?q=${encodeURIComponent(query)}`)
                        .then(response => response.json())
                        .then(data => {
                            searchSpinner.style.display = 'none';
                            searchResults.innerHTML = '';
                            
                            if (data.results.length === 0) {
                                searchResults.innerHTML = '<div class="search-no-results">Aucun résultat trouvé</div>';
                                return;
                            }
                            
                            data.results.forEach(result => {
                                const resultDiv = document.createElement('div');
                                resultDiv.className = 'search-result-item';
                                resultDiv.innerHTML = `
                                    <div class="search-result-content" onclick="selectAdvancedSearchResult(${result.lat}, ${result.lng}, '${result.name}', '${result.type}', '${result.url || ''}')">
                                        <div class="search-result-header">
                                            <i class="${result.icon} search-result-icon"></i>
                                            <strong>${result.name}</strong>
                                        </div>
                                        <div class="search-result-description">${result.description}</div>
                                    </div>
                                `;
                                searchResults.appendChild(resultDiv);
                            });
                        })
                        .catch(error => {
                            console.error('Search error:', error);
                            searchSpinner.style.display = 'none';
                            searchResults.innerHTML = '<div class="search-error">Erreur de recherche</div>';
                        });
                }, 300); // 300ms debounce
            });
            
            // Clear search on escape
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    this.value = '';
                    searchResults.innerHTML = '';
                }
            });
        }
    }, 1000);
}

// Add measurement tool
function addMeasurementTool() {
    const measureControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.width = '40px';
            container.style.height = '40px';
            container.style.cursor = 'pointer';
            container.style.borderRadius = '10px';
            container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            container.title = 'Outil de mesure de distance - Cliquez pour activer';
            
            container.innerHTML = '<i class="fas fa-ruler" style="line-height: 40px; text-align: center; display: block; font-size: 16px;"></i>';
            
            let measuring = false;
            let measureLine = null;
            let startPoint = null;
            let measureMarkers = [];
            
            container.onclick = function() {
                if (!measuring) {
                    // Start measuring
                    measuring = true;
                    container.style.backgroundColor = '#007cff';
                    container.style.color = 'white';
                    container.title = 'Mode mesure actif - Cliquez sur deux points pour mesurer la distance';
                    map.getContainer().style.cursor = 'crosshair';
                    
                    // Add instruction popup
                    const instructionPopup = L.popup()
                        .setLatLng(map.getCenter())
                        .setContent('<div style="text-align: center;"><strong>Mode Mesure Activé</strong><br>Cliquez sur deux points pour mesurer la distance</div>')
                        .openOn(map);
                    
                    setTimeout(() => map.closePopup(instructionPopup), 3000);
                    
                    const measureClickHandler = function(e) {
                        if (!startPoint) {
                            // First click - set start point
                            startPoint = e.latlng;
                            
                            // Add start marker
                            const startMarker = L.marker(startPoint, {
                                icon: L.divIcon({
                                    html: '<div class="measure-marker start"><i class="fas fa-play"></i></div>',
                                    className: 'custom-div-icon',
                                    iconSize: [20, 20],
                                    iconAnchor: [10, 10]
                                })
                            }).addTo(map);
                            measureMarkers.push(startMarker);
                            
                            // Create line
                            measureLine = L.polyline([startPoint], {
                                color: '#ff4444',
                                weight: 3,
                                dashArray: '5, 10',
                                opacity: 0.8
                            }).addTo(map);
                            
                            // Add mousemove handler for live preview
                            const mouseMoveHandler = function(e) {
                                if (measureLine && startPoint) {
                                    measureLine.setLatLngs([startPoint, e.latlng]);
                                }
                            };
                            map.on('mousemove', mouseMoveHandler);
                            
                            // Store mousemove handler for cleanup
                            measureLine._mouseMoveHandler = mouseMoveHandler;
                            
                        } else {
                            // Second click - complete measurement
                            const endPoint = e.latlng;
                            measureLine.addLatLng(endPoint);
                            
                            // Remove mousemove handler
                            if (measureLine._mouseMoveHandler) {
                                map.off('mousemove', measureLine._mouseMoveHandler);
                            }
                            
                            // Add end marker
                            const endMarker = L.marker(endPoint, {
                                icon: L.divIcon({
                                    html: '<div class="measure-marker end"><i class="fas fa-stop"></i></div>',
                                    className: 'custom-div-icon',
                                    iconSize: [20, 20],
                                    iconAnchor: [10, 10]
                                })
                            }).addTo(map);
                            measureMarkers.push(endMarker);
                            
                            // Calculate distance
                            const distance = startPoint.distanceTo(endPoint);
                            const distanceText = distance > 1000 ? 
                                `${(distance / 1000).toFixed(2)} km` : 
                                `${distance.toFixed(0)} m`;
                            
                            // Add result popup at midpoint
                            const midpoint = L.latLng(
                                (startPoint.lat + endPoint.lat) / 2,
                                (startPoint.lng + endPoint.lng) / 2
                            );
                            
                            const resultPopup = L.popup({
                                closeButton: true,
                                autoClose: false,
                                closeOnClick: false,
                                className: 'measure-result-popup'
                            })
                                .setLatLng(midpoint)
                                .setContent(`
                                    <div class="measure-result">
                                        <h6><i class="fas fa-ruler"></i> Résultat de Mesure</h6>
                                        <p><strong>Distance:</strong> ${distanceText}</p>
                                        <button onclick="clearMeasurement()" class="btn btn-sm btn-outline-danger">
                                            <i class="fas fa-trash"></i> Effacer
                                        </button>
                                    </div>
                                `)
                                .openOn(map);
                            
                            // Store measurement data for cleanup
                            window.currentMeasurement = {
                                line: measureLine,
                                markers: measureMarkers,
                                popup: resultPopup
                            };
                            
                            // Reset measurement state
                            measuring = false;
                            startPoint = null;
                            measureLine = null;
                            measureMarkers = [];
                            container.style.backgroundColor = 'white';
                            container.style.color = 'black';
                            container.title = 'Outil de mesure de distance - Cliquez pour activer';
                            map.getContainer().style.cursor = '';
                            map.off('click', measureClickHandler);
                        }
                    };
                    
                    map.on('click', measureClickHandler);
                    
                } else {
                    // Cancel measurement
                    measuring = false;
                    startPoint = null;
                    
                    // Clean up
                    if (measureLine) {
                        map.removeLayer(measureLine);
                        if (measureLine._mouseMoveHandler) {
                            map.off('mousemove', measureLine._mouseMoveHandler);
                        }
                        measureLine = null;
                    }
                    
                    measureMarkers.forEach(marker => map.removeLayer(marker));
                    measureMarkers = [];
                    
                    container.style.backgroundColor = 'white';
                    container.style.color = 'black';
                    container.title = 'Outil de mesure de distance - Cliquez pour activer';
                    map.getContainer().style.cursor = '';
                    map.off('click');
                }
            };
            
            L.DomEvent.disableClickPropagation(container);
            
            return container;
        }
    });
    
    map.addControl(new measureControl({ position: 'topleft' }));
}

// Add custom legend
function addCustomLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
            <div class="legend-content">
                <div class="legend-header">
                    <h6><i class="fas fa-info-circle"></i> Légende Interactive</h6>
                    <button class="legend-toggle" onclick="toggleLegend()">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                </div>
                
                <div class="legend-body" id="legend-body">
                    <div class="legend-section">
                        <h7><strong>Sites</strong></h7>
                        <div class="legend-item">
                            <i class="fas fa-star" style="color: #ffd700;"></i>
                            <span>Sites Ramsar</span>
                        </div>
                        <div class="legend-item">
                            <i class="fas fa-tint" style="color: #1a7a4c;"></i>
                            <span>Zones Humides</span>
                        </div>
                    </div>
                    
                    <div class="legend-section">
                        <h7><strong>Heatmaps</strong></h7>
                        <div class="legend-item">
                            <div class="heatmap-gradient wetlands"></div>
                            <span>Densité Zones Humides</span>
                        </div>
                        <div class="legend-item">
                            <div class="heatmap-gradient species"></div>
                            <span>Densité Espèces</span>
                        </div>
                    </div>
                    
                    <div class="legend-section">
                        <h7><strong>Wilayas</strong></h7>
                        <div class="legend-item">
                            <div class="wilaya-color" style="background-color: #d32f2f;"></div>
                            <span>5+ sites</span>
                        </div>
                        <div class="legend-item">
                            <div class="wilaya-color" style="background-color: #ff9800;"></div>
                            <span>1-4 sites</span>
                        </div>
                        <div class="legend-item">
                            <div class="wilaya-color" style="background-color: #9e9e9e;"></div>
                            <span>0 sites</span>
                        </div>
                    </div>
                    
                    <div class="legend-section">
                        <h7><strong>Espèces par Type</strong></h7>
                        <div class="legend-item">
                            <i class="fas fa-dove" style="color: #2196f3;"></i>
                            <span>Oiseaux</span>
                        </div>
                        <div class="legend-item">
                            <i class="fas fa-fish" style="color: #00bcd4;"></i>
                            <span>Poissons</span>
                        </div>
                        <div class="legend-item">
                            <i class="fas fa-otter" style="color: #ff9800;"></i>
                            <span>Mammifères</span>
                        </div>
                        <div class="legend-item">
                            <i class="fas fa-seedling" style="color: #4caf50;"></i>
                            <span>Plantes</span>
                        </div>
                        <div class="legend-item">
                            <i class="fas fa-dragon" style="color: #9c27b0;"></i>
                            <span>Reptiles</span>
                        </div>
                        <div class="legend-item">
                            <i class="fas fa-bug" style="color: #ffeb3b;"></i>
                            <span>Insectes</span>
                        </div>
                    </div>
                    
                    <div class="legend-section">
                        <h7><strong>Zones de Danger</strong></h7>
                        <div class="legend-item">
                            <div class="danger-indicator high"></div>
                            <span>Risque Élevé</span>
                        </div>
                        <div class="legend-item">
                            <div class="danger-indicator medium"></div>
                            <span>Risque Moyen</span>
                        </div>
                        <div class="legend-item">
                            <div class="danger-indicator low"></div>
                            <span>Risque Faible</span>
                        </div>
                    </div>
                    
                    <div class="legend-section">
                        <h7><strong>Outils</strong></h7>
                        <div class="legend-item">
                            <i class="fas fa-ruler" style="color: #007bff;"></i>
                            <span>Mesure de Distance</span>
                        </div>
                        <div class="legend-item">
                            <i class="fas fa-search" style="color: #28a745;"></i>
                            <span>Recherche Avancée</span>
                        </div>
                        <div class="legend-item">
                            <i class="fas fa-expand" style="color: #6c757d;"></i>
                            <span>Plein Écran</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return div;
    };
    
    legend.addTo(map);
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
window.overlayLayers = overlayLayers;


// Advanced search result selection
function selectAdvancedSearchResult(lat, lng, name, type, url) {
    // Zoom to location
    map.setView([lat, lng], type === 'wilaya' ? 8 : 12);
    
    // Clear search
    const searchInput = document.getElementById('map-search');
    const searchResults = document.getElementById('search-results');
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.innerHTML = '';
    
    // Add temporary marker
    const tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            html: '<div class="temp-search-marker"><i class="fas fa-search"></i></div>',
            className: 'custom-div-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map);
    
    // Remove temporary marker after 3 seconds
    setTimeout(() => {
        map.removeLayer(tempMarker);
    }, 3000);
    
    // Open URL if available
    if (url && url !== 'null') {
        setTimeout(() => {
            window.open(url, '_blank');
        }, 1000);
    }
}

// Clear measurement function
function clearMeasurement() {
    if (window.currentMeasurement) {
        const measurement = window.currentMeasurement;
        
        // Remove line
        if (measurement.line) {
            map.removeLayer(measurement.line);
        }
        
        // Remove markers
        if (measurement.markers) {
            measurement.markers.forEach(marker => map.removeLayer(marker));
        }
        
        // Close popup
        if (measurement.popup) {
            map.closePopup(measurement.popup);
        }
        
        // Clear reference
        window.currentMeasurement = null;
    }
}


// Toggle legend visibility
function toggleLegend() {
    const legendBody = document.getElementById('legend-body');
    const toggleButton = document.querySelector('.legend-toggle i');
    
    if (legendBody.style.display === 'none') {
        legendBody.style.display = 'block';
        toggleButton.className = 'fas fa-chevron-up';
    } else {
        legendBody.style.display = 'none';
        toggleButton.className = 'fas fa-chevron-down';
    }
}

// Get taxonomic group icon
function get_taxonomic_group_icon(groupName) {
    const icons = {
        'Bird': 'fas fa-dove',
        'Fish': 'fas fa-fish',
        'Mammal': 'fas fa-otter',
        'Plant': 'fas fa-seedling',
        'Reptile': 'fas fa-dragon',
        'Insect': 'fas fa-bug',
        'Other Invertebrate': 'fas fa-spider'
    };
    return icons[groupName] || 'fas fa-question-circle';
}

// Export functions for global access
window.toggleLegend = toggleLegend;
window.filterByRegion = filterByRegion;
window.filterByType = filterByType;
window.zoomToSite = zoomToSite;
window.selectSearchResult = selectSearchResult;
window.selectAdvancedSearchResult = selectAdvancedSearchResult;
window.clearMeasurement = clearMeasurement;
window.overlayLayers = overlayLayers;

