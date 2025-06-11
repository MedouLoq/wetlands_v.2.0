from django.core.management.base import BaseCommand, CommandError
from core.models import Species, TaxonomicGroup
import csv

class Command(BaseCommand):
    help = 'Imports species data from a CSV file, updating existing records only. New records will not be created.'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='The path to the CSV file to import.')

    def handle(self, *args, **options):
        csv_file_path = options['csv_file']

        try:
            with open(csv_file_path, mode='r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                if 'scientific_name' not in reader.fieldnames or 'common_name_fr' not in reader.fieldnames or 'taxonomic_group_id' not in reader.fieldnames:
                    raise CommandError('CSV file must contain scientific_name, common_name_fr, and taxonomic_group_id columns.')
                
                # Define taxonomic group mapping
                taxonomic_group_mapping = {
                    1: 'Plant',
                    2: 'Bird',
                    3: 'Mammal',
                    4: 'Fish'
                }

                for row in reader:
                    scientific_name = row.get('scientific_name')
                    common_name_fr = row.get('common_name_fr')
                    common_name_local = row.get('common_name_local')
                    taxonomic_group_id = row.get('taxonomic_group_id')

                    # Clean up empty strings to None
                    for key, value in row.items():
                        if value == '':
                            row[key] = None

                    # Get or create TaxonomicGroup instance
                    taxonomic_group_obj = None
                    if taxonomic_group_id:
                        try:
                            group_name = taxonomic_group_mapping.get(int(taxonomic_group_id))
                            if group_name:
                                taxonomic_group_obj, created = TaxonomicGroup.objects.get_or_create(name=group_name)
                                if created:
                                    self.stdout.write(self.style.SUCCESS(f'Created TaxonomicGroup: {group_name}'))
                            else:
                                self.stdout.write(self.style.WARNING(f'Unknown taxonomic_group_id: {taxonomic_group_id}. Skipping taxonomic group assignment for {scientific_name or common_name_fr}.'))
                        except ValueError:
                            self.stdout.write(self.style.WARNING(f'Invalid taxonomic_group_id: {taxonomic_group_id}. Skipping taxonomic group assignment for {scientific_name or common_name_fr}.'))

                    # Prepare data for Species model
                    species_data = {
                        'common_name_fr': common_name_fr,
                        'common_name_local': common_name_local,
                        'taxonomic_group': taxonomic_group_obj,
                        'iucn_status': row.get('iucn_status'),
                        'national_status': row.get('national_status'),
                        'description': row.get('description'),
                        'notes': row.get('notes'),
                    }

                    species_to_update = None

                    # Try to find by scientific_name first
                    if scientific_name:
                        try:
                            species_to_update = Species.objects.get(scientific_name=scientific_name)
                        except Species.DoesNotExist:
                            pass # Not found by scientific_name, try common_name_fr

                    # If not found by scientific_name, try by common_name_fr
                    if not species_to_update and common_name_fr:
                        try:
                            species_to_update = Species.objects.get(common_name_fr=common_name_fr)
                        except Species.DoesNotExist:
                            pass # Not found by common_name_fr either

                    if species_to_update:
                        # Update existing species
                        for key, value in species_data.items():
                            setattr(species_to_update, key, value)
                        species_to_update.save()
                        self.stdout.write(self.style.SUCCESS(f'Successfully updated species: {species_to_update.scientific_name or species_to_update.common_name_fr}'))
                    else:
                        self.stdout.write(self.style.WARNING(f'Skipping row: Species not found by scientific_name ({scientific_name}) or common_name_fr ({common_name_fr}). No new record created.'))

        except FileNotFoundError:
            raise CommandError(f'File "{csv_file_path}" does not exist.')
        except Exception as e:
            raise CommandError(f'Error importing data: {e}')

        self.stdout.write(self.style.SUCCESS('Species import completed successfully.'))


