package com.incident.system.service;

import com.incident.system.entity.Impact;
import com.incident.system.entity.Priority;
import com.incident.system.entity.Urgency;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PriorityCalculatorTest {

    private PriorityCalculator priorityCalculator;

    @BeforeEach
    void setUp() {
        priorityCalculator = new PriorityCalculator();
    }

    @ParameterizedTest(name = "Impact: {0}, Urgency: {1} => Priority: {2}")
    @CsvSource({
            "HIGH, HIGH, CRITICAL",
            "HIGH, MEDIUM, HIGH",
            "HIGH, LOW, MEDIUM",
            "MEDIUM, HIGH, HIGH",
            "MEDIUM, MEDIUM, MEDIUM",
            "MEDIUM, LOW, LOW",
            "LOW, HIGH, MEDIUM",
            "LOW, MEDIUM, LOW",
            "LOW, LOW, LOW"
    })
    @DisplayName("Verify all 9 cells of the ITIL Impact-Urgency Priority Matrix")
    void testAllPriorityMatrixCombinations(Impact impact, Urgency urgency, Priority expectedPriority) {
        Priority calculated = priorityCalculator.calculate(impact, urgency);
        assertThat(calculated).isEqualTo(expectedPriority);
    }

    @Test
    @DisplayName("Null impact or urgency throws IllegalArgumentException")
    void testNullInputsThrowException() {
        assertThatThrownBy(() -> priorityCalculator.calculate(null, Urgency.HIGH))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> priorityCalculator.calculate(Impact.HIGH, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Validate or calculate accepts matching supplied priority")
    void testValidateOrCalculate_AcceptsMatchingPriority() {
        Priority result = priorityCalculator.validateOrCalculate(Impact.HIGH, Urgency.HIGH, Priority.CRITICAL);
        assertThat(result).isEqualTo(Priority.CRITICAL);
    }

    @Test
    @DisplayName("Validate or calculate calculates priority when supplied priority is null")
    void testValidateOrCalculate_CalculatesWhenNull() {
        Priority result = priorityCalculator.validateOrCalculate(Impact.MEDIUM, Urgency.HIGH, null);
        assertThat(result).isEqualTo(Priority.HIGH);
    }

    @Test
    @DisplayName("Validate or calculate rejects contradictory supplied priority")
    void testValidateOrCalculate_RejectsContradictoryPriority() {
        assertThatThrownBy(() -> priorityCalculator.validateOrCalculate(Impact.LOW, Urgency.LOW, Priority.CRITICAL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("contradicts the configured impact-and-urgency matrix")
                .hasMessageContaining("Expected priority is 'LOW'");
    }
}
