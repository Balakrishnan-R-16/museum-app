package com.museum.ticketbooking.service;

import com.museum.ticketbooking.model.MuseumImage;
import com.museum.ticketbooking.repository.MuseumImageRepository;
import com.museum.ticketbooking.repository.MuseumRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.List;

@Service
public class ImageUploadService {

    private final Path fileStorageLocation;
    private final MuseumImageRepository imageRepository;
    private final MuseumRepository museumRepository;
    
    @Value("${app.base-url:http://localhost:9090}")
    private String backendUrl;

    public ImageUploadService(
            @Value("${app.image.storage-path:uploads/images}") String imageStoragePath,
            MuseumImageRepository imageRepository,
            MuseumRepository museumRepository) {
        this.imageRepository = imageRepository;
        this.museumRepository = museumRepository;
        this.fileStorageLocation = Paths.get(imageStoragePath).toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public MuseumImage uploadImage(Long museumId, MultipartFile file, String imageType, String caption) {
        // Normalize file name
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());

        try {
            // Check if the file's name contains invalid characters
            if(originalFileName.contains("..")) {
                throw new RuntimeException("Sorry! Filename contains invalid path sequence " + originalFileName);
            }
            
            // Validate MIME type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new RuntimeException("Only image files are allowed");
            }
            
            // Max size 5MB (configured in properties usually, but hardcoded validation here)
            if (file.getSize() > 5 * 1024 * 1024) {
                throw new RuntimeException("File size exceeds limit of 5MB");
            }

            // Generate unique filename
            String fileExtension = "";
            int i = originalFileName.lastIndexOf('.');
            if (i > 0) {
                fileExtension = originalFileName.substring(i);
            }
            String newFileName = UUID.randomUUID().toString() + fileExtension;

            // Copy file to the target location (Replacing existing file with the same name)
            Path targetLocation = this.fileStorageLocation.resolve(newFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            String fileDownloadUri = "/uploads/images/" + newFileName;

            // Save to DB
            MuseumImage image = new MuseumImage();
            image.setMuseumId(museumId);
            image.setImageUrl(fileDownloadUri);
            image.setImageType(imageType);
            image.setCaption(caption);
            image.setOriginalFilename(originalFileName);
            image.setFileSize(file.getSize());
            image.setMimeType(contentType);
            
            // Set sort order to be last
            List<MuseumImage> existingImages = imageRepository.findByMuseumIdAndImageTypeOrderBySortOrderAsc(museumId, imageType);
            image.setSortOrder(existingImages.size());
            
            MuseumImage savedImage = imageRepository.save(image);
            
            // Update Museum entity if it's cover or display
            if ("COVER".equalsIgnoreCase(imageType) || "DISPLAY".equalsIgnoreCase(imageType)) {
                museumRepository.findById(museumId).ifPresent(m -> {
                    if ("COVER".equalsIgnoreCase(imageType)) {
                        m.setCoverImageUrl(fileDownloadUri);
                    } else {
                        m.setDisplayImageUrl(fileDownloadUri);
                    }
                    museumRepository.save(m);
                });
            }
            
            return savedImage;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + originalFileName + ". Please try again!", ex);
        }
    }
    
    public void deleteImage(Long imageId, Long museumId) {
        MuseumImage image = imageRepository.findById(imageId)
            .orElseThrow(() -> new RuntimeException("Image not found"));
            
        if (!image.getMuseumId().equals(museumId)) {
            throw new RuntimeException("You don't have permission to delete this image");
        }
        
        // Delete file from disk
        try {
            String filename = image.getImageUrl().substring(image.getImageUrl().lastIndexOf("/") + 1);
            Path filePath = this.fileStorageLocation.resolve(filename).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            System.err.println("Could not delete file: " + ex.getMessage());
        }
        
        imageRepository.delete(image);
        
        // Update Museum entity if it's cover or display
        if ("COVER".equalsIgnoreCase(image.getImageType()) || "DISPLAY".equalsIgnoreCase(image.getImageType())) {
             museumRepository.findById(museumId).ifPresent(m -> {
                 if ("COVER".equalsIgnoreCase(image.getImageType())) {
                     m.setCoverImageUrl(null);
                 } else {
                     m.setDisplayImageUrl(null);
                 }
                 museumRepository.save(m);
             });
        }
    }
}
