package com.incident.system.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;
    private final String testSecret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private final long testExpirationMs = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret", testSecret);
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationMs", testExpirationMs);
    }

    @Test
    @DisplayName("JWT Token Generation - Successfully encodes subject, role, and userId claims")
    void testTokenGenerationAndExtraction() {
        UserDetailsImpl userDetails = UserDetailsImpl.builder()
                .id(42L)
                .username("john.doe")
                .email("john.doe@example.com")
                .fullName("John Doe")
                .department("Engineering")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_TECHNICIAN")))
                .active(true)
                .build();

        String token = tokenProvider.generateTokenFromUserDetails(userDetails);

        assertThat(token).isNotBlank();
        assertThat(tokenProvider.validateToken(token)).isTrue();
        assertThat(tokenProvider.getUsernameFromToken(token)).isEqualTo("john.doe");
        assertThat(tokenProvider.getRoleFromToken(token)).isEqualTo("ROLE_TECHNICIAN");
        assertThat(tokenProvider.getUserIdFromToken(token)).isEqualTo(42L);
    }

    @Test
    @DisplayName("JWT Token Validation - Rejects tampered, malformed, or empty tokens")
    void testInvalidTokenRejection() {
        assertThat(tokenProvider.validateToken("invalid.token.structure")).isFalse();
        assertThat(tokenProvider.validateToken("")).isFalse();
        assertThat(tokenProvider.validateToken(null)).isFalse();
    }
}
