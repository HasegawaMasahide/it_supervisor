using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using LegacySystem.Data;
using System;

namespace LegacySystem
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // 問題1: グローバル変数の使用 (Medium Code Quality)
        public static IConfiguration GlobalConfig;

        public void ConfigureServices(IServiceCollection services)
        {
            // グローバル変数に設定を保存
            GlobalConfig = Configuration;

            // 問題2: AddMvcの古いパターン (Low Code Quality)
            services.AddMvc();

            // 問題3: DbContextをSingletonで登録 (High Code Quality)
            // 正しくはAddDbContext（Scoped）
            services.AddSingleton<ApplicationDbContext>(provider =>
            {
                var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
                optionsBuilder.UseSqlServer(Configuration.GetConnectionString("DefaultConnection"));
                return new ApplicationDbContext(optionsBuilder.Options);
            });

            // 問題4: セッション設定が緩い (Medium Security)
            services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(525600); // 1年
                options.Cookie.HttpOnly = false; // JavaScriptからアクセス可能
                options.Cookie.IsEssential = true;
            });

            // 問題5: CORS設定が緩い (High Security)
            services.AddCors(options =>
            {
                options.AddPolicy("AllowAll",
                    builder => builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials());
            });

            // 問題6: 認証設定が不適切 (High Security)
            services.AddAuthentication("CustomScheme")
                .AddCookie("CustomScheme", options =>
                {
                    options.LoginPath = "/Account/Login";
                    options.Cookie.HttpOnly = false;
                    options.Cookie.SecurePolicy = CookieSecurePolicy.None; // HTTPでも送信
                    options.ExpireTimeSpan = TimeSpan.FromDays(365); // 1年
                });
        }

        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            // 問題7: 本番環境でもDeveloperExceptionPageを使用 (Critical Security)
            if (env.IsDevelopment() || true) // 常にtrue
            {
                app.UseDeveloperExceptionPage();
            }

            // 問題8: HTTPSリダイレクトなし (High Security)
            // app.UseHttpsRedirection();

            // 問題9: Hsts未使用 (Medium Security)
            // app.UseHsts();

            app.UseStaticFiles();
            app.UseSession();

            // 問題10: CORS設定が緩い (High Security)
            app.UseCors("AllowAll");

            app.UseAuthentication();

            // 問題11: セキュリティヘッダーの設定なし (Medium Security)
            // X-Frame-Options、X-Content-Type-Options等

            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller=Home}/{action=Index}/{id?}");
            });
        }
    }
}
