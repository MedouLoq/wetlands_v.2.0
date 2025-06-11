"""
Core app views for the GeoWetlands Mauritania project
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.contrib.gis.serializers import geojson
from .models import WetlandSite, Species, TaxonomicGroup, Wilaya, SiteSpeciesInventory
from django.db.models import Count, Q
import json


@login_required
def home(request):
    """Home page view"""
    # Get featured wetland sites (limit to 3)
    featured_sites = WetlandSite.objects.all().order_by('?')[:3]
    
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
    
    # Base queryset
    species_queryset = Species.objects.all()
    
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
    species = get_object_or_404(Species, id=species_id)
    
    # Get sites where this species is found
    sites = species.wetland_sites.all()
    
    context = {
        'species': species,
        'sites': sites,
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

from django.http import JsonResponse
from django.contrib.gis.serializers import geojson
from .models import Wilaya
from django.db.models import Count



def wilayas_geojson(request):
    """Return wilayas as GeoJSON with site statistics"""
    wilayas = Wilaya.objects.annotate(
        site_count=Count('id', distinct=True)
    ).all()
    
    features = []
    for wilaya in wilayas:
        # Determine color based on site count
        if wilaya.site_count >= 5:
            color = '#d32f2f'  # Red for 5+ sites
        elif wilaya.site_count >= 1:
            color = '#ff9800'  # Orange for 1-4 sites
        else:
            color = '#9e9e9e'  # Gray for 0 sites
        
        feature = {
            "type": "Feature",
            "properties": {
                "name": wilaya.name,
                "site_count": wilaya.site_count,
                "color": color,
                "fillOpacity": 0.6 if wilaya.site_count > 0 else 0.3
            },
            "geometry": json.loads(wilaya.geometry.geojson)
        }
        features.append(feature)
    
    return JsonResponse({
        "type": "FeatureCollection",
        "features": features
    })



def species_heatmap_data(request):
    """Return species distribution data for heatmap"""
    from .models import SiteSpeciesInventory
    
    # Get species distribution by site
    species_data = []
    sites_with_species = SiteSpeciesInventory.objects.select_related('site', 'species').filter(
        site__geometry__isnull=False
    )
    
    for inventory in sites_with_species:
        if inventory.site.geometry:
            lat = inventory.site.geometry.y
            lng = inventory.site.geometry.x
            species_data.append({
                'lat': lat,
                'lng': lng,
                'intensity': 1,
                'species_name': inventory.species.scientific_name or inventory.species.common_name_fr,
                'site_name': inventory.site.name
            })
    
    return JsonResponse({'species_data': species_data})



def wetlands_heatmap_data(request):
    """Return wetlands distribution data for heatmap"""
    sites = WetlandSite.objects.exclude(geometry__isnull=True)
    
    wetlands_data = []
    for site in sites:
        lat = site.geometry.y
        lng = site.geometry.x
        # Higher intensity for Ramsar sites
        intensity = 2.0 if site.is_ramsar_site else 1.0
        
        wetlands_data.append({
            'lat': lat,
            'lng': lng,
            'intensity': intensity,
            'site_name': site.name,
            'is_ramsar': site.is_ramsar_site
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

