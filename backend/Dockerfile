FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["ClinicFlow.Api.csproj", "./"]
RUN dotnet restore "./ClinicFlow.Api.csproj"

COPY . .
RUN dotnet publish "./ClinicFlow.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Npgsql needs libgssapi_krb5 for connection negotiation; the slim aspnet
# image doesn't include it, so Postgres connections fail at runtime without it.
RUN apt-get update && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ClinicFlow.Api.dll"]
