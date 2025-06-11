"""
Core app views for the GeoWetlands Mauritania project
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.contrib.gis.serializers import geojson
from .models import WetlandSite, Species, TaxonomicGroup, Wilaya, SiteSpeciesInventory, SpeciesImage # Import SpeciesImage
from django.db.models import Count, Q
import json


@login_required
def home(request):
    """Home page view"""
    # Get featured wetland sites (limit to 3)
    featured_sites = WetlandSite.objects.all().order_by("?")[:3]
    
    # Get species count by taxonomic group for the dashboard
    taxonomic_groups = TaxonomicGroup.objects.all()
    species_counts = []
    for group in taxonomic_groups:
        count = Species.objects.filter(taxonomic_group=group).count()
        if count > 0:
            species_counts.append({
                'name': group.name,
                'count': count,
                'icon': get_taxonomic_group_icon(group.name)
            })
    
    # Get total counts for dashboard
    total_sites = WetlandSite.objects.count()
    total_species = Species.objects.count()
    
    context = {
        'featured_sites': featured_sites,
        'species_counts': species_counts,
        'total_sites': total_sites,
        'total_species': total_species,
    }
    return render(request, 'core/home.html', context)

@login_required
def about(request):
    """About page view"""
    return render(request, 'core/about.html')


@login_required
def wetland_sites(request):
    """Wetland sites listing page"""
    # Get filter parameters
    region = request.GET.get('region', '')
    search_query = request.GET.get('q', '')
    
    # Base queryset
    sites = WetlandSite.objects.all()
    
    # Apply filters
    if region:
        sites = sites.filter(region=region)
    if search_query:
        sites = sites.filter(name__icontains=search_query)
    
    # Get unique regions for filter dropdown
    regions = WetlandSite.objects.values_list('region', flat=True).distinct()
    
    # Pagination
    paginator = Paginator(sites, 9)  # 9 sites per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'regions': regions,
        'selected_region': region,
        'search_query': search_query,
    }
    return render(request, 'core/wetland_sites.html', context)


@login_required
def wetland_site_detail(request, site_id):
    """Wetland site detail page"""
    site = get_object_or_404(WetlandSite, id=site_id)
    
    # Get related species
    species = site.species_inventory.all()
    
    # Get threats
    threats = site.threats.all()
    
    # Get conservation measures
    measures = site.conservation_measures.all()
    
    context = {
        'site': site,
        'species': species,
        'threats': threats,
        'measures': measures,
    }
    return render(request, 'core/wetland_site_detail.html', context)


@login_required
def species_list(request):
    """Species listing page"""
    # Get filter parameters
    taxonomic_group = request.GET.get('group', '')
    search_query = request.GET.get('q', '')
    
    # Base queryset - Fetch related images
    species_queryset = Species.objects.all().prefetch_related('images')
    
    # Apply filters
    if taxonomic_group:
        species_queryset = species_queryset.filter(taxonomic_group__name=taxonomic_group)
    if search_query:
        species_queryset = species_queryset.filter(
            scientific_name__icontains=search_query
        ) | species_queryset.filter(
            common_name_fr__icontains=search_query
        ) | species_queryset.filter(
            common_name_local__icontains=search_query
        )
    
    # Get taxonomic groups for filter dropdown
    groups = TaxonomicGroup.objects.all()
    
    # Pagination
    paginator = Paginator(species_queryset, 12)  # 12 species per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'groups': groups,
        'selected_group': taxonomic_group,
        'search_query': search_query,
    }
    return render(request, 'core/species_list.html', context)


@login_required
def species_detail(request, species_id):
    """Species detail page"""
    species = get_object_or_404(Species.objects.prefetch_related('images'), id=species_id)
    
    # Get sites where this species is found and filter out those without geometry
    sites = species.wetland_sites.exclude(geometry__isnull=True)
    
    # Serialize site geometries to GeoJSON
    sites_geojson = []
    for site in sites:
        if site.geometry:
            sites_geojson.append({
                "type": "Feature",
                "properties": {
                    "name": site.name,
                    "id": site.id,
                    "region": site.region,
                    "is_ramsar_site": site.is_ramsar_site
                },
                "geometry": json.loads(site.geometry.geojson)
            })
    
    context = {
        'species': species,
        'sites': sites,
        'sites_geojson': json.dumps(sites_geojson)
    }
    return render(request, 'core/species_detail.html', context)


@login_required
def map(request):
    """Interactive map view"""
    # Get all wetland sites with geometry
    sites = WetlandSite.objects.exclude(geometry__isnull=True)
    
    # Calculate statistics
    total_sites = sites.count()
    total_regions = sites.values('region').distinct().count()
    ramsar_sites = sites.filter(is_ramsar_site=True).count()
    
    # Get unique regions for filters
    regions = sites.values_list('region', flat=True).distinct().exclude(region__isnull=True)
    
    context = {
        'sites': sites,
        'total_sites': total_sites,
        'total_regions': total_regions,
        'ramsar_sites': ramsar_sites,
        'regions': regions,
    }
    return render(request, 'core/map.html', context)

@login_required
def profile(request):
    """User profile page"""
    return render(request, 'core/profile.html')

# Helper functions


def get_taxonomic_group_icon(group_name):
    """Return an appropriate Font Awesome icon class for each taxonomic group"""
    icons = {
        'Bird': 'fa-dove',
        'Fish': 'fa-fish',
        'Mammal': 'fa-otter',
        'Plant': 'fa-seedling',
        'Reptile': 'fa-dragon',
        'Insect': 'fa-bug',
        'Other Invertebrate': 'fa-water',
    }
    return f"fas {icons.get(group_name, 'fa-paw')}"

def wilayas_geojson(request):
    """Return wilayas as GeoJSON with correct site statistics - FIXED VERSION"""
    
    # Create a mapping dictionary to handle name mismatches
    REGION_TO_WILAYA_MAPPING = {
        # Exact matches (no change needed)
        'Trarza': 'Trarza',
        'Tagant': 'Tagant',
        'Adrar': 'Adrar',
        'Assaba': 'Assaba',
        'Brakna': 'Brakna',
        'Inchiri': 'Inchiri',
        'Nouakchott': 'Nouakchott',
        'TirisZemmour': 'TirisZemmour',
        
        # Mismatched names that need mapping
        'Hodh El Gharbi': 'HodhelGharbi',
        'Hodh El Chargui': 'HodhechChargui', 
        'Dakhlet Nouadhibou': 'DakhletNouadhibou',
        'Gorgol': 'Gorgol',
        'Grogol': 'Gorgol',  # Fix the typo
        'Guidimakha': 'Guidimaka',  # Another potential mismatch
    }
    
    wilayas = Wilaya.objects.all()
    

    
    all_sites = WetlandSite.objects.exclude(geometry__isnull=True)

    for site_region, wilaya_name in REGION_TO_WILAYA_MAPPING.items():
        site_count = WetlandSite.objects.filter(region=site_region, geometry__isnull=False).count()
        if site_count > 0:
            print('1')
    

    features = []
    
    for wilaya in wilayas:
        # Find all region names that map to this wilaya
        matching_regions = [region for region, mapped_wilaya in REGION_TO_WILAYA_MAPPING.items() 
                          if mapped_wilaya == wilaya.name]
        
        # If no mapping found, try exact match
        if not matching_regions:
            matching_regions = [wilaya.name]
        
        # Count sites from all matching regions
        total_sites = 0
        site_details = []
        
        for region_name in matching_regions:
            sites_in_region = WetlandSite.objects.filter(
                region=region_name,
                geometry__isnull=False
            )
            region_count = sites_in_region.count()
            total_sites += region_count
            
            if region_count > 0:
                for site in sites_in_region:
                    site_details.append(f"  - {site.name} (ID: {site.id}, Région: '{site.region}')")
        


        
        # Determine color based on site count
        if total_sites >= 5:
            color = '#d32f2f'  # Red for 5+ sites
        elif total_sites >= 1:
            color = '#ff9800'  # Orange for 1-4 sites
        else:
            color = '#9e9e9e'  # Gray for 0 sites
        
        feature = {
            "type": "Feature",
            "properties": {
                "name": wilaya.name,
                "site_count": total_sites,
                "color": color,
                "fillOpacity": 0.6 if total_sites > 0 else 0.3,
                "mapped_regions": matching_regions  # Debug info
            },
            "geometry": json.loads(wilaya.geometry.geojson)
        }
        features.append(feature)
    

    
    return JsonResponse({
        "type": "FeatureCollection",
        "features": features
    })


# Alternative solution: Update the database to fix the mismatches
def fix_region_names_in_database():
    """
    Django management command or one-time script to fix region names
    Run this once to standardize the region names
    """
    
    # Mapping from current (incorrect) names to correct wilaya names
    corrections = {
        'Hodh El Gharbi': 'HodhelGharbi',
        'Hodh El Chargui': 'HodhechChargui',
        'Dakhlet Nouadhibou': 'DakhletNouadhibou', 
        'Grogol': 'Gorgol',  # Fix typo
        'Guidimakha': 'Guidimaka',
    }
    
    for old_name, new_name in corrections.items():
        updated_count = WetlandSite.objects.filter(region=old_name).update(region=new_name)
        if updated_count > 0:
            print(f"1")
    
   


# Third option: Normalize names for comparison
def normalize_name(name):
    """Normalize names for comparison by removing spaces and converting to lowercase"""
    if not name:
        return ""
    return name.replace(" ", "").replace("-", "").lower()

def wilayas_geojson_normalized(request):
    """Return wilayas as GeoJSON using normalized name comparison"""
    wilayas = Wilaya.objects.all()
    
    
    
    features = []
    for wilaya in wilayas:
        # Get normalized wilaya name
        normalized_wilaya = normalize_name(wilaya.name)
        
        # Find sites with regions that normalize to the same value
        matching_sites = []
        all_sites = WetlandSite.objects.exclude(geometry__isnull=True)
        
        for site in all_sites:
            if normalize_name(site.region) == normalized_wilaya:
                matching_sites.append(site)
        
        site_count = len(matching_sites)
        
  
        if matching_sites:
            print("Sites dans cette wilaya:")
            for site in matching_sites:
                print(f"1")
        
        # Determine color based on site count
        if site_count >= 5:
            color = '#d32f2f'
        elif site_count >= 1:
            color = '#ff9800'
        else:
            color = '#9e9e9e'
        
        feature = {
            "type": "Feature", 
            "properties": {
                "name": wilaya.name,
                "site_count": site_count,
                "color": color,
                "fillOpacity": 0.6 if site_count > 0 else 0.3
            },
            "geometry": json.loads(wilaya.geometry.geojson)
        }
        features.append(feature)
    
    
    return JsonResponse({
        "type": "FeatureCollection",
        "features": features
    })

def species_heatmap_data(request):
    """Return species distribution data for enhanced heatmap"""
    from .models import SiteSpeciesInventory
    
    # Get species distribution by site
    species_data = []
    sites_with_species = SiteSpeciesInventory.objects.select_related('site', 'species').filter(
        site__geometry__isnull=False
    )
    
    # Group by site to get species density
    site_species_count = {}
    for inventory in sites_with_species:
        site_id = inventory.site.id
        if site_id not in site_species_count:
            site_species_count[site_id] = {
                'site': inventory.site,
                'count': 0
            }
        site_species_count[site_id]['count'] += 1
    
    # Create heatmap data based on species density
    for site_data in site_species_count.values():
        site = site_data['site']
        species_count = site_data['count']
        
        if site.geometry:
            lat = site.geometry.y
            lng = site.geometry.x
            # Intensity based on number of species at the site
            intensity = min(species_count / 5.0, 2.0)  # Normalize to max 2.0
            
            species_data.append({
                'lat': lat,
                'lng': lng,
                'intensity': intensity,
                'species_count': species_count,
                'site_name': site.name
            })
    
    return JsonResponse({'species_data': species_data})



def wetlands_heatmap_data(request):
    """Return wetlands distribution data for enhanced heatmap"""
    sites = WetlandSite.objects.exclude(geometry__isnull=True)
    
    wetlands_data = []
    for site in sites:
        lat = site.geometry.y
        lng = site.geometry.x
        
        # Calculate intensity based on multiple factors
        intensity = 1.0
        
        # Higher intensity for Ramsar sites
        if site.is_ramsar_site:
            intensity += 1.0
            
        # Higher intensity for larger sites
        if site.area_hectares:
            if site.area_hectares > 10000:  # Large sites
                intensity += 0.8
            elif site.area_hectares > 1000:  # Medium sites
                intensity += 0.4
        
        # Higher intensity for sites with more species
        species_count = site.species_inventory.count()
        if species_count > 10:
            intensity += 0.6
        elif species_count > 5:
            intensity += 0.3
        
        wetlands_data.append({
            'lat': lat,
            'lng': lng,
            'intensity': intensity,
            'site_name': site.name,
            'is_ramsar': site.is_ramsar_site,
            'area_hectares': site.area_hectares,
            'species_count': species_count
        })
    
    return JsonResponse({'wetlands_data': wetlands_data})


def species_by_type_data(request):
    """Return species data grouped by taxonomic type"""
    from .models import SiteSpeciesInventory, TaxonomicGroup
    
    species_by_type = {}
    
    # Get all taxonomic groups
    groups = TaxonomicGroup.objects.all()
    
    for group in groups:
        species_data = []
        inventories = SiteSpeciesInventory.objects.filter(
            species__taxonomic_group=group,
            site__geometry__isnull=False
        ).select_related('site', 'species')
        
        for inventory in inventories:
            if inventory.site.geometry:
                species_data.append({
                    'lat': inventory.site.geometry.y,
                    'lng': inventory.site.geometry.x,
                    'species_name': inventory.species.scientific_name or inventory.species.common_name_fr,
                    'site_name': inventory.site.name,
                    'site_id': inventory.site.id
                })
        
        if species_data:
            species_by_type[group.name] = {
                'data': species_data,
                'color': get_group_color(group.name),
                'icon': get_taxonomic_group_icon(group.name)
            }
    
    return JsonResponse({'species_by_type': species_by_type})



def threats_data(request):
    """Return threats/dangers data"""
    from .models import SiteThreat
    
    threats_data = []
    site_threats = SiteThreat.objects.select_related('site', 'threat').filter(
        site__geometry__isnull=False
    )
    
    for site_threat in site_threats:
        if site_threat.site.geometry:
            # Determine threat level color
            intensity = site_threat.intensity or 'moyen'
            if 'élevé' in intensity.lower() or 'high' in intensity.lower():
                color = '#d32f2f'  # Red
                risk_level = 'Élevé'
            elif 'moyen' in intensity.lower() or 'medium' in intensity.lower():
                color = '#ff9800'  # Orange
                risk_level = 'Moyen'
            else:
                color = '#ffc107'  # Yellow
                risk_level = 'Faible'
            
            threats_data.append({
                'lat': site_threat.site.geometry.y,
                'lng': site_threat.site.geometry.x,
                'threat_name': site_threat.threat.name,
                'threat_type': site_threat.threat.threat_type.name if site_threat.threat.threat_type else 'Non spécifié',
                'intensity': intensity,
                'risk_level': risk_level,
                'color': color,
                'site_name': site_threat.site.name,
                'site_id': site_threat.site.id,
                'notes': site_threat.notes or ''
            })
    
    return JsonResponse({'threats_data': threats_data})


def get_group_color(group_name):
    """Return color for taxonomic group"""
    colors = {
        'Bird': '#2196f3',      # Blue
        'Fish': '#00bcd4',      # Cyan
        'Mammal': '#ff9800',    # Orange
        'Plant': '#4caf50',     # Green
        'Reptile': '#9c27b0',   # Purple
        'Insect': '#ffeb3b',    # Yellow
        'Other Invertebrate': '#795548'  # Brown
    }
    return colors.get(group_name, '#607d8b')  # Default blue-gray



def search_data(request):
    """Return search data for sites, wilayas, and species"""
    query = request.GET.get('q', '').lower()
    
    if len(query) < 2:
        return JsonResponse({'results': []})
    
    results = []
    
    # Search sites
    sites = WetlandSite.objects.filter(
        name__icontains=query
    ).exclude(geometry__isnull=True)[:5]
    
    for site in sites:
        results.append({
            'type': 'site',
            'id': site.id,
            'name': site.name,
            'description': f"Site - {site.region or 'N/A'}",
            'lat': site.geometry.y,
            'lng': site.geometry.x,
            'icon': 'fas fa-tint',
            'url': f'/wetland-sites/{site.id}/'
        })
    
    # Search wilayas
    wilayas = Wilaya.objects.filter(name__icontains=query)[:3]
    
    for wilaya in wilayas:
        # Get centroid of wilaya
        centroid = wilaya.geometry.centroid
        results.append({
            'type': 'wilaya',
            'id': wilaya.id,
            'name': wilaya.name,
            'description': 'Wilaya',
            'lat': centroid.y,
            'lng': centroid.x,
            'icon': 'fas fa-map',
            'url': None
        })
    
    # Search species
    species = Species.objects.filter(
        Q(scientific_name__icontains=query) |
        Q(common_name_fr__icontains=query) |
        Q(common_name_local__icontains=query)
    )[:5]
    
    for sp in species:
        # Get first site where this species is found
        site_inventory = SiteSpeciesInventory.objects.filter(
            species=sp,
            site__geometry__isnull=False
        ).first()
        
        if site_inventory:
            results.append({
                'type': 'species',
                'id': sp.id,
                'name': sp.scientific_name or sp.common_name_fr or sp.common_name_local,
                'description': f"Espèce - {sp.taxonomic_group.name if sp.taxonomic_group else 'Non classé'}",
                'lat': site_inventory.site.geometry.y,
                'lng': site_inventory.site.geometry.x,
                'icon': get_taxonomic_group_icon(sp.taxonomic_group.name if sp.taxonomic_group else 'Other'),
                'url': f'/species/{sp.id}/'
            })
    
    return JsonResponse({'results': results[:10]})


# Nouvelles vues Django pour le Tableau de Bord Hybride
# À ajouter au fichier views.py existant

from django.db.models import Count, Avg, Sum, Q, F
from django.db.models.functions import TruncMonth, TruncYear, TruncDate
from django.utils import timezone
from datetime import datetime, timedelta
import json
from collections import defaultdict
from .models import *

# ============================================================================
# APIs POUR LES GRAPHIQUES FIXES (SECTION STATIQUE)
# ============================================================================

@login_required
def dashboard_species_evolution(request):
    """Évolution du nombre d'espèces observées dans le temps"""
    
    # Paramètres de période
    period = request.GET.get('period', 'monthly')  # monthly, yearly
    
    if period == 'yearly':
        # Grouper par année
        observations = Observation.objects.annotate(
            period=TruncYear('observation_date')
        ).values('period').annotate(
            species_count=Count('species', distinct=True),
            observation_count=Count('id')
        ).order_by('period')
    else:
        # Grouper par mois (12 derniers mois)
        start_date = timezone.now().date() - timedelta(days=365)
        observations = Observation.objects.filter(
            observation_date__gte=start_date
        ).annotate(
            period=TruncMonth('observation_date')
        ).values('period').annotate(
            species_count=Count('species', distinct=True),
            observation_count=Count('id')
        ).order_by('period')
    
    # Formater les données pour Chart.js
    labels = []
    species_data = []
    observations_data = []
    
    for item in observations:
        if period == 'yearly':
            labels.append(item['period'].year)
        else:
            labels.append(item['period'].strftime('%Y-%m'))
        species_data.append(item['species_count'])
        observations_data.append(item['observation_count'])
    
    return JsonResponse({
        'labels': labels,
        'datasets': [
            {
                'label': 'Espèces Observées',
                'data': species_data,
                'borderColor': 'rgb(75, 192, 192)',
                'backgroundColor': 'rgba(75, 192, 192, 0.2)',
                'tension': 0.4
            },
            {
                'label': 'Nombre d\'Observations',
                'data': observations_data,
                'borderColor': 'rgb(255, 99, 132)',
                'backgroundColor': 'rgba(255, 99, 132, 0.2)',
                'tension': 0.4,
                'yAxisID': 'y1'
            }
        ]
    })

