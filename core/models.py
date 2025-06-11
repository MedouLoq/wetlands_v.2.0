from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils import timezone
from django.db.models import Q

# 1. Role Model
class Role(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50, unique=True, null=False)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "roles"
        verbose_name = "Role"
        verbose_name_plural = "Roles"

    def __str__(self):
        return self.name

# 2. Custom User Model (Note: We'll use Django's built-in User model for authentication)
# This model extends the functionality for domain-specific needs
class CustomUser(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=150, unique=True, null=False)
    email = models.EmailField(max_length=254, unique=True, null=False)
    first_name = models.CharField(max_length=150, null=True, blank=True)
    last_name = models.CharField(max_length=150, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, null=False)
    is_active = models.BooleanField(default=True, null=False)
    last_login = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(default=timezone.now, null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "custom_users"
        verbose_name = "Custom User"
        verbose_name_plural = "Custom Users"

    def __str__(self):
        return self.username

# 3. DataSource Model
class DataSource(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, null=False)
    source_type = models.CharField(max_length=100, null=True, blank=True)
    organization = models.CharField(max_length=255, null=True, blank=True)
    contact_person = models.CharField(max_length=255, null=True, blank=True)
    citation = models.TextField(null=True, blank=True)
    url = models.URLField(max_length=2000, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "data_sources"
        verbose_name = "Data Source"
        verbose_name_plural = "Data Sources"

    def __str__(self):
        return self.name

# 4. TaxonomicGroup Model
class TaxonomicGroup(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True, null=False)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "taxonomic_groups"
        verbose_name = "Taxonomic Group"
        verbose_name_plural = "Taxonomic Groups"
        ordering = ["name"]

    def __str__(self):
        return self.name

# 5. Species Model
class Species(models.Model):
    id = models.AutoField(primary_key=True)
    scientific_name = models.CharField(max_length=255, unique=True, null=True, blank=True)
    common_name_fr = models.CharField(max_length=255, null=True, blank=True)
    common_name_local = models.CharField(max_length=255, null=True, blank=True)
    taxonomic_group = models.ForeignKey(TaxonomicGroup, on_delete=models.SET_NULL, null=True, blank=True)
    iucn_status = models.CharField(max_length=50, null=True, blank=True)
    national_status = models.CharField(max_length=50, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "species"
        verbose_name = "Species"
        verbose_name_plural = "Species"
        ordering = ["scientific_name", "common_name_fr"]
        constraints = [
            models.CheckConstraint(
                check=Q(scientific_name__isnull=False) | Q(common_name_fr__isnull=False) | Q(common_name_local__isnull=False),
                name="chk_species_name"
            )
        ]

    def __str__(self):
        if self.scientific_name:
            return self.scientific_name
        elif self.common_name_fr:
            return self.common_name_fr
        elif self.common_name_local:
            return self.common_name_local
        else:
            return f"Species ID: {self.id}"

# New Image Model
class SpeciesImage(models.Model):
    species = models.ForeignKey(Species, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='species_images/')
    caption = models.CharField(max_length=255, blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "species_images"
        verbose_name = "Species Image"
        verbose_name_plural = "Species Images"

    def __str__(self):
        return f"Image for {self.species.scientific_name or self.species.common_name_fr}"

# 6. WetlandType Model
class WetlandType(models.Model):
    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=10, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255, null=False)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "wetland_types"
        verbose_name = "Wetland Type"
        verbose_name_plural = "Wetland Types"
        ordering = ["name"]

    def __str__(self):
        return self.name

# 7. WetlandSite Model
class WetlandSite(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, null=False)
    code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    region = models.CharField(max_length=100, null=True, blank=True, verbose_name="Wilaya")
    commune = models.CharField(max_length=100, null=True, blank=True)
    area_hectares = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    designation_date = models.DateField(null=True, blank=True)
    ramsar_criteria_met = models.TextField(null=True, blank=True)
    is_ramsar_site = models.BooleanField(default=False, verbose_name="Site Ramsar")
    description_ecological = models.TextField(null=True, blank=True)
    description_physical = models.TextField(null=True, blank=True)
    hydrology_summary = models.TextField(null=True, blank=True)
    climate_summary = models.TextField(null=True, blank=True)
    land_use_current = models.TextField(null=True, blank=True)
    land_use_adjacent = models.TextField(null=True, blank=True)
    social_cultural_values = models.TextField(null=True, blank=True)
    conservation_measures_taken = models.TextField(null=True, blank=True)
    conservation_measures_proposed = models.TextField(null=True, blank=True)
    threats_anthropogenic = models.TextField(null=True, blank=True)
    threats_natural = models.TextField(null=True, blank=True)
    contacts = models.TextField(null=True, blank=True)
    geometry = gis_models.PointField(srid=4326, null=True, blank=True)
    data_source = models.ForeignKey(DataSource, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ManyToMany relationships defined via through models
    species_inventory = models.ManyToManyField(Species, through="SiteSpeciesInventory", related_name="wetland_sites")
    wetland_types = models.ManyToManyField(WetlandType, through="SiteWetlandType", related_name="wetland_sites")
    threats = models.ManyToManyField("Threat", through="SiteThreat", related_name="wetland_sites")
    conservation_measures = models.ManyToManyField("ConservationMeasure", through="SiteConservationMeasure", related_name="wetland_sites")

    class Meta:
        db_table = "wetland_sites"
        verbose_name = "Wetland Site"
        verbose_name_plural = "Wetland Sites"
        ordering = ["-is_ramsar_site", "name"]  # Ramsar sites first, then alphabetical

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Automatically mark as Ramsar site if code starts with RAMSAR
        if self.code and self.code.startswith("RAMSAR"):
            self.is_ramsar_site = True
        super().save(*args, **kwargs)

# 8. SiteWetlandType (Through Model for WetlandSite <-> WetlandType)
class SiteWetlandType(models.Model):
    site = models.ForeignKey(WetlandSite, on_delete=models.CASCADE)
    wetland_type = models.ForeignKey(WetlandType, on_delete=models.CASCADE)
    percentage_cover = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "site_wetland_types"
        unique_together = (("site", "wetland_type"),)
        verbose_name = "Site Wetland Type"
        verbose_name_plural = "Site Wetland Types"

# 9. ObservationMethod Model
class ObservationMethod(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True, null=False)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "observation_methods"
        verbose_name = "Observation Method"
        verbose_name_plural = "Observation Methods"

    def __str__(self):
        return self.name

# 10. Observation Model
class Observation(models.Model):
    id = models.AutoField(primary_key=True)
    wetland_site = models.ForeignKey(WetlandSite, on_delete=models.CASCADE, null=True, blank=True)
    species = models.ForeignKey(Species, on_delete=models.CASCADE, null=False)
    observation_date = models.DateField(null=False)
    observation_time = models.TimeField(null=True, blank=True)
    observer_name = models.CharField(max_length=255, null=True, blank=True)
    user = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    observation_method = models.ForeignKey(ObservationMethod, on_delete=models.SET_NULL, null=True, blank=True)
    count = models.IntegerField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    location = gis_models.PointField(srid=4326, null=True, blank=True)
    data_source = models.ForeignKey(DataSource, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "observations"
        verbose_name = "Observation"
        verbose_name_plural = "Observations"
        ordering = ["-observation_date", "-observation_time"]

# 11. SiteSpeciesInventory (Through Model for WetlandSite <-> Species)
class SiteSpeciesInventory(models.Model):
    site = models.ForeignKey(WetlandSite, on_delete=models.CASCADE)
    species = models.ForeignKey(Species, on_delete=models.CASCADE)
    notes = models.TextField(null=True, blank=True)
    data_source = models.ForeignKey(DataSource, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "site_species_inventory"
        unique_together = (("site", "species"),)
        verbose_name = "Site Species Inventory"
        verbose_name_plural = "Site Species Inventories"

# 12. ThreatType Model
class ThreatType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True, null=False)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "threat_types"
        verbose_name = "Threat Type"
        verbose_name_plural = "Threat Types"

    def __str__(self):
        return self.name

# 13. Threat Model
class Threat(models.Model):
    id = models.AutoField(primary_key=True)
    threat_type = models.ForeignKey(ThreatType, on_delete=models.CASCADE, null=False)
    name = models.CharField(max_length=255, unique=True, null=False)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "threats"
        verbose_name = "Threat"
        verbose_name_plural = "Threats"
        ordering = ["threat_type", "name"]

    def __str__(self):
        return self.name

# 14. SiteThreat (Through Model for WetlandSite <-> Threat)
class SiteThreat(models.Model):
    site = models.ForeignKey(WetlandSite, on_delete=models.CASCADE)
    threat = models.ForeignKey(Threat, on_delete=models.CASCADE)
    intensity = models.CharField(max_length=50, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    data_source = models.ForeignKey(DataSource, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "site_threats"
        unique_together = (("site", "threat"),)
        verbose_name = "Site Threat"
        verbose_name_plural = "Site Threats"

# 15. MeasureType Model
class MeasureType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True, null=False)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "measure_types"
        verbose_name = "Measure Type"
        verbose_name_plural = "Measure Types"

    def __str__(self):
        return self.name

# 16. ConservationMeasure Model
class ConservationMeasure(models.Model):
    id = models.AutoField(primary_key=True)
    measure_type = models.ForeignKey(MeasureType, on_delete=models.CASCADE, null=False)
    name = models.CharField(max_length=255, unique=True, null=False)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "conservation_measures"
        verbose_name = "Conservation Measure"
        verbose_name_plural = "Conservation Measures"
        ordering = ["measure_type", "name"]

    def __str__(self):
        return self.name

# 17. SiteConservationMeasure (Through Model for WetlandSite <-> ConservationMeasure)
class SiteConservationMeasure(models.Model):
    site = models.ForeignKey(WetlandSite, on_delete=models.CASCADE)
    measure = models.ForeignKey(ConservationMeasure, on_delete=models.CASCADE)
    status = models.CharField(max_length=50, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    data_source = models.ForeignKey(DataSource, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "site_conservation_measures"
        unique_together = (("site", "measure"),)
        verbose_name = "Site Conservation Measure"
        verbose_name_plural = "Site Conservation Measures"


# 18. Wilaya Model
class Wilaya(gis_models.Model):
    name = models.CharField(max_length=255, unique=True)
    geometry = gis_models.MultiPolygonField(srid=4326)

    class Meta:
        verbose_name = "Wilaya"
        verbose_name_plural = "Wilayas"

    def __str__(self):
        return self.name


