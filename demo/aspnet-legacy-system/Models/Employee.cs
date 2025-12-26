using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace LegacySystem.Models
{
    public class Employee
    {
        public int Id { get; set; }

        // 問題1: バリデーション不足 (Medium Security)
        public string Name { get; set; }

        public string Email { get; set; }

        // 問題2: パスワードを平文で保存 (Critical Security)
        public string Password { get; set; }

        public string Department { get; set; }

        public string Position { get; set; }

        // 問題3: 給与情報が暗号化されていない (High Security)
        public decimal Salary { get; set; }

        // 問題4: SSNが平文保存 (Critical Security)
        public string SocialSecurityNumber { get; set; }

        public DateTime HireDate { get; set; }

        // 問題5: 論理削除フラグだが、クエリ時にフィルタされていない (Medium Code Quality)
        public bool IsDeleted { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        // ナビゲーションプロパティ
        public virtual ICollection<Attendance> Attendances { get; set; }
        public virtual ICollection<Expense> Expenses { get; set; }
    }
}
