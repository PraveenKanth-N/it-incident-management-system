package com.incident.system.service.notification;

import com.incident.system.entity.Notification;
import com.incident.system.entity.NotificationChannel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Zero-Cost Outbound Email Simulator Channel.
 * <p>
 * IMPORTANT ARCHITECTURE NOTE:
 * This delivery channel is explicitly a simulated, non-delivering logger adapter.
 * It does NOT send real network emails via SMTP or third-party paid mail APIs (e.g. SendGrid, Mailgun).
 * Instead, outbound messages are formatted and routed to SLF4J structured logs for auditing,
 * verification, and development purposes without incurring recurring billing or requiring external credentials.
 * Production deployments can replace or extend this channel with standard JavaMailSender/SMTP relay.
 */
@Slf4j
@Component
public class EmailNotificationDeliveryChannel implements NotificationDeliveryChannel {

    @Override
    public NotificationChannel getChannel() {
        return NotificationChannel.EMAIL;
    }

    @Override
    public boolean deliver(Notification notification) {
        try {
            String recipientEmail = notification.getRecipient() != null
                    ? notification.getRecipient().getEmail()
                    : "noreply@company.com";

            log.info("[OUTBOUND EMAIL SIMULATOR] To: <{}> | Subject: [{}] | Body: {}",
                    recipientEmail, notification.getTitle(), notification.getMessage());

            // Non-paid email adapter: successfully logged to console/audit sink
            return true;
        } catch (Exception ex) {
            log.error("Failed to deliver email notification #{}: {}", notification.getId(), ex.getMessage(), ex);
            return false;
        }
    }
}
