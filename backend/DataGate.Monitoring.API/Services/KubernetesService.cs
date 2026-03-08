using DataGate.Monitoring.API.Configuration;
using DataGate.Monitoring.API.Models.Kubernetes;
using k8s;
using k8s.Models;

namespace DataGate.Monitoring.API.Services;

public interface IKubernetesService
{
    Task<ClusterOverview>  GetClusterOverviewAsync(CancellationToken ct = default);
    Task<List<NodeStatus>> GetNodesAsync(CancellationToken ct = default);
    Task<List<SparkPod>>   GetSparkPodsAsync(CancellationToken ct = default);
    Task<HashSet<string>>  GetRunningPodNamesAsync(CancellationToken ct = default);
}

public class KubernetesService : IKubernetesService
{
    private readonly IKubernetes            _client;
    private readonly KubernetesSettings     _settings;
    private readonly ILogger<KubernetesService> _logger;

    public KubernetesService(KubernetesSettings settings, ILogger<KubernetesService> logger)
    {
        _settings = settings;
        _logger   = logger;

        var config = string.IsNullOrEmpty(settings.KubeconfigPath)
            ? KubernetesClientConfiguration.InClusterConfig()
            : KubernetesClientConfiguration.BuildConfigFromConfigFile(settings.KubeconfigPath);

        _client = new Kubernetes(config);
    }

    public async Task<ClusterOverview> GetClusterOverviewAsync(CancellationToken ct = default)
    {
        var nodes = await _client.CoreV1.ListNodeAsync(cancellationToken: ct);

        int ready    = 0, pressure = 0, notReady = 0;
        foreach (var node in nodes.Items)
        {
            var readyCond = node.Status.Conditions
                .FirstOrDefault(c => c.Type == "Ready");

            if (readyCond?.Status == "True")
            {
                bool hasPressure = node.Status.Conditions.Any(c =>
                    c.Type is "MemoryPressure" or "DiskPressure" or "PIDPressure"
                    && c.Status == "True");
                if (hasPressure) pressure++;
                else             ready++;
            }
            else notReady++;
        }

        var status = notReady > 0 ? "critical" : pressure > 0 ? "warning" : "ok";
        return new ClusterOverview(ready, pressure, notReady, status);
    }

    public async Task<List<NodeStatus>> GetNodesAsync(CancellationToken ct = default)
    {
        var nodes   = await _client.CoreV1.ListNodeAsync(cancellationToken: ct);
        var metrics = await TryGetNodeMetricsAsync(ct);

        return nodes.Items.Select(node =>
        {
            var conditions = node.Status.Conditions
                .Where(c => c.Status == "True")
                .Select(c => c.Type)
                .ToList();

            var status = conditions.Contains("Ready")
                ? (conditions.Any(c => c is "MemoryPressure" or "DiskPressure") ? "Pressure" : "Ready")
                : "NotReady";

            metrics.TryGetValue(node.Metadata.Name, out var m);

            return new NodeStatus(
                Name:          node.Metadata.Name,
                Status:        status,
                CpuPercent:    m?.CpuPercent    ?? 0,
                MemoryPercent: m?.MemoryPercent ?? 0,
                Conditions:    conditions
            );
        }).ToList();
    }

    public async Task<List<SparkPod>> GetSparkPodsAsync(CancellationToken ct = default)
    {
        var pods = await _client.CoreV1.ListNamespacedPodAsync(
            _settings.AirflowNamespace,
            labelSelector: "spark-role=driver",
            cancellationToken: ct);

        return pods.Items.Select(pod =>
        {
            var phase = pod.Status.Phase ?? "Unknown";

            string? terminationReason = null;
            if (phase == "Failed")
            {
                terminationReason = pod.Status.ContainerStatuses?
                    .FirstOrDefault()?.State?.Terminated?.Reason ?? "Error";
            }

            var cpuReq = pod.Spec.Containers
                .Sum(c => c.Resources?.Requests?.TryGetValue("cpu", out var cpu) == true
                    ? ParseCpuCores(cpu.Value) : 0);

            var memReq = pod.Spec.Containers
                .FirstOrDefault()?.Resources?.Requests
                    ?.GetValueOrDefault("memory")?.Value ?? "N/A";

            return new SparkPod(
                Name:               pod.Metadata.Name,
                Phase:              phase,
                NodeName:           pod.Spec.NodeName,
                StartTime:          pod.Status.StartTime,
                StartTimeDisplay:   pod.Status.StartTime?.ToString("HH:mm") ?? "—",
                CpuRequest:         $"{cpuReq:F1} cores",
                MemoryRequest:      memReq,
                TerminationReason:  terminationReason
            );
        }).ToList();
    }

    public async Task<HashSet<string>> GetRunningPodNamesAsync(CancellationToken ct = default)
    {
        var pods = await _client.CoreV1.ListNamespacedPodAsync(
            _settings.AirflowNamespace,
            fieldSelector: "status.phase=Running",
            cancellationToken: ct);

        return pods.Items.Select(p => p.Metadata.Name).ToHashSet();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task<Dictionary<string, (double CpuPercent, double MemoryPercent)>> TryGetNodeMetricsAsync(CancellationToken ct)
    {
        // metrics-server optionnel
        try
        {
            var metricsJson = await _client.CustomObjects.ListClusterCustomObjectAsync(
                "metrics.k8s.io", "v1beta1", "nodes", cancellationToken: ct);
            // parsing simplifié — à adapter selon la version du metrics-server
            return new Dictionary<string, (double, double)>();
        }
        catch
        {
            return new Dictionary<string, (double, double)>();
        }
    }

    private static double ParseCpuCores(string cpu)
    {
        if (cpu.EndsWith("m") && double.TryParse(cpu[..^1], out var m)) return m / 1000;
        if (double.TryParse(cpu, out var c)) return c;
        return 0;
    }
}
