// Main JavaScript file for GeoWetlands Mauritania

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl)
    });

    // Counter animation for statistics
    const counterElements = document.querySelectorAll('.counter-value');
    
    if (counterElements.length > 0) {
        const options = {
            threshold: 0.5
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    const countTo = parseInt(target.getAttribute('data-count'));
                    
                    let count = 0;
                    const updateCount = () => {
                        const increment = countTo / 50; // Adjust speed here
                        
                        if (count < countTo) {
                            count += increment;
                            target.innerText = Math.ceil(count);
                            setTimeout(updateCount, 20);
                        } else {
                            target.innerText = countTo;
                        }
                    };
                    
                    updateCount();
                    observer.unobserve(target);
                }
            });
        }, options);
        
        counterElements.forEach(el => {
            observer.observe(el);
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.getAttribute('href') !== "#") {
                e.preventDefault();
                
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Filter functionality for wetland sites and species
    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            this.submit();
        });
    }

    // Image lazy loading with fade-in effect
    const lazyImages = document.querySelectorAll('.lazy-image');
    if (lazyImages.length > 0) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    
                    if (src) {
                        img.src = src;
                        img.classList.add('fade-in');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        lazyImages.forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Mobile menu toggle animation
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler) {
        navbarToggler.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    }

    // Dropdown hover effect for desktop
    if (window.innerWidth > 992) {
        const dropdowns = document.querySelectorAll('.navbar .dropdown');
        
        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('mouseenter', function() {
                this.querySelector('.dropdown-toggle').click();
            });
            
            dropdown.addEventListener('mouseleave', function() {
                this.querySelector('.dropdown-toggle').click();
            });
        });
    }

    // Initialize interactive map if element exists
    const mapElement = document.getElementById('map');
    if (mapElement) {
        initializeMap();
    }
});

// Map initialization function
function initializeMap() {
    // Create map centered on Mauritania
    const map = L.map('map').setView([20.5, -10.5], 6);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add satellite imagery layer
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });
    
    // Add layer control
    const baseMaps = {
        "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        "Satellite": satelliteLayer
    };
    
    L.control.layers(baseMaps).addTo(map);
    
    // Get wetland site markers from data attribute if available
    const sitesDataElement = document.getElementById('sites-data');
    if (sitesDataElement) {
        try {
            const sitesData = JSON.parse(sitesDataElement.getAttribute('data-sites'));
            
            // Add markers for each site
            sitesData.forEach(site => {
                if (site.geometry) {
                    const marker = L.marker([site.geometry.coordinates[1], site.geometry.coordinates[0]])
                        .addTo(map)
                        .bindPopup(`
                            <div class="map-info">
                                <h5>${site.name}</h5>
                                <p><strong>Region:</strong> ${site.region || 'N/A'}</p>
                                <p><strong>Commune:</strong> ${site.commune || 'N/A'}</p>
                                <a href="/wetland-sites/${site.id}/" class="btn btn-sm btn-primary">View Details</a>
                            </div>
                        `);
                }
            });
            
            // Fit map to markers if any exist
            if (sitesData.length > 0 && sitesData.some(site => site.geometry)) {
                const bounds = L.latLngBounds(sitesData
                    .filter(site => site.geometry)
                    .map(site => [site.geometry.coordinates[1], site.geometry.coordinates[0]]));
                map.fitBounds(bounds);
            }
        } catch (e) {
            console.error("Error parsing sites data:", e);
        }
    }
}