@login_required
def dashboard_sites_by_region(request):
    """Distribution des sites par wilaya"""
    
    sites_by_region = WetlandSite.objects.values('region').annotate(
        total_sites=Count('id'),
        ramsar_sites=Count('id', filter=Q(is_ramsar_site=True)),
        total_area=Sum('area_hectares')
    ).exclude(region__isnull=True).order_by('-total_sites')
    
    labels = []
    total_data = []
    ramsar_data = []
    colors = []
    
    # Palette de couleurs
    color_palette = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ]
    
    for i, item in enumerate(sites_by_region):
        labels.append(item['region'])
        total_data.append(item['total_sites'])
        ramsar_data.append(item['ramsar_sites'])
        colors.append(color_palette[i % len(color_palette)])
    
    return JsonResponse({
        'labels': labels,
        'datasets': [
            {
                'label': 'Total des Sites',
                'data': total_data,
                'backgroundColor': colors,
                'borderColor': colors,
                'borderWidth': 1
            },
            {
                'label': 'Sites Ramsar',
                'data': ramsar_data,
                'backgroundColor': 'rgba(255, 206, 86, 0.8)',
                'borderColor': 'rgba(255, 206, 86, 1)',
                'borderWidth': 1
            }
        ]
    })

@login_required
def dashboard_species_by_group(request):
    """Répartition des espèces par groupe taxonomique"""
    
    species_by_group = TaxonomicGroup.objects.annotate(
        species_count=Count('species'),
        observation_count=Count('species__observation')
    ).filter(species_count__gt=0).order_by('-species_count')
    
    labels = []
    data = []
    colors = []
    
    # Couleurs spécifiques par groupe
    group_colors = {
        'Bird': '#FF6384',
        'Fish': '#36A2EB', 
        'Mammal': '#FFCE56',
        'Plant': '#4BC0C0',
        'Reptile': '#9966FF',
        'Insect': '#FF9F40',
        'Other Invertebrate': '#C9CBCF'
    }
    
    for group in species_by_group:
        labels.append(group.name)
        data.append(group.species_count)
        colors.append(group_colors.get(group.name, '#95A5A6'))
    
    return JsonResponse({
        'labels': labels,
        'datasets': [{
            'data': data,
            'backgroundColor': colors,
            'borderColor': colors,
            'borderWidth': 2
        }]
    })

