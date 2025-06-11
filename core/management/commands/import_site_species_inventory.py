from django.core.management.base import BaseCommand, CommandError
from core.models import WetlandSite, Species, SiteSpeciesInventory
import csv

class Command(BaseCommand):
    help = 'Imports site-species inventory data from a CSV file.'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='The path to the CSV file to import.')

    def handle(self, *args, **options):
        csv_file_path = options['csv_file']

        try:
            with open(csv_file_path, mode='r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                if 'site_id' not in reader.fieldnames or 'species_id' not in reader.fieldnames:
                    raise CommandError('CSV file must contain site_id and species_id columns.')
                
                for row in reader:
                    site_id = row.get('site_id')
                    species_id = row.get('species_id')
                    notes = row.get('notes', '')

                    if not site_id or not species_id:
                        self.stdout.write(self.style.WARNING(f'Skipping row due to missing site_id or species_id: {row}'))
                        continue

                    try:
                        site = WetlandSite.objects.get(id=site_id)
                    except WetlandSite.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'Skipping row: WetlandSite with ID {site_id} not found.'))
                        continue

                    try:
                        species = Species.objects.get(id=species_id)
                    except Species.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'Skipping row: Species with ID {species_id} not found.'))
                        continue

                    # Create or update the SiteSpeciesInventory entry
                    site_species_inventory, created = SiteSpeciesInventory.objects.update_or_create(
                        site=site,
                        species=species,
                        defaults={'notes': notes}
                    )

                    if created:
                        self.stdout.write(self.style.SUCCESS(f'Successfully created SiteSpeciesInventory for Site ID {site_id} and Species ID {species_id}'))
                    else:
                        self.stdout.write(self.style.SUCCESS(f'Successfully updated SiteSpeciesInventory for Site ID {site_id} and Species ID {species_id}'))

        except FileNotFoundError:
            raise CommandError(f'File "{csv_file_path}" does not exist.')
        except Exception as e:
            raise CommandError(f'Error importing data: {e}')

        self.stdout.write(self.style.SUCCESS('SiteSpeciesInventory import completed successfully.'))


