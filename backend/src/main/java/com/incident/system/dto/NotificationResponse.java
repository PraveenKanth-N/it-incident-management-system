package com.incident.system.dto;

import com.incident.system.entity.Notification;
import com.incident.system.entity.NotificationChannel;
import com.incident.system.entity.NotificationStatus;
import com.incident.system.entity.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private Long id;
    private Long recipientId;
    private Long incidentId;
    private String ticketNumber;
    private NotificationType type;
    private String title;
    private String message;
    private NotificationChannel channel;
    private NotificationStatus status;
    private boolean isRead;
    private Instant createdAt;
    private Instant readAt;

    public static NotificationResponse fromEntity(Notification notification) {
        if (notification == null) {
            return null;
        }

        return NotificationResponse.builder()
                .id(notification.getId())
                .recipientId(notification.getRecipient() != null ? notification.getRecipient().getId() : null)
                .incidentId(notification.getIncident() != null ? notification.getIncident().getId() : null)
                .ticketNumber(notification.getIncident() != null ? notification.getIncident().getTicketNumber() : null)
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .channel(notification.getChannel())
                .status(notification.getStatus())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .build();
    }
}