@login_required
def dashboard_threats_trends(request):
    """Tendances des menaces environnementales"""
    
    # Compter les menaces par type
    threats_by_type = ThreatType.objects.annotate(
        threat_count=Count('threat__sitethreat'),
        high_intensity=Count('threat__sitethreat', filter=Q(threat__sitethreat__intensity='High')),
        medium_intensity=Count('threat__sitethreat', filter=Q(threat__sitethreat__intensity='Medium')),
        low_intensity=Count('threat__sitethreat', filter=Q(threat__sitethreat__intensity='Low'))
    ).filter(threat_count__gt=0).order_by('-threat_count')
    
    labels = []
    total_data = []
    high_data = []
    medium_data = []
    low_data = []
    
    for threat_type in threats_by_type:
        labels.append(threat_type.name)
        total_data.append(threat_type.threat_count)
        high_data.append(threat_type.high_intensity)
        medium_data.append(threat_type.medium_intensity)
        low_data.append(threat_type.low_intensity)
    
    return JsonResponse({
        'labels': labels,
        'datasets': [
            {
                'label': 'Intensité Élevée',
                'data': high_data,
                'backgroundColor': 'rgba(255, 99, 132, 0.8)',
                'borderColor': 'rgba(255, 99, 132, 1)',
                'borderWidth': 1
            },
            {
                'label': 'Intensité Moyenne',
                'data': medium_data,
                'backgroundColor': 'rgba(255, 206, 86, 0.8)',
                'borderColor': 'rgba(255, 206, 86, 1)',
                'borderWidth': 1
            },
            {
                'label': 'Intensité Faible',
                'data': low_data,
                'backgroundColor': 'rgba(75, 192, 192, 0.8)',
                'borderColor': 'rgba(75, 192, 192, 1)',
                'borderWidth': 1
            }
        ]
    })

