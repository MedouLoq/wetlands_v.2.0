from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from core.models import WetlandSite, DataSource
import json
import re


class Command(BaseCommand):
    help = 'Import wetland sites from shapefile data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='/home/ubuntu/project_files/shapefile_data.json',
            help='Path to the JSON file containing shapefile data'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        
        # Create or get data source
        data_source, created = DataSource.objects.get_or_create(
            name="Shapefile Import 2025",
            defaults={
                'source_type': 'Shapefile',
                'organization': 'Ministère de l\'Environnement Mauritanie',
                'description': 'Données des zones humides importées depuis les shapefiles'
            }
        )
        
        with open(file_path, 'r', encoding='utf-8') as f:
            records = json.load(f)
        
        imported_count = 0
        updated_count = 0
        
        for record in records:
            # Clean and fix encoding issues
            name = self.fix_encoding(record.get('Nom de la', ''))
            commune = self.fix_encoding(record.get('Commune', ''))
            wilaya = self.fix_encoding(record.get('Wilaya', ''))
            
            if not name:
                continue
                
            # Create geometry point
            lat = record.get('Latitude (')
            lon = record.get('Longitude')
            geometry = None
            if lat and lon:
                try:
                    geometry = Point(float(lon), float(lat), srid=4326)
                except (ValueError, TypeError):
                    self.stdout.write(
                        self.style.WARNING(f'Invalid coordinates for {name}: {lat}, {lon}')
                    )
            
            # Prepare data
            site_data = {
                'name': name,
                'commune': commune,
                'region': wilaya,  # Maps to 'region' field with verbose_name 'Wilaya'
                'geometry': geometry,
                'data_source': data_source,
                'description_ecological': self.fix_encoding(record.get('Plantes aq', '')),
                'hydrology_summary': self.fix_encoding(record.get('DurÃ©e de', '')),
                'land_use_current': self.fix_encoding(record.get('ActivitÃ©s', '')),
                'threats_anthropogenic': self.fix_encoding(record.get('Menaces an', '')),
                'threats_natural': self.fix_encoding(record.get('Menaces na', '')),
                'conservation_measures_proposed': self.fix_encoding(record.get('Recommanda', '')),
                'contacts': self.fix_encoding(record.get('Contacts', '')),
            }
            
            # Additional data for description
            additional_info = []
            if record.get('Oiseaux'):
                additional_info.append(f"Oiseaux: {self.fix_encoding(record['Oiseaux'])}")
            if record.get('Animaux sa'):
                additional_info.append(f"Animaux sauvages: {self.fix_encoding(record['Animaux sa'])}")
            if record.get('Poissons'):
                additional_info.append(f"Poissons: {self.fix_encoding(record['Poissons'])}")
            if record.get('Essences f'):
                additional_info.append(f"Essences forestières: {self.fix_encoding(record['Essences f'])}")
            
            if additional_info:
                site_data['description_physical'] = '\n\n'.join(additional_info)
            
            # Check if site already exists
            existing_site = WetlandSite.objects.filter(name=name).first()
            
            if existing_site:
                # Update existing site
                for key, value in site_data.items():
                    if value:  # Only update non-empty values
                        setattr(existing_site, key, value)
                existing_site.save()
                updated_count += 1
                self.stdout.write(f'Updated: {name}')
            else:
                # Create new site
                WetlandSite.objects.create(**site_data)
                imported_count += 1
                self.stdout.write(f'Imported: {name}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Import completed: {imported_count} new sites, {updated_count} updated sites'
            )
        )

    def fix_encoding(self, text):
        """Fix common encoding issues in the data"""
        if not text:
            return ''
        
        # Common replacements for encoding issues
        replacements = {
            'Ã©': 'é',
            'Ã¨': 'è',
            'Ã ': 'à',
            'Ã´': 'ô',
            'Ã¢': 'â',
            'Ã§': 'ç',
            'Ã¹': 'ù',
            'Ã»': 'û',
            'Ã®': 'î',
            'Ã¯': 'ï',
            'Ã«': 'ë',
            'Ã¼': 'ü',
            'Ã±': 'ñ',
            'Ã': 'À',
            'Ã‰': 'É',
            'Ã‡': 'Ç',
            'â€™': "'",
            'â€œ': '"',
            'â€': '"',
            'â€¦': '...',
            'â€"': '–',
            'â€"': '—',
            'Â°': '°',
            'â': '–',
            'â\x80\x99': "'",
            'â\x80\x9c': '"',
            'â\x80\x9d': '"',
            'â\x80¦': '...',
            'â\x80\x93': '–',
            'â\x80\x94': '—',
        }
        
        result = str(text)
        for old, new in replacements.items():
            result = result.replace(old, new)
        
        return result.strip()

