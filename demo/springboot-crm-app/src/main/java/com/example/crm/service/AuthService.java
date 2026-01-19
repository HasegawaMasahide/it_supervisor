package com.example.crm.service;

import com.example.crm.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.List;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @PersistenceContext
    private EntityManager entityManager;

    // ISSUE: ログイン時にパスワードをログ出力
    public User authenticate(String username, String password) {
        // ISSUE: ログに機密情報（パスワード）を出力
        logger.info("Login attempt - Username: " + username + ", Password: " + password);

        // ISSUE: SQLインジェクション脆弱性
        String sql = "SELECT * FROM users WHERE username = '" + username +
                    "' AND password = '" + password + "'";

        List<User> users = entityManager.createNativeQuery(sql, User.class).getResultList();

        if (users.isEmpty()) {
            // ISSUE: ユーザー存在の有無を推測可能なログ
            logger.warn("Login failed for user: " + username);
            return null;
        }

        User user = users.get(0);
        // ISSUE: 成功時もパスワードをログ出力
        logger.info("Login successful - User: " + user.getUsername() +
                   ", Password: " + user.getPassword() +
                   ", Role: " + user.getRole());

        return user;
    }

    // ISSUE: パスワードを平文で保存
    public User createUser(String username, String email, String password, String role) {
        // ISSUE: パスワードをログに出力
        logger.info("Creating user: " + username + " with password: " + password);

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(password);  // ISSUE: 平文保存
        user.setRole(role);
        user.setEnabled(true);

        entityManager.persist(user);
        return user;
    }

    // ISSUE: パスワード変更時も平文
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        // ISSUE: パスワードをログに出力
        logger.info("Password change - User ID: " + userId +
                   ", Old: " + oldPassword + ", New: " + newPassword);

        User user = entityManager.find(User.class, userId);
        if (user != null && user.getPassword().equals(oldPassword)) {
            user.setPassword(newPassword);  // ISSUE: 平文保存
            entityManager.merge(user);
        }
    }
}
