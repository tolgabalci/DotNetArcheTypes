var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .AddDatabase("mermaidnotes");

var api = builder.AddProject<Projects.MermaidNotes_Api>("api")
    .WithReference(postgres)
    .WaitFor(postgres)
    .WithEnvironment("Authentication__Mode", builder.Configuration["Authentication:Mode"] ?? "Test")
    .WithEnvironment("Database__MigrateOnStartup", "true")
    .WithEnvironment("Cors__AllowedOrigins__0", "http://localhost:5173");

builder.AddNpmApp("web", "../web", "dev")
    .WithReference(api)
    .WaitFor(api)
    .WithHttpEndpoint(port: 5173, env: "VITE_PORT")
    .WithEnvironment("VITE_API_BASE_URL", api.GetEndpoint("http"))
    .WithEnvironment("VITE_AUTH_MODE", builder.Configuration["Web:AuthMode"] ?? "mock")
    .WithExternalHttpEndpoints();

builder.Build().Run();
