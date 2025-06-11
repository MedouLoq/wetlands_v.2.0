/**
 * Tableau de Bord Hybride - JavaScript
 * Gestion des graphiques fixes et de l'exploration dynamique des données
 */

class HybridDashboard {
    constructor() {
        this.charts = {};
        this.currentDataSource = null;
        this.selectedFields = {};
        this.isFullscreen = false;
        
        this.init();
    }
    
    init() {
        this.initializeStaticCharts();
        this.initializeDynamicExplorer();
        this.setupEventListeners();
        this.loadInitialData();
    }
    
    // ========================================================================
    // SECTION STATIQUE - GRAPHIQUES FIXES
    // ========================================================================
    
    async initializeStaticCharts() {
        console.log('Initialisation des graphiques fixes...');
        
        // Graphique d'évolution des espèces
        await this.createSpeciesEvolutionChart();
        
        // Distribution des sites par région
        await this.createSitesDistributionChart();
        
        // Répartition des espèces par groupe (visible uniquement en plein écran)
        if (this.isFullscreen) {
            await this.createSpeciesGroupChart();
        } else if (this.charts.speciesGroup) {
            this.charts.speciesGroup.destroy();
            delete this.charts.speciesGroup;
        }
        
        // Tendances des menaces (visible uniquement en plein écran)
        if (this.isFullscreen) {
            await this.createThreatsChart();
        } else if (this.charts.threats) {
            this.charts.threats.destroy();
            delete this.charts.threats;
        }
        
        // État de conservation (visible uniquement en plein écran)
        if (this.isFullscreen) {
            await this.createConservationChart();
        } else if (this.charts.conservation) {
            this.charts.conservation.destroy();
            delete this.charts.conservation;
        }
    }
    
