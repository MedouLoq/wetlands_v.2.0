from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import (
    Role, CustomUser, DataSource, TaxonomicGroup, Species, WetlandType,
    WetlandSite, SiteWetlandType, ObservationMethod, Observation,
    SiteSpeciesInventory, ThreatType, Threat, SiteThreat,
    MeasureType, ConservationMeasure, SiteConservationMeasure
)

# Register basic models with simple admin interfaces
@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_active')
    list_filter = ('is_active', 'role')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    fieldsets = (
        (None, {'fields': ('username', 'email')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('role', 'is_active')}),
    )

@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'source_type', 'organization', 'contact_person')
    list_filter = ('source_type',)
    search_fields = ('name', 'organization', 'contact_person')

@admin.register(TaxonomicGroup)
class TaxonomicGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = ('scientific_name', 'common_name_fr', 'common_name_local', 'taxonomic_group', 'iucn_status')
    list_filter = ('taxonomic_group', 'iucn_status')
    search_fields = ('scientific_name', 'common_name_fr', 'common_name_local')

@admin.register(WetlandType)
class WetlandTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'description')
    search_fields = ('code', 'name')

# Use OSMGeoAdmin for models with geometry fields
@admin.register(WetlandSite)
class WetlandSiteAdmin(GISModelAdmin):
    list_display = ('name', 'code', 'region', 'commune', 'area_hectares')
    list_filter = ('region',)
    search_fields = ('name', 'code', 'region', 'commune')
    fieldsets = (
        (None, {'fields': ('name', 'code')}),
        ('Location', {'fields': ('region', 'commune', 'geometry')}),
        ('Physical Characteristics', {'fields': ('area_hectares', 'description_physical', 'hydrology_summary', 'climate_summary')}),
        ('Ecological Information', {'fields': ('description_ecological',)}),
        ('Land Use', {'fields': ('land_use_current', 'land_use_adjacent')}),
        ('Conservation', {'fields': ('conservation_measures_taken', 'conservation_measures_proposed')}),
        ('Threats', {'fields': ('threats_anthropogenic', 'threats_natural')}),
        ('Additional Information', {'fields': ('social_cultural_values', 'contacts', 'data_source')}),
    )

@admin.register(SiteWetlandType)
class SiteWetlandTypeAdmin(admin.ModelAdmin):
    list_display = ('site', 'wetland_type', 'percentage_cover')
    list_filter = ('wetland_type',)
    search_fields = ('site__name', 'wetland_type__name')

@admin.register(ObservationMethod)
class ObservationMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Observation)
class ObservationAdmin(GISModelAdmin):
    list_display = ('species', 'wetland_site', 'observation_date', 'count', 'observer_name')
    list_filter = ('observation_date', 'observation_method', 'species__taxonomic_group')
    search_fields = ('species__scientific_name', 'species__common_name_fr', 'wetland_site__name', 'observer_name')
    date_hierarchy = 'observation_date'

@admin.register(SiteSpeciesInventory)
class SiteSpeciesInventoryAdmin(admin.ModelAdmin):
    list_display = ('site', 'species', 'data_source')
    list_filter = ('species__taxonomic_group',)
    search_fields = ('site__name', 'species__scientific_name', 'species__common_name_fr')

@admin.register(ThreatType)
class ThreatTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Threat)
class ThreatAdmin(admin.ModelAdmin):
    list_display = ('name', 'threat_type', 'description')
    list_filter = ('threat_type',)
    search_fields = ('name',)

@admin.register(SiteThreat)
class SiteThreatAdmin(admin.ModelAdmin):
    list_display = ('site', 'threat', 'intensity')
    list_filter = ('threat__threat_type', 'intensity')
    search_fields = ('site__name', 'threat__name')

@admin.register(MeasureType)
class MeasureTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(ConservationMeasure)
class ConservationMeasureAdmin(admin.ModelAdmin):
    list_display = ('name', 'measure_type', 'description')
    list_filter = ('measure_type',)
    search_fields = ('name',)

@admin.register(SiteConservationMeasure)
class SiteConservationMeasureAdmin(admin.ModelAdmin):
    list_display = ('site', 'measure', 'status')
    list_filter = ('measure__measure_type', 'status')
    search_fields = ('site__name', 'measure__name')

# Customize admin site
admin.site.site_header = "GeoWetlands Mauritania Administration"
admin.site.site_title = "GeoWetlands Mauritania Admin Portal"
admin.site.index_title = "Welcome to GeoWetlands Mauritania Management"
