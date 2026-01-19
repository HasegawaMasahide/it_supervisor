package com.example.crm.service;

import org.springframework.stereotype.Service;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.Arrays;
import java.util.List;

/**
 * ISSUE: キャッシュ未使用 - マスターデータを毎回DBから取得
 */
@Service
public class MasterDataService {

    @PersistenceContext
    private EntityManager entityManager;

    // ISSUE: キャッシュ未使用 - 頻繁にアクセスされるデータを毎回取得
    public List<String> getIndustries() {
        // 毎回DBクエリを発行
        return entityManager.createNativeQuery("SELECT DISTINCT industry FROM customers")
                .getResultList();
    }

    // ISSUE: キャッシュ未使用
    public List<String> getCustomerStatuses() {
        return entityManager.createNativeQuery("SELECT DISTINCT status FROM customers")
                .getResultList();
    }

    // ISSUE: キャッシュ未使用
    public List<String> getDealStages() {
        return entityManager.createNativeQuery("SELECT DISTINCT stage FROM deals")
                .getResultList();
    }

    // ISSUE: ハードコードされたマスターデータ
    public List<String> getActivityTypes() {
        return Arrays.asList("call", "email", "meeting", "note", "task");
    }

    // ISSUE: 設定値がハードコード
    public int getMaxCustomersPerPage() {
        return 50;  // ISSUE: マジックナンバー
    }

    public int getMaxDealsPerPage() {
        return 100;  // ISSUE: マジックナンバー
    }

    public int getSessionTimeoutMinutes() {
        return 30;  // ISSUE: マジックナンバー
    }
}
