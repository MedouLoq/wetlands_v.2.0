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
    
    # API URLs
    path('api/wilayas/', views.wilayas_geojson, name='wilayas_geojson'),
    path('api/species-heatmap/', views.species_heatmap_data, name='species_heatmap_data'),
    path('api/wetlands-heatmap/', views.wetlands_heatmap_data, name='wetlands_heatmap_data'),
    path('api/species-by-type/', views.species_by_type_data, name='species_by_type_data'),
    path('api/threats/', views.threats_data, name='threats_data'),
    path('api/search/', views.search_data, name='search_data'),
]

