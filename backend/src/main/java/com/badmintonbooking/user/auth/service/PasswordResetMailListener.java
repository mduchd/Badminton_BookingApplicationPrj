package com.badmintonbooking.user.auth.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.*;

@Component
@EnableAsync
public class PasswordResetMailListener {
    private final ObjectProvider<JavaMailSender> mail;
    public PasswordResetMailListener(ObjectProvider<JavaMailSender> mail) { this.mail=mail; }
    @Async
    @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT)
    public void send(PasswordResetMail event) {
        try { mail.getObject().send(event.message()); }
        catch (RuntimeException ex) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Password reset email delivery failed; check SMTP configuration"); }
    }
}
