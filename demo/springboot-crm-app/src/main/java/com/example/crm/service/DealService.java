package com.example.crm.service;

import com.example.crm.model.Deal;
import com.example.crm.model.Customer;
import com.example.crm.repository.DealRepository;
import com.example.crm.repository.CustomerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.util.*;

/**
 * ISSUE: God Class - 複数の責務が混在
 */
@Service
public class DealService {

    private static final Logger logger = LoggerFactory.getLogger(DealService.class);

    @Autowired
    private DealRepository dealRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @PersistenceContext
    private EntityManager entityManager;

    // ISSUE: マジックナンバー
    private static final int MAX_DEALS_PER_PAGE = 100;

    public List<Deal> getAllDeals() {
        return dealRepository.findAll();
    }

    public Deal getDealById(Long id) {
        return dealRepository.findById(id).orElse(null);
    }

    // ISSUE: 長時間トランザクション
    @Transactional
    public Deal createDeal(Deal deal) {
        // ISSUE: ステータスコードがハードコード（マジックストリング）
        if (deal.getStage() == null) {
            deal.setStage("new");
        }

        // ISSUE: 確率の閾値がハードコード
        if (deal.getStage().equals("new")) {
            deal.setProbability(10);
        } else if (deal.getStage().equals("qualified")) {
            deal.setProbability(25);
        } else if (deal.getStage().equals("proposal")) {
            deal.setProbability(50);
        } else if (deal.getStage().equals("negotiation")) {
            deal.setProbability(75);
        } else if (deal.getStage().equals("won")) {
            deal.setProbability(100);
        }

        return dealRepository.save(deal);
    }

    @Transactional
    public Deal updateDeal(Long id, Deal dealData) {
        Deal deal = dealRepository.findById(id).orElse(null);
        if (deal == null) {
            return null;
        }

        deal.setTitle(dealData.getTitle());
        deal.setDescription(dealData.getDescription());
        deal.setAmount(dealData.getAmount());
        deal.setStage(dealData.getStage());
        deal.setExpectedCloseDate(dealData.getExpectedCloseDate());

        // ISSUE: ステージ変更時の確率更新が重複コード
        if (deal.getStage().equals("new")) {
            deal.setProbability(10);
        } else if (deal.getStage().equals("qualified")) {
            deal.setProbability(25);
        } else if (deal.getStage().equals("proposal")) {
            deal.setProbability(50);
        } else if (deal.getStage().equals("negotiation")) {
            deal.setProbability(75);
        } else if (deal.getStage().equals("won")) {
            deal.setProbability(100);
            deal.setActualCloseDate(new Date());
        }

        return dealRepository.save(deal);
    }

    @Transactional
    public void deleteDeal(Long id) {
        dealRepository.deleteById(id);
    }

    // ISSUE: N+1クエリ問題
    public List<Map<String, Object>> getDealsWithCustomerInfo() {
        List<Deal> deals = dealRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Deal deal : deals) {
            Map<String, Object> data = new HashMap<>();
            data.put("deal", deal);
            // ISSUE: 各商談ごとに顧客情報を個別クエリ
            data.put("customer", deal.getCustomer());
            data.put("customerName", deal.getCustomer().getName());
            result.add(data);
        }

        return result;
    }

    // ISSUE: 読み取り専用トランザクションの指定がない
    public Map<String, Object> getPipelineStats() {
        Map<String, Object> stats = new HashMap<>();
        List<Deal> allDeals = dealRepository.findAll();

        // ISSUE: ステージごとにフィルタリング（非効率）
        long newCount = allDeals.stream().filter(d -> "new".equals(d.getStage())).count();
        long qualifiedCount = allDeals.stream().filter(d -> "qualified".equals(d.getStage())).count();
        long proposalCount = allDeals.stream().filter(d -> "proposal".equals(d.getStage())).count();
        long negotiationCount = allDeals.stream().filter(d -> "negotiation".equals(d.getStage())).count();
        long wonCount = allDeals.stream().filter(d -> "won".equals(d.getStage())).count();
        long lostCount = allDeals.stream().filter(d -> "lost".equals(d.getStage())).count();

        stats.put("new", newCount);
        stats.put("qualified", qualifiedCount);
        stats.put("proposal", proposalCount);
        stats.put("negotiation", negotiationCount);
        stats.put("won", wonCount);
        stats.put("lost", lostCount);

        // 金額集計
        BigDecimal totalPipeline = allDeals.stream()
                .filter(d -> !"won".equals(d.getStage()) && !"lost".equals(d.getStage()))
                .map(Deal::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal wonAmount = allDeals.stream()
                .filter(d -> "won".equals(d.getStage()))
                .map(Deal::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        stats.put("totalPipeline", totalPipeline);
        stats.put("wonAmount", wonAmount);

        return stats;
    }

    // ISSUE: バリデーションの重複コード（CustomerServiceと同様のロジック）
    public boolean validateDealData(Deal deal) {
        if (deal.getTitle() == null || deal.getTitle().trim().isEmpty()) {
            return false;
        }
        if (deal.getAmount() == null || deal.getAmount().compareTo(BigDecimal.ZERO) < 0) {
            return false;
        }
        // ISSUE: マジックナンバー
        if (deal.getTitle().length() > 200) {
            return false;
        }
        return true;
    }

    // ISSUE: 例外処理の不備
    public List<Deal> importDealsFromCsv(String csvData) {
        List<Deal> deals = new ArrayList<>();

        try {
            String[] lines = csvData.split("\n");
            for (int i = 1; i < lines.length; i++) {
                String[] fields = lines[i].split(",");
                Deal deal = new Deal();
                deal.setTitle(fields[0]);
                deal.setAmount(new BigDecimal(fields[1]));
                deal.setStage(fields[2]);

                // ISSUE: 顧客IDの検証なし
                Long customerId = Long.parseLong(fields[3]);
                Customer customer = customerRepository.findById(customerId).orElse(null);
                deal.setCustomer(customer);

                deals.add(deal);
            }
        } catch (Exception e) {
            // ISSUE: 例外を握りつぶし、空のリストを返す
            logger.error("Import failed: " + e.getMessage());
            return Collections.emptyList();
        }

        return dealRepository.saveAll(deals);
    }

    // ISSUE: キャッシュ未使用 - 頻繁にアクセスされるデータを毎回DBから取得
    public List<String> getAvailableStages() {
        return Arrays.asList("new", "qualified", "proposal", "negotiation", "won", "lost");
    }

    // ISSUE: 機密情報をログに出力
    @Transactional
    public void processDealPayment(Long dealId, String creditCardNumber) {
        Deal deal = dealRepository.findById(dealId).orElse(null);
        if (deal == null) {
            return;
        }

        // ISSUE: クレジットカード番号をログに出力
        logger.info("Processing payment for deal " + dealId + " with card: " + creditCardNumber);

        deal.setStage("won");
        deal.setActualCloseDate(new Date());
        dealRepository.save(deal);
    }
}
