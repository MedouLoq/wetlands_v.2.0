# URLs Django pour le Tableau de Bord Hybride

from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('wetland-sites/', views.wetland_sites, name='wetland_sites'),
    path('wetland-sites/<int:site_id>/', views.wetland_site_detail, name='wetland_site_detail'),
    path('species/', views.species_list, name='species_list'),
    path('species/<int:species_id>/', views.species_detail, name='species_detail'),
    path('map/', views.map, name='map'),
    path('profile/', views.profile, name='profile'),
    
    # Authentication URLs
    path('login/', auth_views.LoginView.as_view(template_name='core/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='home'), name='logout'),
    
    # Existing API URLs
    path('api/wilayas/', views.wilayas_geojson, name='wilayas_geojson'),
    path('api/species-heatmap/', views.species_heatmap_data, name='species_heatmap_data'),
    path('api/wetlands-heatmap/', views.wetlands_heatmap_data, name='wetlands_heatmap_data'),
    path('api/species-by-type/', views.species_by_type_data, name='species_by_type_data'),
    path('api/threats/', views.threats_data, name='threats_data'),
    path('api/search/', views.search_data, name='search_data'),
    
    # === NOUVELLES APIs POUR LE TABLEAU DE BORD HYBRIDE ===
    
    # APIs pour les graphiques fixes (section statique)
    path('api/dashboard/species-evolution/', views.dashboard_species_evolution, name='dashboard_species_evolution'),
    path('api/dashboard/sites-by-region/', views.dashboard_sites_by_region, name='dashboard_sites_by_region'),
    path('api/dashboard/species-by-group/', views.dashboard_species_by_group, name='dashboard_species_by_group'),
    path('api/dashboard/threats-trends/', views.dashboard_threats_trends, name='dashboard_threats_trends'),
    path('api/dashboard/conservation-status/', views.dashboard_conservation_status, name='dashboard_conservation_status'),
    path('api/dashboard/summary-stats/', views.dashboard_summary_stats, name='dashboard_summary_stats'),
    
    # APIs pour l'exploration dynamique (section interactive)
    path('api/dynamic/data-sources/', views.dynamic_data_sources, name='dynamic_data_sources'),
    path('api/dynamic/fields/<str:source>/', views.dynamic_fields, name='dynamic_fields'),
    path('api/dynamic/query/', views.dynamic_query, name='dynamic_query'),
    path('api/dynamic/aggregate/', views.dynamic_aggregate, name='dynamic_aggregate'),
    path('api/dynamic/export/', views.dynamic_export, name='dynamic_export'),
]

