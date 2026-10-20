package com.incident.system.service.notification;

import com.incident.system.entity.Notification;
import com.incident.system.entity.NotificationChannel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class InAppNotificationDeliveryChannel implements NotificationDeliveryChannel {

    @Override
    public NotificationChannel getChannel() {
        return NotificationChannel.IN_APP;
    }

    @Override
    public boolean deliver(Notification notification) {
        // In-app notifications are persisted directly in the relational database.
        // Delivery is considered immediate and guaranteed upon database commit.
        log.debug("Delivered IN_APP notification #{} to recipient={}",
                notification.getId(),
                notification.getRecipient() != null ? notification.getRecipient().getUsername() : "UNKNOWN");
        return true;
    }
}
