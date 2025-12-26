using Microsoft.EntityFrameworkCore;
using LegacySystem.Models;

namespace LegacySystem.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Employee> Employees { get; set; }
        public DbSet<Attendance> Attendances { get; set; }
        public DbSet<Expense> Expenses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 問題1: インデックスの欠如 (High Performance)
            // EmailやDepartmentにインデックスを設定していない

            // 問題2: カスケード削除の設定不足 (Medium Code Quality)
            // デフォルトのCascadeのまま
        }
    }
}
