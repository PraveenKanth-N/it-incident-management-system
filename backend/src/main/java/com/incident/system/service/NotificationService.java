package com.incident.system.service;

import com.incident.system.dto.NotificationResponse;
import com.incident.system.entity.*;
import com.incident.system.exception.ResourceNotFoundException;
import com.incident.system.repository.NotificationRepository;
import com.incident.system.repository.UserRepository;
import com.incident.system.service.notification.NotificationDeliveryChannel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final Map<NotificationChannel, NotificationDeliveryChannel> channelMap;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            List<NotificationDeliveryChannel> deliveryChannels) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.channelMap = deliveryChannels.stream()
                .collect(Collectors.toMap(NotificationDeliveryChannel::getChannel, Function.identity()));
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public Notification sendNotification(
            User recipient,
            Incident incident,
            NotificationType type,
            String title,
            String message,
            NotificationChannel channel) {

        if (recipient == null) {
            log.warn("Cannot send notification: recipient is null. Type: {}", type);
            return null;
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .incident(incident)
                .type(type)
                .title(title)
                .message(message)
                .channel(channel != null ? channel : NotificationChannel.IN_APP)
                .status(NotificationStatus.PENDING)
                .deliveryAttempts(1)
                .isRead(false)
                .createdAt(Instant.now())
                .build();

        Notification saved = notificationRepository.save(notification);

        // Attempt delivery through the registered delivery channel
        NotificationDeliveryChannel deliveryChannel = channelMap.get(saved.getChannel());
        if (deliveryChannel != null) {
            try {
                boolean success = deliveryChannel.deliver(saved);
                if (success) {
                    saved.setStatus(NotificationStatus.DELIVERED);
                } else {
                    saved.setStatus(NotificationStatus.PENDING_RETRY);
                    saved.setErrorMessage("Delivery channel reported failure");
                }
            } catch (Exception ex) {
                log.error("Failed to deliver notification #{}: {}", saved.getId(), ex.getMessage());
                saved.setStatus(NotificationStatus.PENDING_RETRY);
                saved.setErrorMessage(ex.getMessage());
            }
        } else {
            saved.setStatus(NotificationStatus.DELIVERED);
        }

        return notificationRepository.save(saved);
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void notifyIncidentCreated(Incident incident) {
        if (incident == null) return;

        // 1. Confirm to reporter
        if (incident.getReporter() != null) {
            sendNotification(
                    incident.getReporter(),
                    incident,
                    NotificationType.INCIDENT_CREATED,
                    "Incident Submitted: " + incident.getTicketNumber(),
                    String.format("Your incident '%s' has been received with priority %s. Our IT support team has been notified.",
                            incident.getTitle(), incident.getPriority()),
                    NotificationChannel.IN_APP
            );
        }

        // 2. Alert technicians and admins
        List<User> staff = findSupportStaff();
        for (User user : staff) {
            if (incident.getReporter() == null || !user.getId().equals(incident.getReporter().getId())) {
                sendNotification(
                        user,
                        incident,
                        NotificationType.INCIDENT_CREATED,
                        "New Incident: " + incident.getTicketNumber(),
                        String.format("New %s incident submitted: '%s' (Category: %s)",
                                incident.getPriority(), incident.getTitle(),
                                incident.getCategory() != null ? incident.getCategory().getName() : "General"),
                        NotificationChannel.IN_APP
                );
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void notifyIncidentAssigned(Incident incident, User previousAssignee, User newAssignee, User actor) {
        if (incident == null) return;

        String actorName = actor != null ? actor.getUsername() : "System";

        // 1. Notify newly assigned technician
        if (newAssignee != null) {
            sendNotification(
                    newAssignee,
                    incident,
                    NotificationType.INCIDENT_ASSIGNED,
                    "Incident Assigned: " + incident.getTicketNumber(),
                    String.format("Incident '%s' has been assigned to you by %s.", incident.getTitle(), actorName),
                    NotificationChannel.IN_APP
            );
        }

        // 2. Notify previous assignee of reassignment
        if (previousAssignee != null && (newAssignee == null || !previousAssignee.getId().equals(newAssignee.getId()))) {
            sendNotification(
                    previousAssignee,
                    incident,
                    NotificationType.INCIDENT_REASSIGNED,
                    "Incident Reassigned: " + incident.getTicketNumber(),
                    String.format("Incident '%s' has been reassigned to %s by %s.",
                            incident.getTitle(),
                            newAssignee != null ? newAssignee.getUsername() : "Unassigned",
                            actorName),
                    NotificationChannel.IN_APP
            );
        }

        // 3. Notify reporter
        if (incident.getReporter() != null) {
            sendNotification(
                    incident.getReporter(),
                    incident,
                    NotificationType.INCIDENT_ASSIGNED,
                    "Technician Assigned: " + incident.getTicketNumber(),
                    String.format("Technician %s is now assigned to resolve your incident '%s'.",
                            newAssignee != null ? newAssignee.getFullName() : "Support Team",
                            incident.getTitle()),
                    NotificationChannel.IN_APP
            );
        }
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void notifyStatusChanged(Incident incident, IncidentStatus oldStatus, IncidentStatus newStatus, User actor) {
        if (incident == null) return;

        String actorName = actor != null ? actor.getUsername() : "System";

        // Detect resolution and reopening for specific notification types
        NotificationType type = NotificationType.STATUS_CHANGED;
        String titlePrefix = "Status Updated";

        if (newStatus == IncidentStatus.RESOLVED) {
            type = NotificationType.INCIDENT_RESOLVED;
            titlePrefix = "Incident Resolved";
        } else if ((oldStatus == IncidentStatus.RESOLVED || oldStatus == IncidentStatus.CLOSED) &&
                (newStatus == IncidentStatus.OPEN || newStatus == IncidentStatus.IN_PROGRESS)) {
            type = NotificationType.INCIDENT_REOPENED;
            titlePrefix = "Incident Reopened";
        }

        String title = String.format("%s: %s", titlePrefix, incident.getTicketNumber());
        String message = String.format("Incident '%s' transitioned from %s to %s by %s.",
                incident.getTitle(), oldStatus, newStatus, actorName);

        // Notify reporter
        if (incident.getReporter() != null && (actor == null || !incident.getReporter().getId().equals(actor.getId()))) {
            sendNotification(incident.getReporter(), incident, type, title, message, NotificationChannel.IN_APP);
        }

        // Notify assignee if someone else made the update
        if (incident.getAssignee() != null && (actor == null || !incident.getAssignee().getId().equals(actor.getId()))) {
            sendNotification(incident.getAssignee(), incident, type, title, message, NotificationChannel.IN_APP);
        }
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void notifySlaWarning(Incident incident, int elapsedPercent, long remainingMinutes) {
        if (incident == null) return;

        String title = "SLA Warning: " + incident.getTicketNumber();
        String message = String.format("Incident '%s' has reached %d%% of SLA limit (%d minutes remaining).",
                incident.getTitle(), elapsedPercent, Math.max(0, remainingMinutes));

        // Notify assignee
        if (incident.getAssignee() != null) {
            sendNotification(incident.getAssignee(), incident, NotificationType.SLA_WARNING, title, message, NotificationChannel.IN_APP);
        }

        // Notify administrators
        List<User> admins = findAdmins();
        for (User admin : admins) {
            if (incident.getAssignee() == null || !admin.getId().equals(incident.getAssignee().getId())) {
                sendNotification(admin, incident, NotificationType.SLA_WARNING, title, message, NotificationChannel.IN_APP);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void notifySlaBreached(Incident incident) {
        if (incident == null) return;

        String title = "SLA BREACH ALERT: " + incident.getTicketNumber();
        String message = String.format("Incident '%s' has BREACHED its SLA target (%s). Immediate attention required.",
                incident.getTitle(),
                incident.getSlaPolicy() != null ? incident.getSlaPolicy().getName() : "Standard SLA");

        if (incident.getAssignee() != null) {
            sendNotification(incident.getAssignee(), incident, NotificationType.SLA_BREACHED, title, message, NotificationChannel.IN_APP);
        }

        List<User> admins = findAdmins();
        for (User admin : admins) {
            if (incident.getAssignee() == null || !admin.getId().equals(incident.getAssignee().getId())) {
                sendNotification(admin, incident, NotificationType.SLA_BREACHED, title, message, NotificationChannel.IN_APP);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void notifyIncidentEscalated(Incident incident, int level, String reason) {
        if (incident == null) return;

        String title = String.format("Escalation Level %d: %s", level, incident.getTicketNumber());
        String message = String.format("Incident '%s' escalated to Level %d: %s", incident.getTitle(), level, reason);

        if (incident.getAssignee() != null) {
            sendNotification(incident.getAssignee(), incident, NotificationType.ESCALATION_TRIGGERED, title, message, NotificationChannel.IN_APP);
        }

        List<User> admins = findAdmins();
        for (User admin : admins) {
            if (incident.getAssignee() == null || !admin.getId().equals(incident.getAssignee().getId())) {
                sendNotification(admin, incident, NotificationType.ESCALATION_TRIGGERED, title, message, NotificationChannel.IN_APP);
            }
        }
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(String username, Pageable pageable) {
        User user = getAuthenticatedUser(username);
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(NotificationResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getRecentUserNotifications(String username) {
        User user = getAuthenticatedUser(username);
        return notificationRepository.findTop20ByRecipientIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(NotificationResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String username) {
        User user = getAuthenticatedUser(username);
        return notificationRepository.countByRecipientIdAndIsReadFalse(user.getId());
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, String username) {
        User user = getAuthenticatedUser(username);
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + notificationId));

        if (!notification.getRecipient().getId().equals(user.getId())) {
            throw new AccessDeniedException("You are not authorized to view or modify this notification.");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }

        return NotificationResponse.fromEntity(notification);
    }

    @Transactional
    public int markAllAsRead(String username) {
        User user = getAuthenticatedUser(username);
        return notificationRepository.markAllAsReadForRecipient(user.getId(), Instant.now());
    }

    @Transactional
    public int retryPendingNotifications() {
        List<Notification> pending = notificationRepository.findByStatusAndDeliveryAttemptsLessThan(
                NotificationStatus.PENDING_RETRY, 3);

        int successfulRetries = 0;
        for (Notification n : pending) {
            n.setDeliveryAttempts(n.getDeliveryAttempts() + 1);
            NotificationDeliveryChannel channel = channelMap.get(n.getChannel());
            if (channel != null && channel.deliver(n)) {
                n.setStatus(NotificationStatus.DELIVERED);
                n.setErrorMessage(null);
                successfulRetries++;
            } else if (n.getDeliveryAttempts() >= 3) {
                n.setStatus(NotificationStatus.FAILED);
            }
            notificationRepository.save(n);
        }
        return successfulRetries;
    }

    private List<User> findSupportStaff() {
        List<User> staff = new ArrayList<>(userRepository.findByRoleName(RoleName.ROLE_TECHNICIAN));
        staff.addAll(userRepository.findByRoleName(RoleName.ROLE_ADMIN));
        return staff.stream().filter(User::isActive).collect(Collectors.toList());
    }

    private List<User> findAdmins() {
        return userRepository.findByRoleName(RoleName.ROLE_ADMIN).stream()
                .filter(User::isActive)
                .collect(Collectors.toList());
    }

    private User getAuthenticatedUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }
}