@login_required
def dashboard_conservation_status(request):
    """État de conservation par wilaya"""
    
    # Calculer un score de conservation basé sur plusieurs facteurs
    conservation_data = []
    
    for wilaya in Wilaya.objects.all():
        # Sites dans cette wilaya
        sites_in_wilaya = WetlandSite.objects.filter(region=wilaya.name)
        
        if sites_in_wilaya.exists():
            total_sites = sites_in_wilaya.count()
            ramsar_sites = sites_in_wilaya.filter(is_ramsar_site=True).count()
            
            # Calculer les menaces
            total_threats = SiteThreat.objects.filter(site__in=sites_in_wilaya).count()
            high_threats = SiteThreat.objects.filter(
                site__in=sites_in_wilaya, 
                intensity='High'
            ).count()
            
            # Calculer les mesures de conservation
            conservation_measures = SiteConservationMeasure.objects.filter(
                site__in=sites_in_wilaya
            ).count()
            
            # Score de conservation (0-100)
            ramsar_score = (ramsar_sites / total_sites) * 30 if total_sites > 0 else 0
            threat_score = max(0, 30 - (high_threats * 5))
            conservation_score = min(40, conservation_measures * 2)
            
            total_score = ramsar_score + threat_score + conservation_score
            
            # Déterminer le statut
            if total_score >= 70:
                status = 'Excellent'
                color = '#28a745'
            elif total_score >= 50:
                status = 'Bon'
                color = '#ffc107'
            elif total_score >= 30:
                status = 'Préoccupant'
                color = '#fd7e14'
            else:
                status = 'Critique'
                color = '#dc3545'
            
            conservation_data.append({
                'wilaya': wilaya.name,
                'score': round(total_score, 1),
                'status': status,
                'color': color,
                'sites_count': total_sites,
                'ramsar_count': ramsar_sites,
                'threats_count': total_threats
            })
    
    # Trier par score décroissant
    conservation_data.sort(key=lambda x: x['score'], reverse=True)
    
    labels = [item['wilaya'] for item in conservation_data]
    scores = [item['score'] for item in conservation_data]
    colors = [item['color'] for item in conservation_data]
    
    return JsonResponse({
        'labels': labels,
        'datasets': [{
            'label': 'Score de Conservation',
            'data': scores,
            'backgroundColor': colors,
            'borderColor': colors,
            'borderWidth': 1
        }],
        'details': conservation_data
    })

