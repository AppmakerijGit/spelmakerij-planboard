using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using planboard;
using planboard.Auth;
using planboard.Http;
using planboard.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiBaseSetting = builder.Configuration["ApiBaseUrl"] ?? "http://localhost:3003/";
var apiBase = apiBaseSetting.StartsWith("http")
    ? apiBaseSetting
    : new Uri(new Uri(builder.HostEnvironment.BaseAddress), apiBaseSetting).ToString();

builder.Services.AddAuthorizationCore();
builder.Services.AddSingleton<JwtAuthStateProvider>();
builder.Services.AddScoped<AuthenticationStateProvider>(
    sp => sp.GetRequiredService<JwtAuthStateProvider>());
builder.Services.AddTransient<JwtHttpMessageHandler>();
builder.Services.AddHttpClient("API", c => c.BaseAddress = new Uri(apiBase))
    .AddHttpMessageHandler<JwtHttpMessageHandler>();
builder.Services.AddScoped(
    sp => sp.GetRequiredService<IHttpClientFactory>().CreateClient("API"));
builder.Services.AddHttpClient("Auth", c => c.BaseAddress = new Uri(apiBase));
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<CardService>();
builder.Services.AddScoped<AbsenceService>();
builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<BuilderService>();
builder.Services.AddScoped<SlotTimesService>();
builder.Services.AddSingleton<ToastService>();
builder.Services.AddSingleton<ModalService>();

await builder.Build().RunAsync();
