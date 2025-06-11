from django.core.management.base import BaseCommand
from django.conf import settings
from django.db.models import Q
from core.models import Species, SpeciesImage
import os
import shutil

class Command(BaseCommand):
    help = 'Imports species images from the species_images directory into the database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run the command without making any database changes',
        )
        parser.add_argument(
            '--copy-files',
            action='store_true',
            help='Copy images to MEDIA_ROOT instead of creating references to original files',
        )

    def handle(self, *args, **options):
        images_dir = os.path.join(settings.BASE_DIR, 'species_images')
        if not os.path.exists(images_dir):
            self.stdout.write(self.style.ERROR(f'Directory not found: {images_dir}'))
            return

        self.stdout.write(self.style.SUCCESS(f'Starting image import from {images_dir}'))
        
        dry_run = options['dry_run']
        copy_files = options['copy_files']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        total_imported = 0
        total_skipped = 0
        total_errors = 0

        for species_folder_name in os.listdir(images_dir):
            species_folder_path = os.path.join(images_dir, species_folder_name)
            if os.path.isdir(species_folder_path):
                try:
                    # Try to find species by scientific_name, common_name_fr, or common_name_local
                    species = Species.objects.filter(
                        Q(scientific_name__iexact=species_folder_name) |
                        Q(common_name_fr__iexact=species_folder_name) |
                        Q(common_name_local__iexact=species_folder_name)
                    ).first()
                    
                    if not species:
                        # Try partial matches for species names with underscores
                        species_name_variants = species_folder_name.replace('_', ' ')
                        species = Species.objects.filter(
                            Q(scientific_name__icontains=species_name_variants) |
                            Q(common_name_fr__icontains=species_name_variants) |
                            Q(common_name_local__icontains=species_name_variants)
                        ).first()
                    
                    if species:
                        self.stdout.write(self.style.SUCCESS(f'Found species: {species.scientific_name or species.common_name_fr}'))
                        
                        # Get all image files in the folder
                        image_files = [f for f in os.listdir(species_folder_path) 
                                     if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp'))]
                        
                        for image_filename in image_files:
                            image_path = os.path.join(species_folder_path, image_filename)
                            
                            # Check if image already exists for this species
                            existing_image = SpeciesImage.objects.filter(
                                species=species,
                                image__endswith=image_filename
                            ).first()
                            
                            if existing_image:
                                self.stdout.write(self.style.WARNING(f'Skipped {image_filename} for {species_folder_name} (already exists)'))
                                total_skipped += 1
                                continue
                            
                            if not dry_run:
                                if copy_files:
                                    # Copy file to media directory
                                    media_species_dir = os.path.join(settings.MEDIA_ROOT, 'species_images', species_folder_name)
                                    os.makedirs(media_species_dir, exist_ok=True)
                                    
                                    destination_path = os.path.join(media_species_dir, image_filename)
                                    shutil.copy2(image_path, destination_path)
                                    
                                    # Create relative path for database
                                    relative_path = os.path.join('species_images', species_folder_name, image_filename)
                                else:
                                    # Create relative path from original location
                                    relative_path = os.path.relpath(image_path, settings.MEDIA_ROOT)
                                
                                # Create SpeciesImage record
                                species_image = SpeciesImage.objects.create(
                                    species=species,
                                    image=relative_path,
                                    caption=f'{species_folder_name} - {image_filename}'
                                )
                                
                                self.stdout.write(self.style.SUCCESS(f'Successfully imported {image_filename} for {species_folder_name}'))
                                total_imported += 1
                            else:
                                self.stdout.write(self.style.SUCCESS(f'[DRY RUN] Would import {image_filename} for {species_folder_name}'))
                                total_imported += 1

                    else:
                        self.stdout.write(self.style.WARNING(f'Species not found for folder: {species_folder_name}'))
                        total_errors += 1
                        
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error processing folder {species_folder_name}: {e}'))
                    total_errors += 1

        # Summary
        self.stdout.write(self.style.SUCCESS('\n=== IMPORT SUMMARY ==='))
        self.stdout.write(f'Images imported: {total_imported}')
        self.stdout.write(f'Images skipped: {total_skipped}')
        self.stdout.write(f'Errors: {total_errors}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('This was a dry run - no changes were made to the database'))
        else:
            self.stdout.write(self.style.SUCCESS('Image import process completed.'))

