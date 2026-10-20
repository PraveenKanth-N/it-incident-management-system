package com.incident.system.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "escalation_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EscalationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 20)
    private Priority priority;

    @Column(name = "warning_threshold_percent", nullable = false)
    @Builder.Default
    private int warningThresholdPercent = 75;

    @Column(name = "breach_level", nullable = false)
    @Builder.Default
    private int breachLevel = 2;

    @Column(name = "critical_threshold_percent", nullable = false)
    @Builder.Default
    private int criticalThresholdPercent = 150;

    @Column(name = "auto_escalate_unassigned", nullable = false)
    @Builder.Default
    private boolean autoEscalateUnassigned = true;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