@login_required
def dashboard_summary_stats(request):
    """Statistiques de résumé pour le tableau de bord"""
    
    # Statistiques de base
    total_sites = WetlandSite.objects.count()
    ramsar_sites = WetlandSite.objects.filter(is_ramsar_site=True).count()
    total_species = Species.objects.count()
    total_observations = Observation.objects.count()
    total_threats = SiteThreat.objects.count()
    high_threats = SiteThreat.objects.filter(intensity='High').count()
    
    # Évolution récente (30 derniers jours)
    thirty_days_ago = timezone.now().date() - timedelta(days=30)
    recent_observations = Observation.objects.filter(
        observation_date__gte=thirty_days_ago
    ).count()
    
    # Calcul des tendances (comparaison avec la période précédente)
    sixty_days_ago = timezone.now().date() - timedelta(days=60)
    previous_observations = Observation.objects.filter(
        observation_date__gte=sixty_days_ago,
        observation_date__lt=thirty_days_ago
    ).count()
    
    observation_trend = 0
    if previous_observations > 0:
        observation_trend = ((recent_observations - previous_observations) / previous_observations) * 100
    
    return JsonResponse({
        'total_sites': total_sites,
        'ramsar_sites': ramsar_sites,
        'total_species': total_species,
        'total_observations': total_observations,
        'recent_observations': recent_observations,
        'observation_trend': round(observation_trend, 1),
        'total_threats': total_threats,
        'high_threats': high_threats,
        'threat_percentage': round((high_threats / total_threats * 100), 1) if total_threats > 0 else 0,
        'coverage_wilayas': WetlandSite.objects.values('region').distinct().count()
    })