    async createSpeciesEvolutionChart() {
        try {
            const response = await fetch('/api/dashboard/species-evolution/');
            const data = await response.json();
            
            const ctx = document.getElementById('speciesEvolutionChart');
            if (!ctx) return;
            
            // Détruire le graphique existant si il y en a un
            if (this.charts.speciesEvolution) {
                this.charts.speciesEvolution.destroy();
            }

            this.charts.speciesEvolution = new Chart(ctx, {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Évolution de la Biodiversité',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Nombre d\'Espèces'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Observations'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        } catch (error) {
            console.error('Erreur lors de la création du graphique d\'évolution:', error);
        }
    }
    
    async createSitesDistributionChart() {
        try {
            const response = await fetch('/api/dashboard/sites-by-region/');
            const data = await response.json();
            
            const ctx = document.getElementById('sitesDistributionChart');
            if (!ctx) return;
            
            // Détruire le graphique existant si il y en a un
            if (this.charts.sitesDistribution) {
                this.charts.sitesDistribution.destroy();
            }

            this.charts.sitesDistribution = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribution des Sites par Wilaya',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Nombre de Sites'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Wilayas'
                            }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutBounce'
                    }
                }
            });
        } catch (error) {
            console.error('Erreur lors de la création du graphique de distribution:', error);
        }
    }
    
    async createSpeciesGroupChart() {
        try {
            const response = await fetch('/api/dashboard/species-by-group/');
            const data = await response.json();
            
            const ctx = document.getElementById('speciesGroupChart');
            if (!ctx) return;
            
            // Détruire le graphique existant si il y en a un
            if (this.charts.speciesGroup) {
                this.charts.speciesGroup.destroy();
            }

            this.charts.speciesGroup = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Répartition des Espèces par Groupe',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            position: 'right'
                        }
                    },
                    animation: {
                        animateRotate: true,
                        duration: 2000
                    }
                }
            });
        } catch (error) {
            console.error('Erreur lors de la création du graphique des groupes:', error);
        }
    }
    
    async createThreatsChart() {
        try {
            const response = await fetch('/api/dashboard/threats-trends/');
            const data = await response.json();
            
            const ctx = document.getElementById('threatsChart');
            if (!ctx) return;
            
            // Détruire le graphique existant si il y en a un
            if (this.charts.threats) {
                this.charts.threats.destroy();
            }

            this.charts.threats = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Analyse des Menaces par Intensité',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Types de Menaces'
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Nombre de Menaces'
                            }
                        }
                    },
                    animation: {
                        duration: 1800,
                        easing: 'easeInOutCubic'
                    }
                }
            });
        } catch (error) {
            console.error('Erreur lors de la création du graphique des menaces:', error);
        }
    }
    
    async createConservationChart() {
        try {
            const response = await fetch('/api/dashboard/conservation-status/');
            const data = await response.json();
            
            const ctx = document.getElementById('conservationChart');
            if (!ctx) return;
            
            // Détruire le graphique existant si il y en a un
            if (this.charts.conservation) {
                this.charts.conservation.destroy();
            }

            this.charts.conservation = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        title: {
                            display: true,
                            text: 'État de Conservation par Wilaya',
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Score de Conservation (%)'
                            }
                        }
                    },
                    animation: {
                        duration: 2200,
                        easing: 'easeOutElastic'
                    }
                }
            });
        } catch (error) {
            console.error('Erreur lors de la création du graphique de conservation:', error);
        }
    }
    
    // ========================================================================
    // SECTION DYNAMIQUE - EXPLORATION INTERACTIVE
    // ========================================================================
    
    async initializeDynamicExplorer() {
        console.log('Initialisation de l\'explorateur dynamique...');
        await this.loadDataSources();
    }
    
    async loadDataSources() {
        try {
            const response = await fetch('/api/dynamic/data-sources/');
            const data = await response.json();
            
            this.renderDataSources(data.data_sources);
        } catch (error) {
            console.error('Erreur lors du chargement des sources de données:', error);
        }
    }
    
    renderDataSources(dataSources) {
        const container = document.getElementById('dataSourceGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        dataSources.forEach(source => {
            const card = document.createElement('div');
            card.className = 'data-source-card';
            card.dataset.sourceId = source.id;
            
            card.innerHTML = `
                <div class="data-source-icon">
                    <i class="${source.icon}"></i>
                </div>
                <div class="data-source-name">${source.name}</div>
                <div class="data-source-description">${source.description}</div>
                <div class="data-source-count">${source.record_count} enregistrements</div>
            `;
            
            card.addEventListener('click', () => this.selectDataSource(source));
            container.appendChild(card);
        });
    }
    
    async selectDataSource(source) {
        // Désélectionner les autres sources
        document.querySelectorAll('.data-source-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Sélectionner la nouvelle source
        const selectedCard = document.querySelector(`[data-source-id="${source.id}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        this.currentDataSource = source;
        
        // Charger les champs disponibles
        await this.loadFields(source.id);
        
        // Activer les contrôles
        this.enableVisualizationControls();
    }
    
    async loadFields(sourceId) {
        try {
            const response = await fetch(`/api/dynamic/fields/${sourceId}/`);
            const data = await response.json();
            
            this.populateFieldSelectors(data.fields);
        } catch (error) {
            console.error('Erreur lors du chargement des champs:', error);
        }
    }
    
    populateFieldSelectors(fields) {
        const xFieldSelect = document.getElementById('xFieldSelect');
        const yFieldSelect = document.getElementById('yFieldSelect');
        const groupBySelect = document.getElementById('groupBySelect');
        
        if (!xFieldSelect || !yFieldSelect) return;
        
        // Vider les sélecteurs
        [xFieldSelect, yFieldSelect, groupBySelect].forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">-- Sélectionner --</option>';
            }
        });
        
        // Remplir avec les nouveaux champs
        fields.forEach(field => {
            const option = document.createElement('option');
            option.value = field.id;
            option.textContent = field.name;
            option.dataset.type = field.type;
            
            xFieldSelect.appendChild(option.cloneNode(true));
            
            if (field.type === 'numeric') {
                yFieldSelect.appendChild(option.cloneNode(true));
            }
            
            if (groupBySelect && field.type === 'categorical') {
                groupBySelect.appendChild(option.cloneNode(true));
            }
        });
    }
    
    enableVisualizationControls() {
        const generateBtn = document.getElementById('generateVisualization');
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.classList.add('pulse');
        }
    }
    
    async generateVisualization() {
        const xField = document.getElementById('xFieldSelect')?.value;
        const yField = document.getElementById('yFieldSelect')?.value;
        const chartType = document.querySelector('.viz-type-btn.active')?.dataset.type || 'bar';
        const groupBy = document.getElementById('groupBySelect')?.value;
        
        if (!this.currentDataSource || !xField) {
            this.showNotification('Veuillez sélectionner une source de données et au moins un champ X', 'warning');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const requestData = {
                source: this.currentDataSource.id,
                x_field: xField,
                y_field: yField || 'count',
                chart_type: chartType,
                group_by: groupBy,
                filters: this.getActiveFilters()
            };
            
            const response = await fetch('/api/dynamic/query/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.renderDynamicVisualization(data);
            } else {
                this.showNotification(data.error || 'Erreur lors de la génération', 'error');
            }
        } catch (error) {
            console.error('Erreur lors de la génération:', error);
            this.showNotification('Erreur de connexion', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    renderDynamicVisualization(data) {
        const resultContainer = document.getElementById('dynamicResult');
        if (!resultContainer) return;
        
        resultContainer.style.display = 'block';
        resultContainer.classList.add('fade-in');
        
        // Mettre à jour le titre
        const resultTitle = document.getElementById('resultTitle');
        if (resultTitle) {
            resultTitle.textContent = `${this.currentDataSource.name} - ${data.chart_type.toUpperCase()}`;
        }
        
        if (data.chart_type === 'table') {
            this.renderTable(data);
        } else {
            this.renderChart(data);
        }
        
        // Faire défiler vers le résultat
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    renderChart(data) {
        const canvas = document.getElementById('dynamicChart');
        if (!canvas) return;
        
        // Détruire le graphique existant
        if (this.charts.dynamic) {
            this.charts.dynamic.destroy();
        }
        
        const chartData = {
            labels: data.labels,
            datasets: [{
                label: 'Données',
                data: data.data,
                backgroundColor: this.generateColors(data.data.length),
                borderColor: this.generateColors(data.data.length, 1),
                borderWidth: 2
            }]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${this.currentDataSource.name} (${data.total_records} éléments)`,
                    font: { size: 16, weight: 'bold' }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        };
        
        this.charts.dynamic = new Chart(canvas, {
            type: data.chart_type,
            data: chartData,
            options: options
        });
    }
    
    renderTable(data) {
        const tableContainer = document.getElementById('dynamicTable');
        if (!tableContainer) return;
        
        let html = '<table class="result-table"><thead><tr>';
        
        // En-têtes
        data.columns.forEach(column => {
            html += `<th>${column}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Données
        data.data.forEach(row => {
            html += '<tr>';
            data.columns.forEach(column => {
                html += `<td>${row[column] || '-'}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    }
    
    // ========================================================================
    // UTILITAIRES ET HELPERS
    // ========================================================================
    
    setupEventListeners() {
        // Bouton plein écran
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // Bouton actualiser
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // Sélecteurs de type de visualisation
        document.querySelectorAll('.viz-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.viz-type-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.viz-type-btn').classList.add('active');
            });
        });
        
        // Bouton générer
        const generateBtn = document.getElementById('generateVisualization');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateVisualization());
        }
        
        // Boutons d'export
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.dataset.format;
                this.exportData(format);
            });
        });
    }
    
    async loadInitialData() {
        try {
            const response = await fetch('/api/dashboard/summary-stats/');
            const stats = await response.json();
            
            this.updateSummaryStats(stats);
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    }
    
    updateSummaryStats(stats) {
        // Mettre à jour les statistiques dans l'interface
        const elements = {
            'totalSites': stats.total_sites,
            'ramsarSites': stats.ramsar_sites,
            'totalSpecies': stats.total_species,
            'totalObservations': stats.total_observations
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                this.animateNumber(element, value);
            }
        });
    }
    
    animateNumber(element, target) {
        const start = 0;
        const duration = 2000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (target - start) * this.easeOutQuart(progress));
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }
    
    generateColors(count, alpha = 0.8) {
        const colors = [
            `rgba(102, 126, 234, ${alpha})`,
            `rgba(255, 99, 132, ${alpha})`,
            `rgba(255, 206, 86, ${alpha})`,
            `rgba(75, 192, 192, ${alpha})`,
            `rgba(153, 102, 255, ${alpha})`,
            `rgba(255, 159, 64, ${alpha})`,
            `rgba(199, 199, 199, ${alpha})`,
            `rgba(83, 102, 255, ${alpha})`
        ];
        
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }
    

