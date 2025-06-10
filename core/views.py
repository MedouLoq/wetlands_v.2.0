"""
Core app views for the GeoWetlands Mauritania project
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from .models import WetlandSite, Species, TaxonomicGroup

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

def about(request):
    """About page view"""
    return render(request, 'core/about.html')

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
