using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;

namespace LegacySystem
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
            WebHost.CreateDefaultBuilder(args)
                // 問題1: UseUrlsでHTTPを許可 (High Security)
                .UseUrls("http://*:5000", "https://*:5001")
                .UseStartup<Startup>();
    }
}