# ============================================================================
# APIs POUR L'EXPLORATION DYNAMIQUE (SECTION INTERACTIVE)
# ============================================================================

@login_required
def dynamic_data_sources(request):
    """Liste des sources de données disponibles pour l'exploration"""
    
    data_sources = [
        {
            'id': 'wetland_sites',
            'name': 'Sites de Zones Humides',
            'description': 'Informations sur les sites de zones humides',
            'icon': 'fas fa-water',
            'record_count': WetlandSite.objects.count()
        },
        {
            'id': 'species',
            'name': 'Espèces',
            'description': 'Données sur les espèces observées',
            'icon': 'fas fa-dove',
            'record_count': Species.objects.count()
        },
        {
            'id': 'observations',
            'name': 'Observations',
            'description': 'Observations d\'espèces sur le terrain',
            'icon': 'fas fa-binoculars',
            'record_count': Observation.objects.count()
        },
        {
            'id': 'threats',
            'name': 'Menaces',
            'description': 'Menaces environnementales identifiées',
            'icon': 'fas fa-exclamation-triangle',
            'record_count': SiteThreat.objects.count()
        },
        {
            'id': 'conservation_measures',
            'name': 'Mesures de Conservation',
            'description': 'Mesures de protection mises en place',
            'icon': 'fas fa-shield-alt',
            'record_count': SiteConservationMeasure.objects.count()
        },
        {
            'id': 'taxonomic_groups',
            'name': 'Groupes Taxonomiques',
            'description': 'Classification des espèces',
            'icon': 'fas fa-sitemap',
            'record_count': TaxonomicGroup.objects.count()
        }
    ]
    
    return JsonResponse({'data_sources': data_sources})

