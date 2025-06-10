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
]
