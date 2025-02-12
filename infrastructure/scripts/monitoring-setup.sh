#!/bin/bash

# Monitoring Stack Setup Script for Sales & Intelligence Platform
# Version: 1.0.0
# This script automates the deployment of a highly available monitoring stack
# including Prometheus, Grafana, and AlertManager with enterprise-grade configurations.

set -euo pipefail

# Global Variables
MONITORING_NAMESPACE="monitoring"
PROMETHEUS_VERSION="v2.45.0"
GRAFANA_VERSION="10.0.3"
ALERTMANAGER_VERSION="v0.25.0"
HA_REPLICA_COUNT=3
RETENTION_PERIOD="30d"
STORAGE_SIZE="100Gi"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl first."
        return 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "helm not found. Please install helm first."
        return 1
    }
    
    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Unable to access Kubernetes cluster. Please check your kubeconfig."
        return 1
    }
    
    # Verify monitoring namespace
    if ! kubectl get namespace "$MONITORING_NAMESPACE" &> /dev/null; then
        log_info "Creating monitoring namespace..."
        kubectl create namespace "$MONITORING_NAMESPACE"
    fi
    
    # Check storage class
    if ! kubectl get storageclass gp3 &> /dev/null; then
        log_error "Required storage class 'gp3' not found."
        return 1
    }
    
    log_info "Prerequisites check completed successfully."
    return 0
}

# Deploy Prometheus
deploy_prometheus() {
    log_info "Deploying Prometheus..."
    
    # Create RBAC resources
    kubectl apply -f infrastructure/kubernetes/monitoring/prometheus.yaml
    
    # Wait for Prometheus StatefulSet
    kubectl rollout status statefulset/prometheus -n "$MONITORING_NAMESPACE" --timeout=300s
    
    if [ $? -eq 0 ]; then
        log_info "Prometheus deployment successful."
        return 0
    else
        log_error "Prometheus deployment failed."
        return 1
    fi
}

# Deploy Grafana
deploy_grafana() {
    log_info "Deploying Grafana..."
    
    # Create Grafana resources
    kubectl apply -f infrastructure/kubernetes/monitoring/grafana.yaml
    
    # Wait for Grafana deployment
    kubectl rollout status deployment/grafana -n "$MONITORING_NAMESPACE" --timeout=300s
    
    if [ $? -eq 0 ]; then
        log_info "Grafana deployment successful."
        return 0
    else
        log_error "Grafana deployment failed."
        return 1
    fi
}

# Deploy AlertManager
deploy_alertmanager() {
    log_info "Deploying AlertManager..."
    
    # Create AlertManager resources
    kubectl apply -f infrastructure/kubernetes/monitoring/alertmanager.yaml
    
    # Wait for AlertManager StatefulSet
    kubectl rollout status statefulset/alertmanager -n "$MONITORING_NAMESPACE" --timeout=300s
    
    if [ $? -eq 0 ]; then
        log_info "AlertManager deployment successful."
        return 0
    else
        log_error "AlertManager deployment failed."
        return 1
    fi
}

# Verify monitoring stack
verify_monitoring_stack() {
    log_info "Verifying monitoring stack..."
    
    # Check Prometheus
    if ! kubectl get pods -l app=prometheus -n "$MONITORING_NAMESPACE" | grep -q "Running"; then
        log_error "Prometheus pods not running."
        return 1
    fi
    
    # Check Grafana
    if ! kubectl get pods -l app=grafana -n "$MONITORING_NAMESPACE" | grep -q "Running"; then
        log_error "Grafana pods not running."
        return 1
    fi
    
    # Check AlertManager
    if ! kubectl get pods -l app=alertmanager -n "$MONITORING_NAMESPACE" | grep -q "Running"; then
        log_error "AlertManager pods not running."
        return 1
    }
    
    # Verify service endpoints
    local prometheus_url=$(kubectl get svc prometheus -n "$MONITORING_NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    local grafana_url=$(kubectl get svc grafana -n "$MONITORING_NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    local alertmanager_url=$(kubectl get svc alertmanager -n "$MONITORING_NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    
    # Export endpoints
    cat << EOF > monitoring_endpoints.json
{
    "prometheus_url": "http://${prometheus_url}:9090",
    "grafana_url": "http://${grafana_url}:3000",
    "alertmanager_url": "http://${alertmanager_url}:9093"
}
EOF
    
    log_info "Monitoring stack verification completed successfully."
    return 0
}

# Main execution
main() {
    log_info "Starting monitoring stack setup..."
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisites check failed. Exiting."
        exit 1
    fi
    
    # Deploy components
    if ! deploy_prometheus; then
        log_error "Prometheus deployment failed. Exiting."
        exit 1
    fi
    
    if ! deploy_grafana; then
        log_error "Grafana deployment failed. Exiting."
        exit 1
    fi
    
    if ! deploy_alertmanager; then
        log_error "AlertManager deployment failed. Exiting."
        exit 1
    fi
    
    # Verify stack
    if ! verify_monitoring_stack; then
        log_error "Monitoring stack verification failed. Exiting."
        exit 1
    fi
    
    log_info "Monitoring stack setup completed successfully!"
    log_info "Endpoints have been exported to monitoring_endpoints.json"
}

# Execute main function
main "$@"