@login_required
def dynamic_fields(request, source):
    """Champs disponibles pour une source de données"""
    
    fields_mapping = {
        'wetland_sites': [
            {'id': 'name', 'name': 'Nom du Site', 'type': 'text'},
            {'id': 'region', 'name': 'Wilaya', 'type': 'categorical'},
            {'id': 'commune', 'name': 'Commune', 'type': 'categorical'},
            {'id': 'area_hectares', 'name': 'Superficie (ha)', 'type': 'numeric'},
            {'id': 'is_ramsar_site', 'name': 'Site Ramsar', 'type': 'boolean'},
            {'id': 'designation_date', 'name': 'Date de Désignation', 'type': 'date'},
            {'id': 'species_count', 'name': 'Nombre d\'Espèces', 'type': 'numeric'},
            {'id': 'threats_count', 'name': 'Nombre de Menaces', 'type': 'numeric'}
        ],
        'species': [
            {'id': 'scientific_name', 'name': 'Nom Scientifique', 'type': 'text'},
            {'id': 'common_name_fr', 'name': 'Nom Commun (FR)', 'type': 'text'},
            {'id': 'taxonomic_group', 'name': 'Groupe Taxonomique', 'type': 'categorical'},
            {'id': 'iucn_status', 'name': 'Statut UICN', 'type': 'categorical'},
            {'id': 'national_status', 'name': 'Statut National', 'type': 'categorical'},
            {'id': 'observations_count', 'name': 'Nombre d\'Observations', 'type': 'numeric'},
            {'id': 'sites_count', 'name': 'Nombre de Sites', 'type': 'numeric'}
        ],
        'observations': [
            {'id': 'observation_date', 'name': 'Date d\'Observation', 'type': 'date'},
            {'id': 'species__scientific_name', 'name': 'Espèce', 'type': 'categorical'},
            {'id': 'wetland_site__name', 'name': 'Site', 'type': 'categorical'},
            {'id': 'wetland_site__region', 'name': 'Wilaya', 'type': 'categorical'},
            {'id': 'count', 'name': 'Nombre d\'Individus', 'type': 'numeric'},
            {'id': 'observer_name', 'name': 'Observateur', 'type': 'text'},
            {'id': 'observation_method__name', 'name': 'Méthode', 'type': 'categorical'}
        ],
        'threats': [
            {'id': 'threat__name', 'name': 'Type de Menace', 'type': 'categorical'},
            {'id': 'threat__threat_type__name', 'name': 'Catégorie de Menace', 'type': 'categorical'},
            {'id': 'site__name', 'name': 'Site Affecté', 'type': 'categorical'},
            {'id': 'site__region', 'name': 'Wilaya', 'type': 'categorical'},
            {'id': 'intensity', 'name': 'Intensité', 'type': 'categorical'}
        ],
        'conservation_measures': [
            {'id': 'measure__name', 'name': 'Mesure', 'type': 'categorical'},
            {'id': 'measure__measure_type__name', 'name': 'Type de Mesure', 'type': 'categorical'},
            {'id': 'site__name', 'name': 'Site', 'type': 'categorical'},
            {'id': 'site__region', 'name': 'Wilaya', 'type': 'categorical'},
            {'id': 'status', 'name': 'Statut', 'type': 'categorical'}
        ],
        'taxonomic_groups': [
            {'id': 'name', 'name': 'Nom du Groupe', 'type': 'categorical'},
            {'id': 'species_count', 'name': 'Nombre d\'Espèces', 'type': 'numeric'}
        ]
    }
    
    fields = fields_mapping.get(source, [])
    return JsonResponse({'fields': fields})

