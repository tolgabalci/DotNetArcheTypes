using System.Security.Claims;
using System.Text.Encodings.Web;
using MermaidNotes.Api.Database;
using MermaidNotes.Api.Modules.Entries;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks().AddDbContextCheck<EntriesDbContext>("postgres");
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<ICurrentUser, HttpContextCurrentUser>();

builder.Services.AddDbContext<EntriesDbContext>(options =>
{
    var connectionString = GetDatabaseConnectionString(builder.Configuration);

    options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.MigrationsHistoryTable("__ef_migrations_history", EntriesDbContext.SchemaName);
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("web", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:5173", "https://localhost:5173"];

        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

ConfigureAuthentication(builder);
ConfigureTelemetry(builder);

var app = builder.Build();

app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run((HttpContext context) =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var problem = TypedResults.Problem(
            title: "An unexpected error occurred.",
            detail: app.Environment.IsDevelopment() ? exception?.Message : null,
            statusCode: StatusCodes.Status500InternalServerError);

        return problem.ExecuteAsync(context);
    });
});

app.UseCors("web");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live").AllowAnonymous();
app.MapHealthChecks("/health/ready").AllowAnonymous();

var api = app.MapGroup("/api/v1")
    .RequireAuthorization()
    .WithTags("Mermaid Notes API");

api.MapEntriesEndpoints();

if (app.Configuration.GetValue("Database:MigrateOnStartup", false))
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<EntriesDbContext>();
    await db.Database.MigrateAsync();
}

await app.RunAsync();

static void ConfigureAuthentication(WebApplicationBuilder builder)
{
    var mode = builder.Configuration.GetValue("Authentication:Mode", "Cognito");

    if (string.Equals(mode, "Test", StringComparison.OrdinalIgnoreCase))
    {
        builder.Services.AddAuthentication("Test")
            .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>("Test", _ => { });
        builder.Services.AddAuthorization();
        return;
    }

    var authority = builder.Configuration["Authentication:Cognito:Authority"];
    var audience = builder.Configuration["Authentication:Cognito:ClientId"];

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = authority;
            options.Audience = audience;
            options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                NameClaimType = "name",
                RoleClaimType = "cognito:groups"
            };
        });

    builder.Services.AddAuthorization();
}

static string GetDatabaseConnectionString(IConfiguration configuration)
{
    var configuredConnectionString = configuration.GetConnectionString("mermaidnotes")
        ?? configuration.GetConnectionString("Default");

    if (!string.IsNullOrWhiteSpace(configuredConnectionString))
    {
        return configuredConnectionString;
    }

    var host = configuration["Database:Host"];
    var password = configuration["Database:Password"];

    if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(password))
    {
        return "Host=localhost;Port=5432;Database=mermaidnotes;Username=postgres;Password=postgres";
    }

    var port = configuration["Database:Port"] ?? "5432";
    var database = configuration["Database:Name"] ?? "mermaidnotes";
    var username = configuration["Database:Username"] ?? "mermaidnotes";

    return $"Host={host};Port={port};Database={database};Username={username};Password={password};Include Error Detail=false;Pooling=true";
}

static void ConfigureTelemetry(WebApplicationBuilder builder)
{
    var serviceName = builder.Configuration.GetValue("OpenTelemetry:ServiceName", "MermaidNotes.Api");

    builder.Services.AddOpenTelemetry()
        .ConfigureResource(resource => resource.AddService(serviceName))
        .WithTracing(tracing =>
        {
            tracing.AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation();

            if (!string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]))
            {
                tracing.AddOtlpExporter();
            }
            else if (builder.Environment.IsDevelopment())
            {
                tracing.AddConsoleExporter();
            }
        })
        .WithMetrics(metrics =>
        {
            metrics.AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation();

            if (!string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]))
            {
                metrics.AddOtlpExporter();
            }
        });
}

internal sealed class TestAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var userId = Request.Headers.TryGetValue("X-Test-User-Id", out var value)
            ? value.ToString()
            : "test-user";

        var claims = new[]
        {
            new Claim("sub", userId),
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Name, userId)
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

public partial class Program;