toggleFullscreen() {
    const container = document.querySelector('.dashboard-container');
    const btn = document.getElementById('fullscreenBtn');
    
    if (!document.fullscreenElement) {
        // Entrer en mode fullscreen natif
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.mozRequestFullScreen) {
            container.mozRequestFullScreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        }
        
        this.isFullscreen = true;
        btn.innerHTML = '<i class="fas fa-compress"></i> Quitter';
        
    } else {
        // Sortir du mode fullscreen natif
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        this.isFullscreen = false;
        btn.innerHTML = '<i class="fas fa-expand"></i> Plein écran';
    }
    
    // Écouter les changements de fullscreen
    const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
            this.isFullscreen = false;
            btn.innerHTML = '<i class="fas fa-expand"></i> Plein écran';
        }
        this.initializeStaticCharts();
    };
    
    // Ajouter les event listeners si pas déjà fait
    if (!this.fullscreenListenersAdded) {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);
        this.fullscreenListenersAdded = true;
    }
}

    
    async refreshDashboard() {
        this.showNotification('Actualisation en cours...', 'info');
        
        // Recharger les graphiques statiques
        await this.initializeStaticCharts();
        
        // Recharger les données initiales
        await this.loadInitialData();
        
        this.showNotification('Tableau de bord actualisé', 'success');
    }
    
    showLoading(show) {
        const loadingElements = document.querySelectorAll('.chart-loading');
        loadingElements.forEach(element => {
            element.style.display = show ? 'block' : 'none';
        });
    }
    
    showNotification(message, type = 'info') {
        // Créer une notification toast
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Styles inline pour la notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 2rem',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '600',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // Couleurs selon le type
        const colors = {
            info: '#3498db',
            success: '#2ecc71',
            warning: '#f39c12',
            error: '#e74c3c'
        };
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Suppression automatique
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    getActiveFilters() {
        // Récupérer les filtres actifs depuis l'interface
        const filters = {};
        
        // Exemple de filtres (à adapter selon l'interface)
        const dateFilter = document.getElementById('dateFilter')?.value;
        if (dateFilter) {
            filters.date = dateFilter;
        }
        
        const regionFilter = document.getElementById('regionFilter')?.value;
        if (regionFilter) {
            filters.region = regionFilter;
        }
        
        return filters;
    }
    
    getCSRFToken() {
    // Try multiple sources for the token
    let token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    
    if (!token) {
        // Try meta tag
        token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    }
    
    if (!token) {
        // Try cookie (if you have django.middleware.csrf.CsrfViewMiddleware)
        token = this.getCookie('csrftoken');
    }
    
    console.log('CSRF Token:', token); // Debug log
    return token || '';
}

getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
    
    async exportData(format) {
        if (!this.charts.dynamic) {
            this.showNotification('Aucune visualisation à exporter', 'warning');
            return;
        }
        
        try {
            if (format === 'png') {
                const canvas = document.getElementById('dynamicChart');
                const link = document.createElement('a');
                link.download = `dashboard-${Date.now()}.png`;
                link.href = canvas.toDataURL();
                link.click();
            } else {
                this.showNotification('Export en cours de développement', 'info');
            }
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.showNotification('Erreur lors de l\'export', 'error');
        }
    }
}

// Initialisation du tableau de bord
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier que Chart.js est chargé
    if (typeof Chart === 'undefined') {
        console.error('Chart.js n\'est pas chargé');
        return;
    }
    
    // Initialiser le tableau de bord
    window.dashboard = new HybridDashboard();
    
    console.log('Tableau de bord hybride initialisé');
});