@login_required
def dynamic_query(request):
    """Exécution de requêtes dynamiques personnalisées"""
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode POST requise'}, status=405)
    
    try:
        data = json.loads(request.body)
        source = data.get('source')
        x_field = data.get('x_field')
        y_field = data.get('y_field')
        chart_type = data.get('chart_type', 'bar')
        filters = data.get('filters', {})
        group_by = data.get('group_by')
        
        # Sélectionner le modèle approprié
        model_mapping = {
            'wetland_sites': WetlandSite,
            'species': Species,
            'observations': Observation,
            'threats': SiteThreat,
            'conservation_measures': SiteConservationMeasure,
            'taxonomic_groups': TaxonomicGroup
        }
        
        model = model_mapping.get(source)
        if not model:
            return JsonResponse({'error': 'Source de données invalide'}, status=400)
        
        # Construire la requête
        queryset = model.objects.all()
        
        # Appliquer les filtres
        for field, value in filters.items():
            if value:
                if isinstance(value, list):
                    queryset = queryset.filter(**{f"{field}__in": value})
                else:
                    queryset = queryset.filter(**{field: value})
        
        # Exécuter l'agrégation selon le type de graphique
        if chart_type in ['bar', 'line', 'pie']:
            if y_field.endswith('_count'):
                # Compter les enregistrements
                result = queryset.values(x_field).annotate(
                    count=Count('id')
                ).order_by('-count')
                
                labels = [item[x_field] for item in result]
                data = [item['count'] for item in result]
            else:
                # Agréger une valeur numérique
                result = queryset.values(x_field).annotate(
                    total=Sum(y_field)
                ).order_by('-total')
                
                labels = [item[x_field] for item in result]
                data = [item['total'] or 0 for item in result]
        
        elif chart_type == 'table':
            # Retourner les données tabulaires
            fields_to_select = [x_field]
            if y_field and y_field != x_field:
                fields_to_select.append(y_field)
            if group_by and group_by not in fields_to_select:
                fields_to_select.append(group_by)
            
            result = list(queryset.values(*fields_to_select)[:100])  # Limiter à 100 résultats
            
            return JsonResponse({
                'chart_type': 'table',
                'data': result,
                'columns': fields_to_select
            })
        
        return JsonResponse({
            'chart_type': chart_type,
            'labels': labels,
            'data': data,
            'total_records': len(labels)
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def dynamic_aggregate(request):
    """Agrégation avancée de données croisées"""
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode POST requise'}, status=405)
    
    try:
        data = json.loads(request.body)
        sources = data.get('sources', [])  # Plusieurs sources
        aggregation_type = data.get('aggregation', 'count')  # count, sum, avg
        group_by_fields = data.get('group_by', [])
        
        # Cette fonction permettrait de croiser plusieurs sources de données
        # Implémentation simplifiée pour l'exemple
        
        result_data = {
            'message': 'Agrégation croisée en cours de développement',
            'sources': sources,
            'aggregation': aggregation_type
        }
        
        return JsonResponse(result_data)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def dynamic_export(request):
    """Export des données générées"""
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Méthode POST requise'}, status=405)
    
    try:
        data = json.loads(request.body)
        export_format = data.get('format', 'csv')  # csv, json, excel
        chart_data = data.get('chart_data', {})
        
        # Ici on pourrait implémenter l'export en différents formats
        # Pour l'instant, retourner les données JSON
        
        return JsonResponse({
            'export_format': export_format,
            'data': chart_data,
            'download_url': '/api/dynamic/download/temp_file.csv'  # URL temporaire
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

