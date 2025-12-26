using System;

namespace LegacySystem.Models
{
    public class Expense
    {
        public int Id { get; set; }

        public int EmployeeId { get; set; }

        public DateTime Date { get; set; }

        public string Category { get; set; }

        public decimal Amount { get; set; }

        // 問題: 説明にXSS対策なし (High Security)
        public string Description { get; set; }

        public string Status { get; set; } // Pending, Approved, Rejected

        public int? ApproverId { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public virtual Employee Employee { get; set; }
    }
}
