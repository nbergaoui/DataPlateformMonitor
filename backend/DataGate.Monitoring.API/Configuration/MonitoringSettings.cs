namespace DataGate.Monitoring.API.Configuration;

public class MonitoringSettings
{
    public AirflowSettings    Airflow    { get; set; } = new();
    public TrinoSettings      Trino      { get; set; } = new();
    public KubernetesSettings Kubernetes { get; set; } = new();
    public DatabaseSettings   Database   { get; set; } = new();
}

public class AirflowSettings
{
    public string BaseUrl      { get; set; } = string.Empty;  // http://airflow-webserver:8080
    public string KeycloakUrl  { get; set; } = string.Empty;  // http://keycloak/realms/{realm}/protocol/openid-connect/token
    public string ClientId     { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public int    TimeoutSeconds { get; set; } = 10;
}

public class TrinoSettings
{
    public string BaseUrl        { get; set; } = string.Empty;  // http://trino:8080
    public string User           { get; set; } = string.Empty;
    public string Password       { get; set; } = string.Empty;
    public int    TimeoutSeconds { get; set; } = 10;
}

public class KubernetesSettings
{
    public string KubeconfigPath    { get; set; } = string.Empty;  // vide = in-cluster
    public string AirflowNamespace  { get; set; } = "airflow";
    public string SparkNamespace    { get; set; } = "spark";
}

public class DatabaseSettings
{
    public string ConnectionString { get; set; } = string.Empty;
}
