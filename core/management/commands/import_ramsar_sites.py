from django.core.management.base import BaseCommand
from core.models import WetlandSite, DataSource
from django.contrib.gis.geos import Point


class Command(BaseCommand):
    help = 'Create or update Ramsar sites in Mauritania'

    def handle(self, *args, **options):
        # Create or get Ramsar data source
        ramsar_source, created = DataSource.objects.get_or_create(
            name="Ramsar Convention",
            defaults={
                'source_type': 'International Convention',
                'organization': 'Ramsar Convention Secretariat',
                'description': 'Sites désignés sous la Convention de Ramsar sur les zones humides',
                'url': 'https://www.ramsar.org/'
            }
        )
        
        # Ramsar sites data
        ramsar_sites = [
            {
                'name': 'Parc National du Banc d\'Arguin',
                'code': 'RAMSAR-250',
                'region': 'Dakhlet Nouadhibou',
                'area_hectares': 1200000.00,
                'designation_date': '1982-10-22',
                'ramsar_criteria_met': 'Critères 1, 2, 3, 4, 5, 6 - Plus d\'un tiers du littoral mauritanien, zone de pêche riche, site de nidification et de migration pour les oiseaux',
                'description_ecological': 'Écosystème côtier riche en biodiversité avec vastes étendues de marais couverts d\'herbiers marins. Habitat crucial pour de nombreuses espèces d\'oiseaux migrateurs.',
                'description_physical': 'Dunes de sable, marécages côtiers, petites îles et eaux côtières peu profondes. Contraste entre le désert du Sahara et l\'océan Atlantique.',
                'conservation_measures_taken': 'Parc national depuis 1976, site du patrimoine mondial UNESCO depuis 1989, protection stricte de la zone.',
                'geometry': Point(-16.5, 20.0, srid=4326),  # Coordonnées approximatives
                'data_source': ramsar_source,
            },
            {
                'name': 'Parc National du Diawling',
                'code': 'RAMSAR-666',
                'region': 'Trarza',
                'area_hectares': 15600.00,
                'designation_date': '1994-08-23',
                'ramsar_criteria_met': 'Critères 1, 2, 3, 4 - Trois lagunes côtières et zone estuarienne de mangroves',
                'description_ecological': 'Trois lagunes côtières et zone estuarienne de mangroves fournissant des zones d\'alimentation pour les poissons, crevettes et gambas. Nombreuses espèces d\'oiseaux.',
                'description_physical': 'Lagunes côtières, mangroves, zones estuariennes où l\'eau douce du fleuve Sénégal rencontre l\'eau salée de l\'Atlantique.',
                'conservation_measures_taken': 'Parc national établi en 1991, gestion conjointe avec le Sénégal pour la conservation transfrontalière.',
                'geometry': Point(-16.3, 16.3, srid=4326),  # Coordonnées approximatives
                'data_source': ramsar_source,
            },
            {
                'name': 'Chat Tboul',
                'code': 'RAMSAR-1044',
                'region': 'Trarza',
                'designation_date': '2000-11-10',
                'ramsar_criteria_met': 'Critères 1, 2, 4 - Ancienne embouchure du fleuve Sénégal, zone côtière importante',
                'description_ecological': 'Zone côtière située le long de l\'Atlantique, immédiatement au nord du Parc National du Diawling, autour d\'une ancienne embouchure du fleuve Sénégal.',
                'description_physical': 'Zone côtière avec ancienne embouchure fluviale, habitats variés entre terre et mer.',
                'conservation_measures_taken': 'Protection en tant que site Ramsar, gestion coordonnée avec les sites adjacents.',
                'geometry': Point(-16.2, 16.5, srid=4326),  # Coordonnées approximatives
                'data_source': ramsar_source,
            },
            {
                'name': 'Lac Gabou et le réseau hydrographique du Plateau du Tagant',
                'code': 'RAMSAR-1854',
                'region': 'Tagant',
                'area_hectares': 9500.00,
                'designation_date': '2009-02-13',
                'ramsar_criteria_met': 'Critères 1, 2, 3 - Réseau hydrographique unique du Sahel et Sahara formant le Lac Gabou',
                'description_ecological': 'Réseau hydrographique unique où les eaux du Sahel et du Sahara se rejoignent pour former le Lac Gabou, avec plusieurs lagunes et étangs temporaires ainsi que des sources d\'eau douce.',
                'description_physical': 'Lac principal avec réseau de lagunes temporaires et étangs, sources d\'eau douce dans un environnement semi-aride.',
                'conservation_measures_taken': 'Protection en tant que site Ramsar, gestion des ressources en eau.',
                'geometry': Point(-11.5, 18.0, srid=4326),  # Coordonnées approximatives
                'data_source': ramsar_source,
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for site_data in ramsar_sites:
            # Check if site already exists
            existing_site = WetlandSite.objects.filter(
                name=site_data['name']
            ).first()
            
            if existing_site:
                # Update existing site with Ramsar information
                for key, value in site_data.items():
                    if value:  # Only update non-empty values
                        setattr(existing_site, key, value)
                existing_site.save()
                updated_count += 1
                self.stdout.write(f'Updated Ramsar site: {site_data["name"]}')
            else:
                # Create new Ramsar site
                WetlandSite.objects.create(**site_data)
                created_count += 1
                self.stdout.write(f'Created Ramsar site: {site_data["name"]}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Ramsar sites processing completed: {created_count} new sites, {updated_count} updated sites'
            )
        )

