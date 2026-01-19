package com.example.crm.repository;

import com.example.crm.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    List<Customer> findByStatus(String status);

    List<Customer> findByIndustry(String industry);

    // ISSUE: N+1クエリ問題 - dealsを個別にフェッチ
    @Query("SELECT c FROM Customer c")
    List<Customer> findAllCustomers();

    // ISSUE: SQLインジェクション脆弱性 - 文字列連結によるNative Query
    // 以下のメソッドは実装クラスで定義（インターフェースでは宣言のみ）
}

// ISSUE: カスタム実装クラス
@Repository
class CustomerRepositoryImpl {

    @PersistenceContext
    private EntityManager entityManager;

    // ISSUE: SQLインジェクション脆弱性
    @SuppressWarnings("unchecked")
    public List<Customer> searchByName(String name) {
        // ISSUE: 文字列連結によるSQL組み立て - SQLインジェクションに脆弱
        String sql = "SELECT * FROM customers WHERE name LIKE '%" + name + "%'";
        return entityManager.createNativeQuery(sql, Customer.class).getResultList();
    }

    // ISSUE: SQLインジェクション脆弱性
    @SuppressWarnings("unchecked")
    public List<Customer> searchByMultipleFields(String name, String email, String company) {
        // ISSUE: ユーザー入力を直接SQL文に連結
        StringBuilder sql = new StringBuilder("SELECT * FROM customers WHERE 1=1");

        if (name != null && !name.isEmpty()) {
            sql.append(" AND name LIKE '%").append(name).append("%'");
        }
        if (email != null && !email.isEmpty()) {
            sql.append(" AND email LIKE '%").append(email).append("%'");
        }
        if (company != null && !company.isEmpty()) {
            sql.append(" AND company LIKE '%").append(company).append("%'");
        }

        return entityManager.createNativeQuery(sql.toString(), Customer.class).getResultList();
    }

    // ISSUE: IDベースのSQLインジェクション
    public Customer findByIdUnsafe(String id) {
        // ISSUE: IDも文字列連結で危険
        String sql = "SELECT * FROM customers WHERE id = " + id;
        List<Customer> results = entityManager.createNativeQuery(sql, Customer.class).getResultList();
        return results.isEmpty() ? null : results.get(0);
    }
}
