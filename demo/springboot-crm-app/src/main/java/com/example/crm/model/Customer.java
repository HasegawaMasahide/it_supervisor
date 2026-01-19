package com.example.crm.model;

import lombok.Data;
import javax.persistence.*;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "customers")
@Data
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;
    private String phone;
    private String company;
    private String address;
    private String industry;
    private String status;

    // ISSUE: 機密情報をエンティティに含む
    private String creditCardNumber;
    private String taxId;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // ISSUE: FetchType.LAZYで関連エンティティをトランザクション外でアクセスするとエラー
    @OneToMany(mappedBy = "customer", fetch = FetchType.LAZY)
    private List<Deal> deals;

    @OneToMany(mappedBy = "customer", fetch = FetchType.LAZY)
    private List<Activity> activities;

    // ISSUE: 非推奨のDate型を使用
    @PrePersist
    protected void onCreate() {
        createdAt = new Date();
        updatedAt = new Date();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = new Date();
    }
}
