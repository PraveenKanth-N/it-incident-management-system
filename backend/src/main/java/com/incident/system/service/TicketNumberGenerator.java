package com.incident.system.service;

import com.incident.system.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
public class TicketNumberGenerator {

    private final IncidentRepository incidentRepository;
    private static final String ALPHANUMERIC = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude easily confused chars like I/O
    private static final int RANDOM_PART_LENGTH = 4;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    public String generateTicketNumber() {
        String datePrefix = LocalDate.now().format(DATE_FORMATTER);
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder("INC-").append(datePrefix).append("-");
            for (int i = 0; i < RANDOM_PART_LENGTH; i++) {
                sb.append(ALPHANUMERIC.charAt(RANDOM.nextInt(ALPHANUMERIC.length())));
            }
            String candidate = sb.toString();
            if (!incidentRepository.existsByTicketNumber(candidate)) {
                return candidate;
            }
        }
        // Fallback with timestamp suffix to guarantee uniqueness
        return "INC-" + datePrefix + "-" + System.currentTimeMillis() % 100000;
    }
}
