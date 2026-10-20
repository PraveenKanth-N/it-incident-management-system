package com.incident.system.service;

import com.incident.system.entity.Impact;
import com.incident.system.entity.Priority;
import com.incident.system.entity.Urgency;
import org.springframework.stereotype.Component;

/**
 * Centralized ITIL Impact and Urgency Priority Matrix.
 * 
 * Matrix Definition:
 *  +------------+----------+----------+----------+
 *  | Impact \   | HIGH     | MEDIUM   | LOW      |
 *  | Urgency    |          |          |          |
 *  +------------+----------+----------+----------+
 *  | HIGH       | CRITICAL | HIGH     | MEDIUM   |
 *  | MEDIUM     | HIGH     | MEDIUM   | LOW      |
 *  | LOW        | MEDIUM   | LOW      | LOW      |
 *  +------------+----------+----------+----------+
 */
@Component
public class PriorityCalculator {

    public Priority calculate(Impact impact, Urgency urgency) {
        if (impact == null || urgency == null) {
            throw new IllegalArgumentException("Both impact and urgency must be specified to calculate priority");
        }

        return switch (impact) {
            case HIGH -> switch (urgency) {
                case HIGH -> Priority.CRITICAL;
                case MEDIUM -> Priority.HIGH;
                case LOW -> Priority.MEDIUM;
            };
            case MEDIUM -> switch (urgency) {
                case HIGH -> Priority.HIGH;
                case MEDIUM -> Priority.MEDIUM;
                case LOW -> Priority.LOW;
            };
            case LOW -> switch (urgency) {
                case HIGH -> Priority.MEDIUM;
                case MEDIUM -> Priority.LOW;
                case LOW -> Priority.LOW;
            };
        };
    }

    public Priority validateOrCalculate(Impact impact, Urgency urgency, Priority suppliedPriority) {
        Priority calculated = calculate(impact, urgency);
        if (suppliedPriority != null && suppliedPriority != calculated) {
            throw new IllegalArgumentException(String.format(
                    "Supplied priority '%s' contradicts the configured impact-and-urgency matrix. Expected priority is '%s' for impact '%s' and urgency '%s'.",
                    suppliedPriority, calculated, impact, urgency
            ));
        }
        return calculated;
    }
}
