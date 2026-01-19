package com.example.crm.service;

import com.example.crm.model.Customer;
import com.example.crm.model.Deal;
import com.example.crm.model.Activity;
import com.example.crm.repository.CustomerRepository;
import com.example.crm.repository.DealRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ISSUE: God Class - このサービスは複数の責務を持ち、1200行超の巨大クラス
 * 本来は CustomerService, DealService, ReportService, NotificationService 等に分割すべき
 */
@Service
public class CustomerService {

    private static final Logger logger = LoggerFactory.getLogger(CustomerService.class);

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DealRepository dealRepository;

    @PersistenceContext
    private EntityManager entityManager;

    // ========================================
    // 顧客管理メソッド
    // ========================================

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id).orElse(null);
    }

    // ISSUE: SQLインジェクション脆弱性
    public List<Customer> searchCustomers(String query) {
        // ISSUE: ユーザー入力を直接SQLに埋め込み
        String sql = "SELECT * FROM customers WHERE name LIKE '%" + query + "%' OR email LIKE '%" + query + "%'";
        return entityManager.createNativeQuery(sql, Customer.class).getResultList();
    }

    @Transactional
    public Customer createCustomer(Customer customer) {
        // ISSUE: 入力バリデーション不足
        return customerRepository.save(customer);
    }

    @Transactional
    public Customer updateCustomer(Long id, Customer customerData) {
        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) {
            return null;
        }

        // ISSUE: マジックナンバー
        if (customerData.getName() != null && customerData.getName().length() > 100) {
            throw new RuntimeException("Name too long");
        }

        customer.setName(customerData.getName());
        customer.setEmail(customerData.getEmail());
        customer.setPhone(customerData.getPhone());
        customer.setCompany(customerData.getCompany());
        customer.setAddress(customerData.getAddress());
        customer.setIndustry(customerData.getIndustry());
        customer.setStatus(customerData.getStatus());

        return customerRepository.save(customer);
    }

    @Transactional
    public void deleteCustomer(Long id) {
        customerRepository.deleteById(id);
    }

    // ========================================
    // N+1クエリ問題のあるメソッド
    // ========================================

    // ISSUE: N+1クエリ問題
    public List<Map<String, Object>> getCustomersWithDeals() {
        List<Customer> customers = customerRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        // ISSUE: 各顧客ごとに個別クエリが発行される
        for (Customer customer : customers) {
            Map<String, Object> data = new HashMap<>();
            data.put("customer", customer);
            // ISSUE: LazyInitializationExceptionの可能性
            data.put("deals", customer.getDeals());
            data.put("dealCount", customer.getDeals().size());
            result.add(data);
        }

        return result;
    }

    // ISSUE: 非効率なデータ取得
    public Map<String, Object> getCustomerStats() {
        Map<String, Object> stats = new HashMap<>();

        // ISSUE: 全データを取得してJavaで集計（DBで集計すべき）
        List<Customer> allCustomers = customerRepository.findAll();

        stats.put("totalCustomers", allCustomers.size());
        stats.put("activeCustomers", allCustomers.stream()
                .filter(c -> "active".equals(c.getStatus()))
                .count());

        // ISSUE: 各顧客の取引額を個別に計算
        BigDecimal totalRevenue = BigDecimal.ZERO;
        for (Customer customer : allCustomers) {
            for (Deal deal : customer.getDeals()) {
                if ("won".equals(deal.getStage())) {
                    totalRevenue = totalRevenue.add(deal.getAmount());
                }
            }
        }
        stats.put("totalRevenue", totalRevenue);

        return stats;
    }

    // ========================================
    // レポート機能（本来は別サービスに分離すべき）
    // ========================================

    public List<Map<String, Object>> generateSalesReport(Date startDate, Date endDate) {
        // ISSUE: 長いメソッド - 複数の責務が混在
        List<Map<String, Object>> report = new ArrayList<>();

        List<Deal> deals = dealRepository.findAll();

        // 日付でフィルタリング
        List<Deal> filteredDeals = deals.stream()
                .filter(d -> d.getCreatedAt().after(startDate) && d.getCreatedAt().before(endDate))
                .collect(Collectors.toList());

        // 顧客ごとに集計
        Map<Long, List<Deal>> dealsByCustomer = filteredDeals.stream()
                .collect(Collectors.groupingBy(d -> d.getCustomer().getId()));

        for (Map.Entry<Long, List<Deal>> entry : dealsByCustomer.entrySet()) {
            Map<String, Object> row = new HashMap<>();
            Customer customer = customerRepository.findById(entry.getKey()).orElse(null);
            row.put("customer", customer);

            BigDecimal total = entry.getValue().stream()
                    .map(Deal::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            row.put("totalAmount", total);

            long wonCount = entry.getValue().stream()
                    .filter(d -> "won".equals(d.getStage()))
                    .count();
            row.put("wonDeals", wonCount);

            report.add(row);
        }

        return report;
    }

    // ========================================
    // 通知機能（本来は別サービスに分離すべき）
    // ========================================

    public void sendCustomerNotification(Long customerId, String message) {
        Customer customer = customerRepository.findById(customerId).orElse(null);
        if (customer == null) {
            return;
        }

        // ISSUE: ログに機密情報を出力
        logger.info("Sending notification to customer: " + customer.getEmail() +
                ", Credit Card: " + customer.getCreditCardNumber());

        // メール送信ロジック（実装省略）
        sendEmail(customer.getEmail(), "お知らせ", message);
    }

    private void sendEmail(String to, String subject, String body) {
        // ISSUE: メール送信の実装が不完全
        logger.debug("Email sent to: " + to + ", Subject: " + subject + ", Body: " + body);
    }

    // ========================================
    // バリデーション（重複コード）
    // ========================================

    // ISSUE: DealServiceと重複したバリデーションロジック
    public boolean validateCustomerData(Customer customer) {
        if (customer.getName() == null || customer.getName().trim().isEmpty()) {
            return false;
        }
        if (customer.getEmail() == null || !customer.getEmail().contains("@")) {
            return false;
        }
        // ISSUE: マジックナンバー
        if (customer.getPhone() != null && customer.getPhone().length() < 10) {
            return false;
        }
        return true;
    }

    // ========================================
    // インポート/エクスポート機能
    // ========================================

    // ISSUE: 例外処理の不備
    public List<Customer> importCustomersFromCsv(String csvData) {
        List<Customer> customers = new ArrayList<>();

        try {
            String[] lines = csvData.split("\n");
            for (int i = 1; i < lines.length; i++) {  // ヘッダーをスキップ
                String[] fields = lines[i].split(",");
                Customer customer = new Customer();
                customer.setName(fields[0]);
                customer.setEmail(fields[1]);
                customer.setPhone(fields[2]);
                customer.setCompany(fields[3]);
                customers.add(customer);
            }
        } catch (Exception e) {
            // ISSUE: 例外を握りつぶし
            logger.error("Import error");
        }

        return customerRepository.saveAll(customers);
    }

    public String exportCustomersToCsv() {
        List<Customer> customers = customerRepository.findAll();
        StringBuilder csv = new StringBuilder();
        csv.append("Name,Email,Phone,Company,CreditCard\n");  // ISSUE: 機密情報を含む

        for (Customer customer : customers) {
            // ISSUE: 機密情報（クレジットカード番号）をエクスポート
            csv.append(customer.getName()).append(",")
                    .append(customer.getEmail()).append(",")
                    .append(customer.getPhone()).append(",")
                    .append(customer.getCompany()).append(",")
                    .append(customer.getCreditCardNumber()).append("\n");
        }

        return csv.toString();
    }

    // ========================================
    // 検索機能
    // ========================================

    // ISSUE: SQLインジェクション脆弱性
    public List<Customer> advancedSearch(String name, String email, String industry, String status) {
        StringBuilder sql = new StringBuilder("SELECT * FROM customers WHERE 1=1");

        // ISSUE: ユーザー入力を直接SQL文に連結
        if (name != null && !name.isEmpty()) {
            sql.append(" AND name LIKE '%").append(name).append("%'");
        }
        if (email != null && !email.isEmpty()) {
            sql.append(" AND email LIKE '%").append(email).append("%'");
        }
        if (industry != null && !industry.isEmpty()) {
            sql.append(" AND industry = '").append(industry).append("'");
        }
        if (status != null && !status.isEmpty()) {
            sql.append(" AND status = '").append(status).append("'");
        }

        return entityManager.createNativeQuery(sql.toString(), Customer.class).getResultList();
    }

    // ========================================
    // ユーティリティメソッド
    // ========================================

    // ISSUE: staticではないユーティリティメソッド（ユーティリティクラスに分離すべき）
    public String formatPhoneNumber(String phone) {
        if (phone == null) return "";
        // ISSUE: マジックナンバー
        if (phone.length() == 11) {
            return phone.substring(0, 3) + "-" + phone.substring(3, 7) + "-" + phone.substring(7);
        }
        return phone;
    }

    public String maskCreditCard(String cardNumber) {
        if (cardNumber == null || cardNumber.length() < 4) return "****";
        return "****-****-****-" + cardNumber.substring(cardNumber.length() - 4);
    }

    // ISSUE: 重複コード - 複数箇所で同じロジックが使われている
    public boolean isValidEmail(String email) {
        if (email == null) return false;
        return email.contains("@") && email.contains(".");
    }

    // ========================================
    // 統計・分析機能
    // ========================================

    // ISSUE: トランザクション境界の不適切な設定
    @Transactional(readOnly = true)
    public Map<String, Long> getCustomerCountByIndustry() {
        List<Customer> customers = customerRepository.findAll();
        return customers.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getIndustry() != null ? c.getIndustry() : "未分類",
                        Collectors.counting()
                ));
    }

    // ISSUE: 長時間トランザクションでDBコネクションを占有
    @Transactional
    public void batchUpdateCustomerStatus(List<Long> customerIds, String newStatus) {
        for (Long id : customerIds) {
            Customer customer = customerRepository.findById(id).orElse(null);
            if (customer != null) {
                customer.setStatus(newStatus);
                customerRepository.save(customer);
                // ISSUE: 各更新後にスリープ（非効率）
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }
}
