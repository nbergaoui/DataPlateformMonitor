using DataGate.Monitoring.API.Configuration;
using DataGate.Monitoring.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ─────────────────────────────────────────────────────────────
var settings = builder.Configuration
    .GetSection("Monitoring")
    .Get<MonitoringSettings>() ?? new MonitoringSettings();

builder.Services.AddSingleton(settings.Airflow);
builder.Services.AddSingleton(settings.Trino);
builder.Services.AddSingleton(settings.Kubernetes);
builder.Services.AddSingleton(settings.Database);

// ── HTTP Clients ──────────────────────────────────────────────────────────────
builder.Services.AddHttpClient("airflow", c =>
{
    c.BaseAddress = new Uri(settings.Airflow.BaseUrl);
    c.Timeout     = TimeSpan.FromSeconds(settings.Airflow.TimeoutSeconds);
});

builder.Services.AddHttpClient("keycloak", c =>
{
    c.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddHttpClient("trino", c =>
{
    c.BaseAddress = new Uri(settings.Trino.BaseUrl);
    c.Timeout     = TimeSpan.FromSeconds(settings.Trino.TimeoutSeconds);
    c.DefaultRequestHeaders.Add("X-Trino-User", settings.Trino.User);
});

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddSingleton<IKeycloakTokenService, KeycloakTokenService>();
builder.Services.AddScoped<IAirflowService,    AirflowService>();
builder.Services.AddScoped<ITrinoService,      TrinoService>();
builder.Services.AddScoped<IKubernetesService, KubernetesService>();
builder.Services.AddScoped<IKpiService,        KpiService>();

// ── API ───────────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "DataGate Monitoring API", Version = "v1" });
});

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(o => o.AddPolicy("Angular", p =>
    p.WithOrigins(allowedOrigins)
     .AllowAnyMethod()
     .AllowAnyHeader()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Angular");
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();
