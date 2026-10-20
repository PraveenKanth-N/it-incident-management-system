package com.incident.system.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendDataPointDto {
    private String date; // YYYY-MM-DD
    private long createdCount;
    private long resolvedCount;
}
