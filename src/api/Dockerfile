FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Directory.Build.props Directory.Packages.props global.json ./
COPY src/api/MermaidNotes.Api.csproj src/api/
RUN dotnet restore src/api/MermaidNotes.Api.csproj

COPY src/api src/api
RUN dotnet publish src/api/MermaidNotes.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MermaidNotes.Api.dll"]
