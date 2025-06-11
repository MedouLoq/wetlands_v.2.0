// Enhanced Map JavaScript for GeoWetlands Mauritania
// Advanced interactive map with multiple layers, heat maps, and filters

let map;
let siteMarkers = [];
let speciesMarkers = [];
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

    // Initialize overlay layers - SANS DOUBLONS
    overlayLayers = {
        "Sites Ramsar": L.layerGroup(),
        "Zones Humides": L.layerGroup(),
        "Heatmap Zones Humides": L.layerGroup(),
        "Heatmap Espèces": L.layerGroup(),
        "Wilayas": L.layerGroup(),
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
    
    // Add custom legend - FORCER EN BAS À GAUCHE
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

                // Create custom icon based on site type - Taille réduite
                const icon = createCustomIcon(isRamsar);
                
                // Create marker avec z-index plus bas pour les sites
                const marker = L.marker([lat, lng], { 
                    icon: icon,
                    zIndexOffset: 100 // Sites en arrière-plan
                })
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

// Load wilayas data with correct statistics
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

// Load species by type and threats data - CORRIGÉ POUR ÉVITER LES DOUBLONS
function loadSpeciesAndThreatsData() {
    // Load species by type - UNE SEULE FOIS
    fetch('/api/species-by-type/')
        .then(response => response.json())
        .then(data => {
            const speciesData = data.species_by_type;
            
            Object.keys(speciesData).forEach(groupName => {
                const group = speciesData[groupName];
                const layerName = `Espèces: ${groupName}`;
                
                // VÉRIFIER SI LA COUCHE EXISTE DÉJÀ
                if (overlayLayers[layerName]) {
                    return; // Skip si déjà ajoutée
                }
                
                const layerGroup = L.layerGroup();
                
                group.data.forEach((species, index) => {
                    // Ajouter un décalage aléatoire MINIMAL pour éviter la superposition
                    const offsetLat = (Math.random() - 0.5) * 0.002; // ~100m de décalage
                    const offsetLng = (Math.random() - 0.5) * 0.002;
                    
                    const adjustedLat = species.lat + offsetLat;
                    const adjustedLng = species.lng + offsetLng;
                    
                    // Créer une icône spécifique à l'espèce avec z-index élevé
                    const speciesIcon = createSpeciesIcon(groupName);
                    
                    const marker = L.marker([adjustedLat, adjustedLng], { 
                        icon: speciesIcon,
                        zIndexOffset: 1000 // Espèces au premier plan
                    })
                        .bindPopup(`
                            <div class="species-popup">
                                <h6><i class="${group.icon}"></i> ${groupName}</h6>
                                <p><strong>Espèce:</strong> ${species.species_name}</p>
                                <p><strong>Site:</strong> ${species.site_name}</p>
                                <a href="/wetland-sites/${species.site_id}/" class="btn btn-sm btn-primary">Voir le site</a>
                            </div>
                        `);
                    
                    layerGroup.addLayer(marker);
                });
                
                // Ajouter la couche UNE SEULE FOIS
                overlayLayers[layerName] = layerGroup;
                
                // Update layer control UNE SEULE FOIS
                if (layerControl) {
                    layerControl.addOverlay(layerGroup, layerName);
                }
            });
        })
        .catch(error => console.error('Error loading species data:', error));

    // Load threats data - UNE SEULE FOIS
    fetch('/api/threats/')
        .then(response => response.json())
        .then(data => {
            const threatsData = data.threats_data;
            
            // VÉRIFIER SI LA COUCHE EXISTE DÉJÀ
            if (overlayLayers["Zones de Danger"] && overlayLayers["Zones de Danger"].getLayers().length > 0) {
                return; // Skip si déjà ajoutée
            }
            
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
            
            // Remplacer la couche existante
            overlayLayers["Zones de Danger"] = threatsLayer;
        })
        .catch(error => console.error('Error loading threats data:', error));
}

// Load heatmap data - Amélioré pour de vraies cartes de chaleur
function loadHeatmapData() {
    fetch('/api/wetlands-heatmap/')
        .then(response => response.json())
        .then(data => {
            const heatmapData = [];
            
            // Créer des points de chaleur avec zones d'influence
            data.wetlands_data.forEach(item => {
                // Point principal
                heatmapData.push([item.lat, item.lng, item.intensity * 2]);
                
                // Points d'influence autour (pour créer une vraie zone de chaleur)
                for (let i = 0; i < 8; i++) {
                    const angle = (i * 45) * Math.PI / 180;
                    const radius = 0.05; // ~5km de rayon
                    const offsetLat = Math.cos(angle) * radius;
                    const offsetLng = Math.sin(angle) * radius;
                    
                    heatmapData.push([
                        item.lat + offsetLat, 
                        item.lng + offsetLng, 
                        item.intensity * 0.5
                    ]);
                }
            });
            
            heatmapLayer = L.heatLayer(heatmapData, {
                radius: 35,
                blur: 25,
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

    // Load species heatmap - Amélioré
    fetch('/api/species-heatmap/')
        .then(response => response.json())
        .then(data => {
            const speciesHeatmapData = [];
            
            // Créer des points de chaleur pour les espèces
            data.species_data.forEach(item => {
                // Point principal
                speciesHeatmapData.push([item.lat, item.lng, item.intensity * 1.5]);
                
                // Points d'influence autour
                for (let i = 0; i < 6; i++) {
                    const angle = (i * 60) * Math.PI / 180;
                    const radius = 0.03; // ~3km de rayon
                    const offsetLat = Math.cos(angle) * radius;
                    const offsetLng = Math.sin(angle) * radius;
                    
                    speciesHeatmapData.push([
                        item.lat + offsetLat, 
                        item.lng + offsetLng, 
                        item.intensity * 0.3
                    ]);
                }
            });
            
            speciesHeatmapLayer = L.heatLayer(speciesHeatmapData, {
                radius: 30,
                blur: 20,
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

// Create custom icons for different site types - Taille réduite
function createCustomIcon(isRamsar) {
    const iconHtml = isRamsar ? 
        '<i class="fas fa-star" style="color: #ffd700;"></i>' :
        '<i class="fas fa-tint" style="color: #1a7a4c;"></i>';
    
    return L.divIcon({
        html: `<div class="custom-marker ${isRamsar ? 'ramsar-marker' : 'wetland-marker'}">${iconHtml}</div>`,
        className: 'custom-div-icon',
        iconSize: [24, 24], // Réduit de 30 à 24
        iconAnchor: [12, 12], // Ajusté en conséquence
        popupAnchor: [0, -12]
    });
}

// Créer des icônes spécifiques pour les espèces - CORRIGÉ POUR AFFICHER LES VRAIES ICÔNES
function createSpeciesIcon(groupName) {
    const iconMap = {
        'Bird': 'fa-dove',
        'Fish': 'fa-fish',
        'Mammal': 'fa-otter',
        'Plant': 'fa-seedling',
        'Reptile': 'fa-dragon',
        'Insect': 'fa-bug',
        'Other Invertebrate': 'fa-water'
    };
    
    const colorMap = {
        'Bird': '#2196f3',
        'Fish': '#00bcd4',
        'Mammal': '#ff9800',
        'Plant': '#4caf50',
        'Reptile': '#9c27b0',
        'Insect': '#ffeb3b',
        'Other Invertebrate': '#795548'
    };
    
    const iconClass = iconMap[groupName] || 'fa-paw';
    const iconColor = colorMap[groupName] || '#607d8b';
    
    return L.divIcon({
        html: `<div class="species-marker-icon" style="background-color: ${iconColor}; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><i class="fas ${iconClass}" style="color: white; font-size: 10px;"></i></div>`,
        className: 'custom-div-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
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
                    <div id="search-results" class="search-results" style="display: none;"></div>
                </div>
            `;
            
            // Prevent map events when interacting with search
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            // Add search functionality
            const searchInput = container.querySelector('#map-search');
            const searchResults = container.querySelector('#search-results');
            const searchSpinner = container.querySelector('#search-spinner');
            
            let searchTimeout;
            
            searchInput.addEventListener('input', function() {
                const query = this.value.trim();
                
                clearTimeout(searchTimeout);
                
                if (query.length < 2) {
                    searchResults.style.display = 'none';
                    return;
                }
                
                searchTimeout = setTimeout(() => {
                    performSearch(query, searchResults, searchSpinner);
                }, 300);
            });
            
            // Hide results when clicking outside
            document.addEventListener('click', function(e) {
                if (!container.contains(e.target)) {
                    searchResults.style.display = 'none';
                }
            });
            
            return container;
        }
    });
    
    new searchControl({ position: 'topleft' }).addTo(map);
}

// Perform search functionality
function performSearch(query, resultsContainer, spinner) {
    spinner.style.display = 'block';
    
    fetch(`/api/search/?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            spinner.style.display = 'none';
            displaySearchResults(data.results, resultsContainer);
        })
        .catch(error => {
            spinner.style.display = 'none';
            resultsContainer.innerHTML = '<div class="search-error">Erreur lors de la recherche</div>';
            resultsContainer.style.display = 'block';
            console.error('Search error:', error);
        });
}

// Display search results
function displaySearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = '<div class="search-no-results">Aucun résultat trouvé</div>';
        container.style.display = 'block';
        return;
    }
    
    let html = '';
    results.forEach(result => {
        html += `
            <div class="search-result-item">
                <div class="search-result-content" onclick="selectSearchResult(${result.lat}, ${result.lng}, '${result.name}', '${result.type}')">
                    <div class="search-result-header">
                        <i class="${result.icon} search-result-icon"></i>
                        <strong>${result.name}</strong>
                    </div>
                    <div class="search-result-description">${result.description}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// Handle search result selection
function selectSearchResult(lat, lng, name, type) {
    // Hide search results
    document.querySelector('#search-results').style.display = 'none';
    
    // Zoom to location
    map.setView([lat, lng], 12);
    
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
    
    // Clear search input
    document.querySelector('#map-search').value = '';
}

// Add custom legend - FORCER POSITION BAS GAUCHE
function addCustomLegend() {
    const legend = L.control({ position: 'bottomleft' });
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'legend');
        div.style.position = 'absolute';
        div.style.bottom = '10px';
        div.style.left = '10px';
        div.style.zIndex = '1000';
        
        div.innerHTML = `
            <div class="legend-header">
                <h6><i class="fas fa-info-circle"></i> Légende Interactive</h6>
                <button class="legend-toggle" onclick="toggleLegendBody()">
                    <i class="fas fa-chevron-up" id="legend-chevron"></i>
                </button>
            </div>
            <div class="legend-body" id="legend-body">
                <div class="legend-section">
                    <h7>Sites</h7>
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
                    <h7>Espèces</h7>
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
                </div>
                
                <div class="legend-section">
                    <h7>Cartes de Chaleur</h7>
                    <div class="legend-item">
                        <div class="heatmap-gradient wetlands"></div>
                        <span>Zones Humides</span>
                    </div>
                    <div class="legend-item">
                        <div class="heatmap-gradient species"></div>
                        <span>Biodiversité</span>
                    </div>
                </div>
                
                <div class="legend-section">
                    <h7>Zones de Danger</h7>
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
                    <h7>Wilayas</h7>
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
            </div>
        `;
        
        // Prevent map events
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        
        return div;
    };
    
    legend.addTo(map);
}

// Toggle legend body
function toggleLegendBody() {
    const body = document.getElementById('legend-body');
    const chevron = document.getElementById('legend-chevron');
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        chevron.className = 'fas fa-chevron-up';
    } else {
        body.style.display = 'none';
        chevron.className = 'fas fa-chevron-down';
    }
}

// Add measurement tool
function addMeasurementTool() {
    const measureControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.padding = '5px';
            container.style.borderRadius = '5px';
            container.innerHTML = '<i class="fas fa-ruler" style="font-size: 16px; cursor: pointer;" title="Mesurer distance"></i>';
            
            L.DomEvent.disableClickPropagation(container);
            
            container.onclick = function() {
                startMeasurement();
            };
            
            return container;
        }
    });
    
    new measureControl({ position: 'topleft' }).addTo(map);
}

// Measurement functionality
let measurementMode = false;
let measurementMarkers = [];
let measurementLine = null;

function startMeasurement() {
    if (measurementMode) {
        stopMeasurement();
        return;
    }
    
    measurementMode = true;
    map.getContainer().style.cursor = 'crosshair';
    
    map.on('click', onMeasurementClick);
}

function onMeasurementClick(e) {
    if (!measurementMode) return;
    
    const marker = L.marker(e.latlng, {
        icon: L.divIcon({
            html: `<div class="measure-marker ${measurementMarkers.length === 0 ? 'start' : 'end'}">${measurementMarkers.length + 1}</div>`,
            className: 'custom-div-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map);
    
    measurementMarkers.push(marker);
    
    if (measurementMarkers.length === 2) {
        const latlng1 = measurementMarkers[0].getLatLng();
        const latlng2 = measurementMarkers[1].getLatLng();
        
        // Draw line
        measurementLine = L.polyline([latlng1, latlng2], {
            color: '#007bff',
            weight: 3,
            dashArray: '5, 10'
        }).addTo(map);
        
        // Calculate distance
        const distance = latlng1.distanceTo(latlng2);
        const distanceKm = (distance / 1000).toFixed(2);
        const distanceM = distance.toFixed(0);
        
        // Show result popup
        const midpoint = L.latLng(
            (latlng1.lat + latlng2.lat) / 2,
            (latlng1.lng + latlng2.lng) / 2
        );
        
        L.popup()
            .setLatLng(midpoint)
            .setContent(`
                <div class="measure-result">
                    <h6><i class="fas fa-ruler"></i> Distance Mesurée</h6>
                    <p>${distanceKm} km</p>
                    <p>(${distanceM} mètres)</p>
                    <button onclick="stopMeasurement()" class="btn btn-sm btn-primary">Terminer</button>
                </div>
            `)
            .openOn(map);
        
        stopMeasurement();
    }
}

function stopMeasurement() {
    measurementMode = false;
    map.getContainer().style.cursor = '';
    map.off('click', onMeasurementClick);
    
    // Clear previous measurements after 10 seconds
    setTimeout(() => {
        measurementMarkers.forEach(marker => map.removeLayer(marker));
        if (measurementLine) map.removeLayer(measurementLine);
        measurementMarkers = [];
        measurementLine = null;
    }, 10000);
}

// Global filter functions
function filterByRegion(region) {
    if (!window.siteMarkers) return;
    
    window.siteMarkers.forEach(marker => {
        const site = marker._site;
        const matches = region === 'all' || site.region === region;
        
        if (matches) {
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
    if (!window.siteMarkers) return;
    
    overlayLayers["Sites Ramsar"].clearLayers();
    overlayLayers["Zones Humides"].clearLayers();
    
    window.siteMarkers.forEach(marker => {
        const site = marker._site;
        let shouldShow = false;
        
        switch(type) {
            case 'all':
                shouldShow = true;
                break;
            case 'ramsar':
                shouldShow = marker._isRamsar;
                break;
            case 'wetland':
                shouldShow = !marker._isRamsar;
                break;
        }
        
        if (shouldShow) {
            if (marker._isRamsar) {
                overlayLayers["Sites Ramsar"].addLayer(marker);
            } else {
                overlayLayers["Zones Humides"].addLayer(marker);
            }
        }
    });
}

function updateFilterButtons(activeIndex) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach((btn, index) => {
        btn.classList.toggle('active', index === activeIndex);
    });
}

function zoomToSite(lat, lng) {
    map.setView([lat, lng], 14);
}

// Global functions for HTML template
window.filterByRegion = filterByRegion;
window.filterByType = filterByType;
window.updateFilterButtons = updateFilterButtons;
window.zoomToSite = zoomToSite;
window.toggleLegendBody = toggleLegendBody;
window.overlayLayers = overlayLayers;

