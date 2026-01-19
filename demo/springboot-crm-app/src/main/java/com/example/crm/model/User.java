package com.example.crm.model;

import lombok.Data;
import javax.persistence.*;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String email;

    // ISSUE: パスワードが平文で保存
    private String password;

    private String role;
    private boolean enabled;
}
