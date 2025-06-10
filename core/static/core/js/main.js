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

// Enhanced JavaScript for GeoWetlands Mauritania
// Additional functionality and optimizations

document.addEventListener('DOMContentLoaded', function() {
    // Initialize preloader
    initializePreloader();
    
    // Initialize scroll effects
    initializeScrollEffects();
    
    // Initialize counter animations
    initializeCounterAnimations();
    
    // Initialize scroll to top button
    initializeScrollToTop();
    
    // Initialize enhanced tooltips
    initializeEnhancedTooltips();
    
    // Initialize lazy loading
    initializeLazyLoading();
});

// Preloader functionality
function initializePreloader() {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        window.addEventListener('load', function() {
            setTimeout(() => {
                preloader.classList.add('fade-out');
                setTimeout(() => {
                    preloader.style.display = 'none';
                }, 500);
            }, 1000);
        });
    }
}

// Scroll effects for navbar
function initializeScrollEffects() {
    const navbar = document.getElementById('mainNav');
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
}

// Enhanced counter animations
function initializeCounterAnimations() {
    const counters = document.querySelectorAll('.counter-value');
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                animateCounter(entry.target);
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 2000; // 2 seconds
    const start = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(target * easeOutQuart);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target.toLocaleString();
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Scroll to top button
function initializeScrollToTop() {
    // Create scroll to top button
    const scrollButton = document.createElement('button');
    scrollButton.className = 'scroll-to-top';
    scrollButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
    scrollButton.setAttribute('aria-label', 'Scroll to top');
    document.body.appendChild(scrollButton);
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            scrollButton.classList.add('show');
        } else {
            scrollButton.classList.remove('show');
        }
    });
    
    // Smooth scroll to top
    scrollButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Enhanced tooltips
function initializeEnhancedTooltips() {
    const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipElements.forEach(element => {
        new bootstrap.Tooltip(element, {
            animation: true,
            delay: { show: 500, hide: 100 },
            html: true
        });
    });
}

// Lazy loading for images
function initializeLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback for older browsers
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

// Enhanced form validation
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '#!') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Enhanced search functionality
function enhanceSearchForms() {
    const searchForms = document.querySelectorAll('form[role="search"]');
    
    searchForms.forEach(form => {
        const input = form.querySelector('input[type="search"], input[type="text"]');
        if (input) {
            // Add search suggestions
            input.addEventListener('input', debounce(function() {
                const query = this.value.trim();
                if (query.length >= 2) {
                    // Implement search suggestions here
                    showSearchSuggestions(query, this);
                }
            }, 300));
        }
    });
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show search suggestions (placeholder)
function showSearchSuggestions(query, input) {
    // This would typically make an AJAX request to get suggestions
    console.log('Search suggestions for:', query);
}

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
    enhanceSearchForms();
});

// Performance monitoring
function logPerformance() {
    if ('performance' in window) {
        window.addEventListener('load', function() {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }, 0);
        });
    }
}

// Initialize performance monitoring in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    logPerformance();
}

// Export functions for global access
window.GeoWetlands = {
    validateForm,
    animateCounter,
    debounce
};

