from django.core.management.base import BaseCommand
from django.contrib.gis.utils import LayerMapping
from core.models import Wilaya
import json

class Command(BaseCommand):
    help = 'Load Wilayas from GeoJSON file'

    def add_arguments(self, parser):
        parser.add_argument('geojson_file', type=str, help='Path to the GeoJSON file')

    def handle(self, *args, **options):
        geojson_file = options['geojson_file']
        
        # Clear existing wilayas
        Wilaya.objects.all().delete()
        
        # Load GeoJSON data
        with open(geojson_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for feature in data['features']:
            properties = feature['properties']
            geometry = feature['geometry']
            
            # Extract wilaya name from properties
            name = properties.get('NAME_1') or properties.get('name') or properties.get('NAME')
            
            if name and geometry:
                # Convert geometry to WKT format for Django
                from django.contrib.gis.geos import GEOSGeometry
                geom = GEOSGeometry(json.dumps(geometry))
                
                # Create Wilaya object
                wilaya = Wilaya(name=name, geometry=geom)
                wilaya.save()
                
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully loaded wilaya: {name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully loaded {Wilaya.objects.count()} wilayas')
        )

