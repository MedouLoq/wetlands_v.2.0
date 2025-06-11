/**
 * Tableau de Bord Hybride - JavaScript CORRIGÉ
 * Gestion des graphiques fixes et de l'exploration dynamique des données
 * VERSION CORRIGÉE POUR AFFICHAGE OPTIMAL DES GRAPHIQUES
 */

class HybridDashboard {
    constructor() {
        this.charts = {};
        this.currentDataSource = null;
        this.selectedFields = {};
        this.isFullscreen = false;
        this.fullscreenListenersAdded = false;
        
        this.init();
    }
    
    init() {
        // Attendre que le DOM soit complètement chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeComponents();
            });
        } else {
            this.initializeComponents();
        }
    }
    
    async initializeComponents() {
        console.log('Initialisation des composants du tableau de bord...');
        
        // Initialiser dans l'ordre correct
        this.setupEventListeners();
        await this.loadInitialData();
        
        // Attendre un peu pour que les éléments soient rendus
        setTimeout(async () => {
            await this.initializeStaticCharts();
            await this.initializeDynamicExplorer();
        }, 100);
    }
    
    // ========================================================================
    // SECTION STATIQUE - GRAPHIQUES FIXES
    // ========================================================================
    
    async initializeStaticCharts() {
        console.log('Initialisation des graphiques fixes...');
        
        // Vérifier que Chart.js est chargé
        if (typeof Chart === 'undefined') {
            console.error('Chart.js n\'est pas chargé. Veuillez inclure la bibliothèque Chart.js.');
            return;
        }
        
        try {
            // Graphique d'évolution des espèces
            await this.createSpeciesEvolutionChart();
            
            // Distribution des sites par région
            await this.createSitesDistributionChart();
            
            // Graphiques visibles uniquement en plein écran
            if (this.isFullscreen) {
                await this.createSpeciesGroupChart();
                await this.createThreatsChart();
                await this.createConservationChart();
            } else {
                // Détruire les graphiques fullscreen si on n'est plus en fullscreen
                ['speciesGroup', 'threats', 'conservation'].forEach(chartKey => {
                    if (this.charts[chartKey]) {
                        this.charts[chartKey].destroy();
                        delete this.charts[chartKey];
                    }
                });
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des graphiques:', error);
        }
    }
    
    async createSpeciesEvolutionChart() {
        try {
            const ctx = document.getElementById('speciesEvolutionChart');
            if (!ctx) {
                console.warn('Élément speciesEvolutionChart non trouvé');
                return;
            }
            
            // Détruire le graphique existant
            if (this.charts.speciesEvolution) {
                this.charts.speciesEvolution.destroy();
            }
            
            // Données de démonstration si l'API n'est pas disponible
            let data;
            try {
                const response = await fetch('/api/dashboard/species-evolution/');
                if (response.ok) {
                    data = await response.json();
                } else {
                    throw new Error('API non disponible');
                }
            } catch (error) {
                console.warn('Utilisation de données de démonstration pour l\'évolution des espèces');
                data = this.getDemoEvolutionData();
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
                        x: {
                            title: {
                                display: true,
                                text: 'Période'
                            }
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
            
            console.log('Graphique d\'évolution créé avec succès');
        } catch (error) {
            console.error('Erreur lors de la création du graphique d\'évolution:', error);
        }
    }
    
    async createSitesDistributionChart() {
        try {
            const ctx = document.getElementById('sitesDistributionChart');
            if (!ctx) {
                console.warn('Élément sitesDistributionChart non trouvé');
                return;
            }
            
            // Détruire le graphique existant
            if (this.charts.sitesDistribution) {
                this.charts.sitesDistribution.destroy();
            }
            
            // Données de démonstration si l'API n'est pas disponible
            let data;
            try {
                const response = await fetch('/api/dashboard/sites-by-region/');
                if (response.ok) {
                    data = await response.json();
                } else {
                    throw new Error('API non disponible');
                }
            } catch (error) {
                console.warn('Utilisation de données de démonstration pour la distribution des sites');
                data = this.getDemoDistributionData();
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
            
            console.log('Graphique de distribution créé avec succès');
        } catch (error) {
            console.error('Erreur lors de la création du graphique de distribution:', error);
        }
    }
    
    async createSpeciesGroupChart() {
        try {
            const ctx = document.getElementById('speciesGroupChart');
            if (!ctx) {
                console.warn('Élément speciesGroupChart non trouvé');
                return;
            }
            
            // Détruire le graphique existant
            if (this.charts.speciesGroup) {
                this.charts.speciesGroup.destroy();
            }
            
            // Données de démonstration si l'API n'est pas disponible
            let data;
            try {
                const response = await fetch('/api/dashboard/species-by-group/');
                if (response.ok) {
                    data = await response.json();
                } else {
                    throw new Error('API non disponible');
                }
            } catch (error) {
                console.warn('Utilisation de données de démonstration pour les groupes d\'espèces');
                data = this.getDemoSpeciesGroupData();
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
            
            console.log('Graphique des groupes d\'espèces créé avec succès');
        } catch (error) {
            console.error('Erreur lors de la création du graphique des groupes:', error);
        }
    }
    
    async createThreatsChart() {
        try {
            const ctx = document.getElementById('threatsChart');
            if (!ctx) {
                console.warn('Élément threatsChart non trouvé');
                return;
            }
            
            // Détruire le graphique existant
            if (this.charts.threats) {
                this.charts.threats.destroy();
            }
            
            // Données de démonstration si l'API n'est pas disponible
            let data;
            try {
                const response = await fetch('/api/dashboard/threats-trends/');
                if (response.ok) {
                    data = await response.json();
                } else {
                    throw new Error('API non disponible');
                }
            } catch (error) {
                console.warn('Utilisation de données de démonstration pour les menaces');
                data = this.getDemoThreatsData();
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
            
            console.log('Graphique des menaces créé avec succès');
        } catch (error) {
            console.error('Erreur lors de la création du graphique des menaces:', error);
        }
    }
    
    async createConservationChart() {
        try {
            const ctx = document.getElementById('conservationChart');
            if (!ctx) {
                console.warn('Élément conservationChart non trouvé');
                return;
            }
            
            // Détruire le graphique existant
            if (this.charts.conservation) {
                this.charts.conservation.destroy();
            }
            
            // Données de démonstration si l'API n'est pas disponible
            let data;
            try {
                const response = await fetch('/api/dashboard/conservation-status/');
                if (response.ok) {
                    data = await response.json();
                } else {
                    throw new Error('API non disponible');
                }
            } catch (error) {
                console.warn('Utilisation de données de démonstration pour la conservation');
                data = this.getDemoConservationData();
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
            
            console.log('Graphique de conservation créé avec succès');
        } catch (error) {
            console.error('Erreur lors de la création du graphique de conservation:', error);
        }
    }
    
    // ========================================================================
    // DONNÉES DE DÉMONSTRATION
    // ========================================================================
    
    getDemoEvolutionData() {
        return {
            labels: ['2019', '2020', '2021', '2022', '2023', '2024'],
            datasets: [{
                label: 'Espèces Recensées',
                data: [45, 52, 48, 61, 58, 67],
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                tension: 0.4
            }, {
                label: 'Nouvelles Découvertes',
                data: [3, 7, 2, 8, 5, 9],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.4
            }]
        };
    }
    
    getDemoDistributionData() {
        return {
            labels: ['Trarza', 'Adrar', 'Tagant', 'Brakna', 'Assaba', 'Gorgol', 'Inchiri'],
            datasets: [{
                label: 'Sites de Zones Humides',
                data: [12, 8, 6, 15, 9, 11, 4],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(199, 199, 199, 0.8)'
                ],
                borderColor: [
                    'rgb(102, 126, 234)',
                    'rgb(255, 99, 132)',
                    'rgb(255, 206, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(153, 102, 255)',
                    'rgb(255, 159, 64)',
                    'rgb(199, 199, 199)'
                ],
                borderWidth: 2
            }]
        };
    }
    
    getDemoSpeciesGroupData() {
        return {
            labels: ['Oiseaux', 'Poissons', 'Mammifères', 'Plantes', 'Reptiles', 'Insectes'],
            datasets: [{
                data: [35, 18, 12, 25, 8, 15],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ],
                borderColor: [
                    'rgb(102, 126, 234)',
                    'rgb(255, 99, 132)',
                    'rgb(255, 206, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(153, 102, 255)',
                    'rgb(255, 159, 64)'
                ],
                borderWidth: 2
            }]
        };
    }
    
    getDemoThreatsData() {
        return {
            labels: ['Pollution', 'Surpêche', 'Urbanisation', 'Changement Climatique', 'Agriculture'],
            datasets: [{
                label: 'Faible',
                data: [5, 3, 2, 4, 6],
                backgroundColor: 'rgba(75, 192, 192, 0.8)'
            }, {
                label: 'Modérée',
                data: [8, 6, 7, 9, 5],
                backgroundColor: 'rgba(255, 206, 86, 0.8)'
            }, {
                label: 'Élevée',
                data: [3, 8, 6, 5, 2],
                backgroundColor: 'rgba(255, 99, 132, 0.8)'
            }]
        };
    }
    
    getDemoConservationData() {
        return {
            labels: ['Trarza', 'Adrar', 'Tagant', 'Brakna', 'Assaba', 'Gorgol', 'Inchiri'],
            datasets: [{
                data: [78, 65, 82, 71, 69, 75, 88],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(75, 192, 192, 0.8)'
                ],
                borderColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 206, 86)',
                    'rgb(102, 126, 234)',
                    'rgb(255, 159, 64)',
                    'rgb(255, 99, 132)',
                    'rgb(153, 102, 255)',
                    'rgb(75, 192, 192)'
                ],
                borderWidth: 2
            }]
        };
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
            if (response.ok) {
                const data = await response.json();
                this.renderDataSources(data.data_sources);
            } else {
                // Utiliser des données de démonstration
                this.renderDataSources(this.getDemoDataSources());
            }
        } catch (error) {
            console.warn('Utilisation de sources de données de démonstration');
            this.renderDataSources(this.getDemoDataSources());
        }
    }
    
    getDemoDataSources() {
        return [
            {
                id: 'wetland_sites',
                name: 'Sites de Zones Humides',
                description: 'Données sur les sites de zones humides',
                icon: 'fas fa-water',
                record_count: 65
            },
            {
                id: 'species_data',
                name: 'Données d\'Espèces',
                description: 'Inventaire des espèces observées',
                icon: 'fas fa-leaf',
                record_count: 113
            },
            {
                id: 'conservation_measures',
                name: 'Mesures de Conservation',
                description: 'Actions de conservation mises en place',
                icon: 'fas fa-shield-alt',
                record_count: 28
            }
        ];
    }
    
    renderDataSources(dataSources) {
        const container = document.getElementById('dataSourceGrid');
        if (!container) {
            console.warn('Conteneur dataSourceGrid non trouvé');
            return;
        }
        
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
            if (response.ok) {
                const data = await response.json();
                this.populateFieldSelectors(data.fields);
            } else {
                // Utiliser des champs de démonstration
                this.populateFieldSelectors(this.getDemoFields(sourceId));
            }
        } catch (error) {
            console.warn('Utilisation de champs de démonstration');
            this.populateFieldSelectors(this.getDemoFields(sourceId));
        }
    }
    
    getDemoFields(sourceId) {
        const fieldSets = {
            'wetland_sites': [
                { id: 'region', name: 'Région', type: 'categorical' },
                { id: 'area', name: 'Superficie (ha)', type: 'numeric' },
                { id: 'type', name: 'Type de Zone Humide', type: 'categorical' },
                { id: 'ramsar_status', name: 'Statut Ramsar', type: 'categorical' }
            ],
            'species_data': [
                { id: 'taxonomic_group', name: 'Groupe Taxonomique', type: 'categorical' },
                { id: 'conservation_status', name: 'Statut de Conservation', type: 'categorical' },
                { id: 'observation_count', name: 'Nombre d\'Observations', type: 'numeric' },
                { id: 'site_count', name: 'Nombre de Sites', type: 'numeric' }
            ],
            'conservation_measures': [
                { id: 'measure_type', name: 'Type de Mesure', type: 'categorical' },
                { id: 'effectiveness', name: 'Efficacité (%)', type: 'numeric' },
                { id: 'cost', name: 'Coût (USD)', type: 'numeric' },
                { id: 'region', name: 'Région', type: 'categorical' }
            ]
        };
        
        return fieldSets[sourceId] || [];
    }
    
    populateFieldSelectors(fields) {
        const xFieldSelect = document.getElementById('xFieldSelect');
        const yFieldSelect = document.getElementById('yFieldSelect');
        const groupBySelect = document.getElementById('groupBySelect');
        
        if (!xFieldSelect || !yFieldSelect) {
            console.warn('Sélecteurs de champs non trouvés');
            return;
        }
        
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
            
            let data;
            try {
                const response = await fetch('/api/dynamic/query/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken()
                    },
                    body: JSON.stringify(requestData)
                });
                
                if (response.ok) {
                    data = await response.json();
                } else {
                    throw new Error('API non disponible');
                }
            } catch (error) {
                console.warn('Utilisation de données de démonstration pour la visualisation dynamique');
                data = this.getDemoDynamicData(chartType, xField);
            }
            
            this.renderDynamicVisualization(data);
        } catch (error) {
            console.error('Erreur lors de la génération:', error);
            this.showNotification('Erreur lors de la génération', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    getDemoDynamicData(chartType, xField) {
        const demoData = {
            chart_type: chartType,
            labels: ['Catégorie A', 'Catégorie B', 'Catégorie C', 'Catégorie D'],
            data: [12, 19, 8, 15],
            total_records: 54
        };
        
        if (chartType === 'table') {
            demoData.columns = ['Nom', 'Valeur', 'Statut'];
            demoData.data = [
                { 'Nom': 'Élément 1', 'Valeur': 25, 'Statut': 'Actif' },
                { 'Nom': 'Élément 2', 'Valeur': 18, 'Statut': 'Inactif' },
                { 'Nom': 'Élément 3', 'Valeur': 32, 'Statut': 'Actif' }
            ];
        }
        
        return demoData;
    }
    
    renderDynamicVisualization(data) {
        const resultContainer = document.getElementById('dynamicResult');
        if (!resultContainer) {
            console.warn('Conteneur de résultats dynamiques non trouvé');
            return;
        }
        
        // Afficher le conteneur de résultats
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
        setTimeout(() => {
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
    
    renderChart(data) {
        const canvas = document.getElementById('dynamicChart');
        if (!canvas) {
            console.warn('Canvas dynamicChart non trouvé');
            return;
        }
        
        // S'assurer que le canvas est visible
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '400px';
        
        // Détruire le graphique existant
        if (this.charts.dynamic) {
            this.charts.dynamic.destroy();
        }
        
        const chartData = {
            labels: data.labels,
            datasets: [{
                label: 'Données',
                data: data.data,
                backgroundColor: this.generateColors(data.data.length, 0.8),
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
                },
                legend: {
                    display: data.chart_type !== 'pie' && data.chart_type !== 'doughnut'
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        };
        
        // Options spécifiques selon le type de graphique
        if (data.chart_type === 'bar') {
            options.scales = {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Valeurs'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Catégories'
                    }
                }
            };
        }
        
        try {
            this.charts.dynamic = new Chart(canvas, {
                type: data.chart_type,
                data: chartData,
                options: options
            });
            
            console.log('Graphique dynamique créé avec succès');
        } catch (error) {
            console.error('Erreur lors de la création du graphique dynamique:', error);
        }
    }
    
    renderTable(data) {
        const tableContainer = document.getElementById('dynamicTable');
        if (!tableContainer) {
            console.warn('Conteneur de table dynamique non trouvé');
            return;
        }
        
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
        
        console.log('Table dynamique créée avec succès');
    }
    
    // ========================================================================
    // UTILITAIRES ET HELPERS
    // ========================================================================
    
    setupEventListeners() {
        console.log('Configuration des event listeners...');
        
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
        
        // Sélectionner le premier type de visualisation par défaut
        const firstVizBtn = document.querySelector('.viz-type-btn');
        if (firstVizBtn) {
            firstVizBtn.classList.add('active');
        }
    }
    
    async loadInitialData() {
        try {
            const response = await fetch('/api/dashboard/summary-stats/');
            if (response.ok) {
                const stats = await response.json();
                this.updateSummaryStats(stats);
            } else {
                // Utiliser des statistiques de démonstration
                this.updateSummaryStats({
                    total_sites: 65,
                    ramsar_sites: 4,
                    total_species: 113,
                    total_observations: 1247
                });
            }
        } catch (error) {
            console.warn('Utilisation de statistiques de démonstration');
            this.updateSummaryStats({
                total_sites: 65,
                ramsar_sites: 4,
                total_species: 113,
                total_observations: 1247
            });
        }
    }
    
    updateSummaryStats(stats) {
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
            if (btn) btn.innerHTML = '<i class="fas fa-compress"></i> Quitter';
            
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
            if (btn) btn.innerHTML = '<i class="fas fa-expand"></i> Plein écran';
        }
        
        // Écouter les changements de fullscreen
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                this.isFullscreen = false;
                if (btn) btn.innerHTML = '<i class="fas fa-expand"></i> Plein écran';
            }
            // Réinitialiser les graphiques après changement de mode
            setTimeout(() => {
                this.initializeStaticCharts();
            }, 100);
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
        
        // Afficher/masquer le spinner sur le bouton générer
        const generateBtn = document.getElementById('generateVisualization');
        if (generateBtn) {
            if (show) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
            } else {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Générer la Visualisation';
            }
        }
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
        
        // Animer l'entrée
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    getActiveFilters() {
        // Retourner les filtres actifs (à implémenter selon vos besoins)
        return {};
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
    
    exportData(format) {
        if (!this.charts.dynamic) {
            this.showNotification('Aucune visualisation à exporter', 'warning');
            return;
        }
        
        if (format === 'png') {
            const canvas = document.getElementById('dynamicChart');
            if (canvas) {
                const link = document.createElement('a');
                link.download = 'graphique.png';
                link.href = canvas.toDataURL();
                link.click();
                this.showNotification('Graphique exporté en PNG', 'success');
            }
        } else {
            this.showNotification(`Export ${format.toUpperCase()} non implémenté`, 'info');
        }
    }
}

// Initialiser le tableau de bord quand la page est chargée
let dashboard;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        dashboard = new HybridDashboard();
    });
} else {
    dashboard = new HybridDashboard();
}

// Exposer l'instance globalement pour le débogage
window.dashboard = dashboard;

