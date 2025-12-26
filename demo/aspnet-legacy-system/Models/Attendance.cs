using System;

namespace LegacySystem.Models
{
    public class Attendance
    {
        public int Id { get; set; }

        public int EmployeeId { get; set; }

        public DateTime Date { get; set; }

        public DateTime? CheckIn { get; set; }

        public DateTime? CheckOut { get; set; }

        // 問題: バリデーションなし（負の値も許容） (Low Code Quality)
        public decimal WorkHours { get; set; }

        public string Notes { get; set; }

        public virtual Employee Employee { get; set; }
    }
}
