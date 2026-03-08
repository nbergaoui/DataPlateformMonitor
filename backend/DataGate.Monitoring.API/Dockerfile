# ── Stage 1 : build .NET ──────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder
WORKDIR /src

COPY DataGate.Monitoring.API.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# ── Stage 2 : runtime ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "DataGate.Monitoring.API.dll"]
