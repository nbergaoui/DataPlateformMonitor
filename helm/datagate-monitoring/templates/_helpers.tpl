{{/*
Expand the name of the chart.
*/}}
{{- define "datagate-monitoring.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "datagate-monitoring.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "datagate-monitoring.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "datagate-monitoring.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "datagate-monitoring.name" . }}-backend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "datagate-monitoring.frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "datagate-monitoring.name" . }}-frontend
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
