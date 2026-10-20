package com.incident.system.dto.analytics;

import com.incident.system.entity.IncidentStatus;
import com.incident.system.entity.Priority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsFilterRequest {

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private Instant startDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private Instant endDate;

    private IncidentStatus status;
    private Priority priority;
    private Long categoryId;
    private Long assigneeId;
    private Long reporterId;
}
