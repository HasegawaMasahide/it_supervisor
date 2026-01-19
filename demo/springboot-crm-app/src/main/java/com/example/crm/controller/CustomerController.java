package com.example.crm.controller;

import com.example.crm.model.Customer;
import com.example.crm.service.CustomerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/customers")
public class CustomerController {

    private static final Logger logger = LoggerFactory.getLogger(CustomerController.class);

    @Autowired
    private CustomerService customerService;

    @GetMapping
    public String listCustomers(Model model) {
        List<Customer> customers = customerService.getAllCustomers();
        model.addAttribute("customers", customers);
        return "customer/list";
    }

    @GetMapping("/{id}")
    public String getCustomer(@PathVariable Long id, Model model) {
        Customer customer = customerService.getCustomerById(id);
        model.addAttribute("customer", customer);
        return "customer/detail";
    }

    @GetMapping("/search")
    public String searchCustomers(@RequestParam String query, Model model) {
        // ISSUE: SQLインジェクション脆弱性（サービス層に渡される）
        List<Customer> customers = customerService.searchCustomers(query);
        model.addAttribute("customers", customers);
        model.addAttribute("query", query);
        return "customer/list";
    }

    @PostMapping
    @ResponseBody
    public ResponseEntity<Customer> createCustomer(@RequestBody Customer customer) {
        // ISSUE: ログに機密情報を出力
        logger.info("Creating customer: " + customer.getName() +
                   ", Email: " + customer.getEmail() +
                   ", CreditCard: " + customer.getCreditCardNumber());

        Customer created = customerService.createCustomer(customer);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Customer> updateCustomer(@PathVariable Long id, @RequestBody Customer customer) {
        Customer updated = customerService.updateCustomer(id, customer);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok().build();
    }

    // ISSUE: LazyInitializationException - トランザクション外でLazy関連にアクセス
    @GetMapping("/{id}/deals")
    public String getCustomerDeals(@PathVariable Long id, Model model) {
        Customer customer = customerService.getCustomerById(id);
        model.addAttribute("customer", customer);
        // ISSUE: トランザクション外でLazyロードされた関連にアクセス
        model.addAttribute("deals", customer.getDeals());
        return "customer/deals";
    }

    // ISSUE: レイヤー間の責務混在 - ControllerでビジネスロジックやDB操作を直接実行
    @GetMapping("/stats")
    @ResponseBody
    public ResponseEntity<?> getCustomerStats() {
        // ISSUE: Controllerでビジネスロジックを実行（Service層を通すべき）
        List<Customer> allCustomers = customerService.getAllCustomers();

        long totalCount = allCustomers.size();
        long activeCount = allCustomers.stream()
                .filter(c -> "active".equals(c.getStatus()))
                .count();

        // ISSUE: 機密情報を含む統計を返す
        return ResponseEntity.ok(java.util.Map.of(
            "total", totalCount,
            "active", activeCount,
            "customers", allCustomers  // ISSUE: 全顧客データ（機密情報含む）を返す
        ));
    }

    // ISSUE: エクスポート機能で機密情報が漏洩
    @GetMapping("/export")
    @ResponseBody
    public ResponseEntity<String> exportCustomers() {
        String csvData = customerService.exportCustomersToCsv();
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=customers.csv")
                .body(csvData);
    }
}
