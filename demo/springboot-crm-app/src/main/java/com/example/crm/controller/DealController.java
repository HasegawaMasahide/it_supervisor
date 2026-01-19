package com.example.crm.controller;

import com.example.crm.model.Deal;
import com.example.crm.service.DealService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/deals")
public class DealController {

    @Autowired
    private DealService dealService;

    @GetMapping
    public String listDeals(Model model) {
        List<Deal> deals = dealService.getAllDeals();
        model.addAttribute("deals", deals);
        return "deal/list";
    }

    @GetMapping("/{id}")
    public String getDeal(@PathVariable Long id, Model model) {
        Deal deal = dealService.getDealById(id);
        model.addAttribute("deal", deal);
        return "deal/detail";
    }

    @PostMapping
    @ResponseBody
    public ResponseEntity<Deal> createDeal(@RequestBody Deal deal) {
        Deal created = dealService.createDeal(deal);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Deal> updateDeal(@PathVariable Long id, @RequestBody Deal deal) {
        Deal updated = dealService.updateDeal(id, deal);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Void> deleteDeal(@PathVariable Long id) {
        dealService.deleteDeal(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/pipeline")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getPipelineStats() {
        return ResponseEntity.ok(dealService.getPipelineStats());
    }
}
