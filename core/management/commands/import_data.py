import csv
import os
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from django.core.management.base import BaseCommand, CommandError
from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime, parse_time

# Import your models (adjust the import path according to your app structure)
# Replace 'your_app_name' with your actual app name
try:
    from core.models import (
        Role, CustomUser, DataSource, TaxonomicGroup, Species, WetlandType, 
        WetlandSite, SiteWetlandType, ObservationMethod, Observation, 
        SiteSpeciesInventory, ThreatType, Threat, SiteThreat, MeasureType, 
        ConservationMeasure, SiteConservationMeasure
    )
except ImportError:
    # Try different import paths
    try:
        from django.apps import apps
        # Get all models from the app
        app_models = apps.get_models()
        for model in app_models:
            globals()[model.__name__] = model
    except Exception as e:
        print(f"Could not import models: {e}")
        print("Please update the import statement to match your app structure")


class Command(BaseCommand):
    help = 'Import data from CSV files into the wetland database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-dir',
            type=str,
            required=True,
            help='Directory containing CSV files'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes to database'
        )

    def handle(self, *args, **options):
        csv_dir = options['csv_dir']
        dry_run = options['dry_run']

        if not os.path.exists(csv_dir):
            raise CommandError(f'Directory {csv_dir} does not exist')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Import order matters due to foreign key dependencies
        import_sequence = [
            ('taxonomic_groups.csv', self.import_taxonomic_groups),
            ('species.csv', self.import_species),
            ('conservation_measures.csv', self.import_conservation_measures),
            ('threats.csv', self.import_threats),
            ('wetland_sites.csv', self.import_wetland_sites),
            ('site_species_inventory.csv', self.import_site_species_inventory),
            ('site_threats.csv', self.import_site_threats),
            ('site_conservation_measures.csv', self.import_site_conservation_measures),
        ]

        try:
            with transaction.atomic():
                for filename, import_func in import_sequence:
                    file_path = os.path.join(csv_dir, filename)
                    if os.path.exists(file_path):
                        self.stdout.write(f'Importing {filename}...')
                        count = import_func(file_path)
                        self.stdout.write(
                            self.style.SUCCESS(f'Successfully imported {count} records from {filename}')
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'File {filename} not found, skipping...')
                        )

                if dry_run:
                    raise transaction.TransactionManagementError("Dry run - rolling back")

        except transaction.TransactionManagementError:
            if dry_run:
                self.stdout.write(self.style.SUCCESS('Dry run completed successfully'))
            else:
                raise
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Import failed: {str(e)}'))
            raise

    def safe_get_or_none(self, model, **kwargs):
        """Safely get an object or return None if not found"""
        try:
            return model.objects.get(**kwargs)
        except model.DoesNotExist:
            return None
        except model.MultipleObjectsReturned:
            return model.objects.filter(**kwargs).first()

    def parse_decimal(self, value):
        """Safely parse decimal values"""
        if not value or value.strip() == '':
            return None
        try:
            return Decimal(str(value).replace(',', ''))
        except (InvalidOperation, ValueError):
            return None

    def parse_date_safe(self, date_str):
        """Safely parse date strings"""
        if not date_str or date_str.strip() == '':
            return None
        try:
            return parse_date(date_str)
        except (ValueError, TypeError):
            return None

    def parse_point(self, lat_str, lon_str):
        """Parse latitude and longitude into Point geometry"""
        if not lat_str or not lon_str:
            return None
        try:
            lat = float(lat_str)
            lon = float(lon_str)
            return Point(lon, lat, srid=4326)  # Note: Point takes (x, y) = (lon, lat)
        except (ValueError, TypeError):
            return None

    def import_taxonomic_groups(self, file_path):
        """Import taxonomic groups"""
        count = 0
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                obj, created = TaxonomicGroup.objects.get_or_create(
                    name=row.get('name', '').strip(),
                    defaults={
                        'description': row.get('description', '').strip() or None
                    }
                )
                if created:
                    count += 1
        return count

    def import_species(self, file_path):
        """Import species data"""
        count = 0
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Get taxonomic group if specified
                taxonomic_group = None
                if row.get('taxonomic_group'):
                    taxonomic_group = self.safe_get_or_none(
                        TaxonomicGroup, name=row['taxonomic_group'].strip()
                    )

                # Create or update species
                scientific_name = row.get('scientific_name', '').strip() or None
                common_name_fr = row.get('common_name_fr', '').strip() or None
                common_name_local = row.get('common_name_local', '').strip() or None

                # Try to find existing species by scientific name first, then common names
                species = None
                if scientific_name:
                    species = self.safe_get_or_none(Species, scientific_name=scientific_name)
                
                if not species and common_name_fr:
                    species = self.safe_get_or_none(Species, common_name_fr=common_name_fr)

                if species:
                    # Update existing species
                    species.scientific_name = scientific_name
                    species.common_name_fr = common_name_fr
                    species.common_name_local = common_name_local
                    species.taxonomic_group = taxonomic_group
                    species.iucn_status = row.get('iucn_status', '').strip() or None
                    species.national_status = row.get('national_status', '').strip() or None
                    species.description = row.get('description', '').strip() or None
                    species.notes = row.get('notes', '').strip() or None
                    species.save()
                else:
                    # Create new species
                    species = Species.objects.create(
                        scientific_name=scientific_name,
                        common_name_fr=common_name_fr,
                        common_name_local=common_name_local,
                        taxonomic_group=taxonomic_group,
                        iucn_status=row.get('iucn_status', '').strip() or None,
                        national_status=row.get('national_status', '').strip() or None,
                        description=row.get('description', '').strip() or None,
                        notes=row.get('notes', '').strip() or None
                    )
                    count += 1
        return count

    def import_conservation_measures(self, file_path):
        """Import conservation measures"""
        count = 0
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Get or create measure type
                measure_type_name = row.get('measure_type', '').strip()
                if not measure_type_name:
                    measure_type_name = 'General'
                
                measure_type, _ = MeasureType.objects.get_or_create(
                    name=measure_type_name
                )

                # Create conservation measure
                obj, created = ConservationMeasure.objects.get_or_create(
                    name=row.get('name', '').strip(),
                    defaults={
                        'measure_type': measure_type,
                        'description': row.get('description', '').strip() or None
                    }
                )
                if created:
                    count += 1
        return count

    def import_threats(self, file_path):
        """Import threats"""
        count = 0
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Get or create threat type
                threat_type_name = row.get('threat_type', '').strip()
                if not threat_type_name:
                    threat_type_name = 'General'
                
                threat_type, _ = ThreatType.objects.get_or_create(
                    name=threat_type_name
                )

                # Create threat
                obj, created = Threat.objects.get_or_create(
                    name=row.get('name', '').strip(),
                    defaults={
                        'threat_type': threat_type,
                        'description': row.get('description', '').strip() or None
                    }
                )
                if created:
                    count += 1
        return count

    def import_wetland_sites(self, file_path):
        """Import wetland sites"""
        count = 0
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Parse geometry if lat/lon provided
                geometry = self.parse_point(
                    row.get('latitude'), 
                    row.get('longitude')
                )

                # Get data source if specified
                data_source = None
                if row.get('data_source'):
                    data_source, _ = DataSource.objects.get_or_create(
                        name=row['data_source'].strip()
                    )

                # Create or update wetland site
                site, created = WetlandSite.objects.get_or_create(
                    name=row.get('name', '').strip(),
                    defaults={
                        'code': row.get('code', '').strip() or None,
                        'region': row.get('region', '').strip() or None,
                        'commune': row.get('commune', '').strip() or None,
                        'area_hectares': self.parse_decimal(row.get('area_hectares')),
                        'designation_date': self.parse_date_safe(row.get('designation_date')),
                        'ramsar_criteria_met': row.get('ramsar_criteria_met', '').strip() or None,
                        'description_ecological': row.get('description_ecological', '').strip() or None,
                        'description_physical': row.get('description_physical', '').strip() or None,
                        'hydrology_summary': row.get('hydrology_summary', '').strip() or None,
                        'climate_summary': row.get('climate_summary', '').strip() or None,
                        'land_use_current': row.get('land_use_current', '').strip() or None,
                        'land_use_adjacent': row.get('land_use_adjacent', '').strip() or None,
                        'social_cultural_values': row.get('social_cultural_values', '').strip() or None,
                        'conservation_measures_taken': row.get('conservation_measures_taken', '').strip() or None,
                        'conservation_measures_proposed': row.get('conservation_measures_proposed', '').strip() or None,
                        'threats_anthropogenic': row.get('threats_anthropogenic', '').strip() or None,
                        'threats_natural': row.get('threats_natural', '').strip() or None,
                        'contacts': row.get('contacts', '').strip() or None,
                        'geometry': geometry,
                        'data_source': data_source
                    }
                )
                if created:
                    count += 1
        return count

    def import_site_species_inventory(self, file_path):
        """Import site species inventory"""
        count = 0
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Get site and species
                site = self.safe_get_or_none(WetlandSite, name=row.get('site_name', '').strip())
                if not site and row.get('site_id'):
                    site = self.safe_get_or_none(WetlandSite, id=row['site_id'])

                species = None
                if row.get('species_scientific_name'):
                    species = self.safe_get_or_none(Species, scientific_name=row['species_scientific_name'].strip())
                elif row.get('species_common_name'):
                    species = self.safe_get_or_none(Species, common_name_fr=row['species_common_name'].strip())

                if site and species:
                    # Get data source if specified
                    data_source = None
                    if row.get('data_source'):
                        data_source, _ = DataSource.objects.get_or_create(
                            name=row['data_source'].strip()
                        )

                    obj, created = SiteSpeciesInventory.objects.get_or_create(
                        site=site,
                        species=species,
                        defaults={
                            'notes': row.get('notes', '').strip() or None,
                            'data_source': data_source
                        }
                    )
                    if created:
                        count += 1
        return count

    def import_site_threats(self, file_path):
        """Import site threats"""
        count = 0
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Get site and threat
                site = self.safe_get_or_none(WetlandSite, name=row.get('site_name', '').strip())
                if not site and row.get('site_id'):
                    site = self.safe_get_or_none(WetlandSite, id=row['site_id'])

                threat = self.safe_get_or_none(Threat, name=row.get('threat_name', '').strip())

                if site and threat:
                    # Get data source if specified
                    data_source = None
                    if row.get('data_source'):
                        data_source, _ = DataSource.objects.get_or_create(
                            name=row['data_source'].strip()
                        )

                    obj, created = SiteThreat.objects.get_or_create(
                        site=site,
                        threat=threat,
                        defaults={
                            'intensity': row.get('intensity', '').strip() or None,
                            'notes': row.get('notes', '').strip() or None,
                            'data_source': data_source
                        }
                    )
                    if created:
                        count += 1
        return count

    def import_site_conservation_measures(self, file_path):
        """Import site conservation measures"""
        count = 0
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Get site and conservation measure
                site = self.safe_get_or_none(WetlandSite, name=row.get('site_name', '').strip())
                if not site and row.get('site_id'):
                    site = self.safe_get_or_none(WetlandSite, id=row['site_id'])

                measure = self.safe_get_or_none(ConservationMeasure, name=row.get('measure_name', '').strip())

                if site and measure:
                    # Get data source if specified
                    data_source = None
                    if row.get('data_source'):
                        data_source, _ = DataSource.objects.get_or_create(
                            name=row['data_source'].strip()
                        )

                    obj, created = SiteConservationMeasure.objects.get_or_create(
                        site=site,
                        measure=measure,
                        defaults={
                            'status': row.get('status', '').strip() or None,
                            'notes': row.get('notes', '').strip() or None,
                            'data_source': data_source
                        }
                    )
                    if created:
                        count += 1
        return count