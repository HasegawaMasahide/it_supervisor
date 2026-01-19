package com.example.crm.repository;

import com.example.crm.model.Deal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DealRepository extends JpaRepository<Deal, Long> {

    // ISSUE: N+1クエリ問題 - customerを個別にフェッチ
    List<Deal> findByStage(String stage);

    // ISSUE: select_related/prefetch_related未使用
    @Query("SELECT d FROM Deal d")
    List<Deal> findAllDeals();

    List<Deal> findByCustomerId(Long customerId);

    // ISSUE: 大量データを一括取得
    @Query("SELECT d FROM Deal d ORDER BY d.createdAt DESC")
    List<Deal> findAllOrderByCreatedAtDesc();
}
