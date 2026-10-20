package com.incident.system.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordHandlingTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    @Test
    @DisplayName("Password Hashing - Generates unique salts and valid BCrypt hash format")
    void testPasswordHashingFormatAndSaltUniqueness() {
        String rawPassword = "SecurePassword123!";

        String hash1 = passwordEncoder.encode(rawPassword);
        String hash2 = passwordEncoder.encode(rawPassword);

        // Hashes must begin with standard BCrypt $2a$ or $2b$ prefix
        assertThat(hash1).startsWith("$2a$").hasSize(60);
        assertThat(hash2).startsWith("$2a$").hasSize(60);

        // Unique random salt per hash ensures different ciphertext
        assertThat(hash1).isNotEqualTo(hash2);
    }

    @Test
    @DisplayName("Password Matching - Successfully verifies matching password and rejects incorrect password")
    void testPasswordMatchesAndRejects() {
        String rawPassword = "CorrectHorseBatteryStaple!";
        String encoded = passwordEncoder.encode(rawPassword);

        assertThat(passwordEncoder.matches(rawPassword, encoded)).isTrue();
        assertThat(passwordEncoder.matches("WrongPassword", encoded)).isFalse();
        assertThat(passwordEncoder.matches("correcthorsebatterystaple!", encoded)).isFalse(); // case-sensitive
    }
}
