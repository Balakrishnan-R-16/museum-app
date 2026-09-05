package com.museum.ticketbooking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.nio.file.Files;
import java.util.List;

@SpringBootApplication
public class TicketBookingApplication {

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(TicketBookingApplication.class, args);
        System.out.println("\n🚀 Museum Ticket Booking System Started!");
        System.out.println("📝 API Base URL: http://localhost:8080/api");
        System.out.println("📱 Frontend URL: http://localhost:5173\n");
    }

    /**
     * Loads key-value pairs from local .env if present.
     * System properties and actual OS environment variables take precedence.
     */
    private static void loadDotenv() {
        String[] candidatePaths = { ".env", "backend/.env", "../backend/.env" };
        for (String path : candidatePaths) {
            File envFile = new File(path);
            if (envFile.exists() && envFile.isFile()) {
                try {
                    List<String> lines = Files.readAllLines(envFile.toPath());
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
                        if (trimmed.startsWith("export ")) {
                            trimmed = trimmed.substring(7).trim();
                        }
                        int eqIdx = trimmed.indexOf('=');
                        if (eqIdx > 0) {
                            String key = trimmed.substring(0, eqIdx).trim();
                            String value = trimmed.substring(eqIdx + 1).trim();
                            if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.substring(1, value.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, value);
                            }
                        }
                    }
                    break;
                } catch (Exception e) {
                    // Ignore and proceed with environment variables
                }
            }
        }
    }
}
