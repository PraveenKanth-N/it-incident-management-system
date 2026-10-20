package com.incident.system.service.notification;

import com.incident.system.entity.Notification;
import com.incident.system.entity.NotificationChannel;

public interface NotificationDeliveryChannel {

    NotificationChannel getChannel();

    /**
     * Attempts delivery of the specified notification.
     *
     * @param notification the notification entity to deliver
     * @return true if delivery succeeded, false if delivery failed and should be retried
     */
    boolean deliver(Notification notification);
}
