package com.example.crm.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    // ISSUE: 機密情報のハードコーディング
    private static final String SMTP_USERNAME = "crm-system@company.com";
    private static final String SMTP_PASSWORD = "MailP@ssw0rd!";
    private static final String API_KEY = "SG.FAKE_SENDGRID_API_KEY_12345";

    public void sendEmail(String to, String subject, String body) {
        // ISSUE: ログに機密情報を出力
        logger.info("Sending email to: " + to);
        logger.debug("Using SMTP credentials: " + SMTP_USERNAME + " / " + SMTP_PASSWORD);
        logger.debug("SendGrid API Key: " + API_KEY);

        // メール送信の実装（省略）
        // ISSUE: 例外処理なし
    }

    public void sendWelcomeEmail(String email, String password) {
        // ISSUE: パスワードをログに出力
        logger.info("Sending welcome email to " + email + " with password: " + password);

        String body = "ようこそ！\n\nログイン情報:\nEmail: " + email + "\nPassword: " + password;
        sendEmail(email, "ようこそ CRM システムへ", body);
    }

    public void sendPasswordResetEmail(String email, String resetToken) {
        // ISSUE: リセットトークンをログに出力
        logger.info("Password reset requested for " + email + ", token: " + resetToken);

        String body = "パスワードリセットリンク: https://crm.example.com/reset?token=" + resetToken;
        sendEmail(email, "パスワードリセット", body);
    }
}
