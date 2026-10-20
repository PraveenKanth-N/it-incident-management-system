package com.incident.system.service;

import com.incident.system.dto.NotificationResponse;
import com.incident.system.entity.*;
import com.incident.system.repository.NotificationRepository;
import com.incident.system.repository.UserRepository;
import com.incident.system.service.notification.NotificationDeliveryChannel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationDeliveryChannel inAppChannel;
    @Mock
    private NotificationDeliveryChannel emailChannel;

    private NotificationService notificationService;

    private User recipient;
    private User otherUser;
    private Incident incident;

    @BeforeEach
    void setUp() {
        when(inAppChannel.getChannel()).thenReturn(NotificationChannel.IN_APP);
        when(emailChannel.getChannel()).thenReturn(NotificationChannel.EMAIL);

        notificationService = new NotificationService(
                notificationRepository,
                userRepository,
                List.of(inAppChannel, emailChannel)
        );

        recipient = User.builder().id(10L).username("test.user").email("test@example.com").build();
        otherUser = User.builder().id(20L).username("other.user").email("other@example.com").build();

        incident = Incident.builder()
                .id(100L)
                .ticketNumber("INC-TEST-01")
                .title("Network outage")
                .priority(Priority.HIGH)
                .status(IncidentStatus.OPEN)
                .reporter(recipient)
                .build();
    }

    @Test
    @DisplayName("Send Notification - Successfully creates and delivers notification via IN_APP channel")
    void sendNotificationDeliversSuccessfully() {
        when(inAppChannel.deliver(any())).thenReturn(true);
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Notification result = notificationService.sendNotification(
                recipient,
                incident,
                NotificationType.INCIDENT_CREATED,
                "Ticket Created",
                "Your ticket was created",
                NotificationChannel.IN_APP
        );

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(NotificationStatus.DELIVERED);
        assertThat(result.getRecipient()).isEqualTo(recipient);
        verify(inAppChannel).deliver(any());
        verify(notificationRepository, atLeastOnce()).save(any());
    }

    @Test
    @DisplayName("Delivery Failure & Retry - Transient failure sets PENDING_RETRY and succeeds on retry")
    void transientFailureSetsPendingRetryAndSucceedsOnRetry() {
        // Initial delivery fails
        when(emailChannel.deliver(any())).thenReturn(false);
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Notification failedNotif = notificationService.sendNotification(
                recipient,
                incident,
                NotificationType.SLA_BREACHED,
                "Breach Alert",
                "Breach detected",
                NotificationChannel.EMAIL
        );

        assertThat(failedNotif.getStatus()).isEqualTo(NotificationStatus.PENDING_RETRY);

        // Retry run
        when(notificationRepository.findByStatusAndDeliveryAttemptsLessThan(eq(NotificationStatus.PENDING_RETRY), eq(3)))
                .thenReturn(List.of(failedNotif));
        when(emailChannel.deliver(failedNotif)).thenReturn(true); // retry succeeds

        int retried = notificationService.retryPendingNotifications();

        assertThat(retried).isEqualTo(1);
        assertThat(failedNotif.getStatus()).isEqualTo(NotificationStatus.DELIVERED);
    }

    @Test
    @DisplayName("Mark as Read - Updates read status and sets readAt timestamp")
    void markAsReadUpdatesStatusAndTimestamp() {
        Notification notif = Notification.builder()
                .id(55L)
                .recipient(recipient)
                .incident(incident)
                .title("Update")
                .message("Status changed")
                .isRead(false)
                .createdAt(Instant.now().minusSeconds(60))
                .build();

        when(userRepository.findByUsername("test.user")).thenReturn(Optional.of(recipient));
        when(notificationRepository.findById(55L)).thenReturn(Optional.of(notif));
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        NotificationResponse response = notificationService.markAsRead(55L, "test.user");

        assertThat(response.isRead()).isTrue();
        assertThat(response.getReadAt()).isNotNull();
        verify(notificationRepository).save(notif);
    }

    @Test
    @DisplayName("Authorization - User cannot mark another user's notification as read")
    void userCannotMarkOthersNotificationAsRead() {
        Notification notif = Notification.builder()
                .id(55L)
                .recipient(recipient) // owned by recipient (id 10)
                .build();

        when(userRepository.findByUsername("other.user")).thenReturn(Optional.of(otherUser)); // id 20
        when(notificationRepository.findById(55L)).thenReturn(Optional.of(notif));

        assertThatThrownBy(() -> notificationService.markAsRead(55L, "other.user"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("not authorized");

        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Mark All as Read - Marks all unread notifications for authenticated user")
    void markAllAsReadForUser() {
        when(userRepository.findByUsername("test.user")).thenReturn(Optional.of(recipient));
        when(notificationRepository.markAllAsReadForRecipient(eq(10L), any())).thenReturn(4);

        int marked = notificationService.markAllAsRead("test.user");

        assertThat(marked).isEqualTo(4);
        verify(notificationRepository).markAllAsReadForRecipient(eq(10L), any());
    }

    @Test
    @DisplayName("Unread Count - Returns correct count of unread notifications")
    void returnsUnreadCount() {
        when(userRepository.findByUsername("test.user")).thenReturn(Optional.of(recipient));
        when(notificationRepository.countByRecipientIdAndIsReadFalse(10L)).thenReturn(3L);

        long count = notificationService.getUnreadCount("test.user");

        assertThat(count).isEqualTo(3L);
    }

    @Test
    @DisplayName("User Notifications - Paged response returned in descending order")
    void returnsPagedNotifications() {
        Pageable pageable = PageRequest.of(0, 10);
        Notification n1 = Notification.builder().id(1L).recipient(recipient).incident(incident).title("N1").message("M1").build();
        Page<Notification> page = new PageImpl<>(List.of(n1), pageable, 1);

        when(userRepository.findByUsername("test.user")).thenReturn(Optional.of(recipient));
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(10L, pageable)).thenReturn(page);

        Page<NotificationResponse> result = notificationService.getUserNotifications("test.user", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("N1");
    }
}
