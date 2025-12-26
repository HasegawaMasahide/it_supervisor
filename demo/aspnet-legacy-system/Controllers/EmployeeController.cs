using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegacySystem.Data;
using LegacySystem.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;

namespace LegacySystem.Controllers
{
    public class EmployeeController : Controller
    {
        // 問題1: DbContextをフィールドで保持 (High Code Quality)
        // Singletonで登録されているため、スレッドセーフでない
        private readonly ApplicationDbContext _context;

        // 問題2: グローバル変数の使用 (Medium Code Quality)
        private static List<Employee> cachedEmployees = new List<Employee>();

        public EmployeeController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 問題3: SQLインジェクション脆弱性 (Critical Security)
        public IActionResult Search(string name, string department)
        {
            var connectionString = Startup.GlobalConfig.GetConnectionString("DefaultConnection");

            using (var connection = new SqlConnection(connectionString))
            {
                connection.Open();

                // パラメータ化されていないSQL
                var sql = $"SELECT * FROM Employees WHERE Name LIKE '%{name}%' AND Department = '{department}'";

                using (var command = new SqlCommand(sql, connection))
                {
                    using (var reader = command.ExecuteReader())
                    {
                        var employees = new List<Employee>();

                        while (reader.Read())
                        {
                            // 問題4: マジックナンバー（カラムインデックス） (Low Code Quality)
                            employees.Add(new Employee
                            {
                                Id = reader.GetInt32(0),
                                Name = reader.GetString(1),
                                Email = reader.GetString(2),
                                Password = reader.GetString(3), // パスワードも取得
                                Department = reader.GetString(4)
                            });
                        }

                        return View("List", employees);
                    }
                }
            }
        }

        // 問題5: async/await未使用（同期的なDB操作） (High Performance)
        // 問題6: N+1クエリ (High Performance)
        public IActionResult Index()
        {
            // Include()なしでナビゲーションプロパティにアクセス
            var employees = _context.Employees.ToList();

            // テンプレート内でAttendancesにアクセスするとN+1が発生
            return View(employees);
        }

        // 問題7: 認証・認可チェック不足 (High Security)
        // 誰でも従業員を作成可能
        [HttpPost]
        public IActionResult Create(Employee employee)
        {
            // 問題8: ModelStateのバリデーションをスキップ (High Security)
            // 問題9: パスワードを平文で保存 (Critical Security)
            employee.CreatedAt = DateTime.Now;
            employee.IsDeleted = false;

            _context.Employees.Add(employee);
            _context.SaveChanges();

            return RedirectToAction("Index");
        }

        // 問題10: 巨大なメソッド、循環的複雑度が高い (High Code Quality)
        [HttpPost]
        public IActionResult Update(int id, Employee employee)
        {
            var existing = _context.Employees.Find(id);

            if (existing == null)
            {
                return NotFound();
            }

            // 問題11: 過度なif-else（循環的複雑度） (High Code Quality)
            if (employee.Name != null && employee.Name != "")
            {
                if (employee.Name.Length > 3)
                {
                    if (employee.Name.Length < 100)
                    {
                        existing.Name = employee.Name;
                    }
                    else
                    {
                        ViewBag.Error = "Name too long";
                        return View(existing);
                    }
                }
                else
                {
                    ViewBag.Error = "Name too short";
                    return View(existing);
                }
            }

            if (employee.Email != null)
            {
                if (employee.Email.Contains("@"))
                {
                    if (employee.Email.EndsWith(".com") || employee.Email.EndsWith(".jp"))
                    {
                        existing.Email = employee.Email;
                    }
                    else
                    {
                        ViewBag.Error = "Invalid email domain";
                        return View(existing);
                    }
                }
                else
                {
                    ViewBag.Error = "Invalid email format";
                    return View(existing);
                }
            }

            if (employee.Department != null)
            {
                if (employee.Department == "Sales" || employee.Department == "Engineering" ||
                    employee.Department == "HR" || employee.Department == "Finance")
                {
                    existing.Department = employee.Department;
                }
                else
                {
                    ViewBag.Error = "Invalid department";
                    return View(existing);
                }
            }

            // 問題12: パスワード更新時もハッシュ化なし (Critical Security)
            if (!string.IsNullOrEmpty(employee.Password))
            {
                existing.Password = employee.Password;
            }

            existing.UpdatedAt = DateTime.Now;

            _context.SaveChanges();

            return RedirectToAction("Index");
        }

        // 問題13: 論理削除ではなく物理削除（データ復元不可） (Medium Code Quality)
        // 問題14: 認可チェックなし（誰でも削除可能） (High Security)
        public IActionResult Delete(int id)
        {
            var employee = _context.Employees.Find(id);

            if (employee != null)
            {
                _context.Employees.Remove(employee);
                _context.SaveChanges();
            }

            return RedirectToAction("Index");
        }

        // 問題15: 詳細情報に機密情報を含む (High Security)
        // 問題16: XSSの可能性 (High Security)
        public IActionResult Details(int id)
        {
            var employee = _context.Employees.Find(id);

            if (employee == null)
            {
                return NotFound();
            }

            // 問題17: ViewBagの過度な使用 (Medium Performance)
            ViewBag.Employee = employee;
            ViewBag.PasswordHash = employee.Password; // パスワードを表示
            ViewBag.SSN = employee.SocialSecurityNumber; // SSNを表示
            ViewBag.Salary = employee.Salary; // 給与を表示

            return View();
        }

        // 問題18: 例外処理が不適切（catch-all） (Medium Code Quality)
        public IActionResult Export()
        {
            try
            {
                // 問題19: 全従業員データを一括取得（メモリ問題） (High Performance)
                var employees = _context.Employees.ToList();

                var csv = new StringBuilder();
                csv.AppendLine("Id,Name,Email,Password,Department,Salary,SSN");

                foreach (var emp in employees)
                {
                    // 問題20: 機密情報をエクスポート (Critical Security)
                    csv.AppendLine($"{emp.Id},{emp.Name},{emp.Email},{emp.Password},{emp.Department},{emp.Salary},{emp.SocialSecurityNumber}");
                }

                var bytes = Encoding.UTF8.GetBytes(csv.ToString());

                return File(bytes, "text/csv", "employees.csv");
            }
            catch (Exception ex)
            {
                // 問題21: 例外の詳細をユーザーに表示 (Medium Security)
                return Content($"Error: {ex.Message}\n{ex.StackTrace}");
            }
        }

        // 問題22: キャッシュの不適切な使用（staticフィールド） (Medium Code Quality)
        public IActionResult GetCachedEmployees()
        {
            if (cachedEmployees.Count == 0)
            {
                cachedEmployees = _context.Employees.ToList();
            }

            return View("List", cachedEmployees);
        }

        // 問題23: 型の不一致（stringをintに変換） (Low Code Quality)
        // 問題24: エラーハンドリング不足 (Medium Code Quality)
        public IActionResult GetById(string id)
        {
            var employeeId = int.Parse(id); // FormatExceptionの可能性
            var employee = _context.Employees.Find(employeeId);

            return View("Details", employee);
        }
    }
}
