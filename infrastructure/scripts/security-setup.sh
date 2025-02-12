#!/bin/bash

# Security Setup Script for Sales & Intelligence Platform
# Version: 1.0.0
# Last Updated: 2024-01-20
# Description: Comprehensive security controls and policies setup script

set -euo pipefail

# Global Variables
CLUSTER_NAME=${CLUSTER_NAME:-"sales-intelligence-cluster"}
NAMESPACE=${NAMESPACE:-"sales-intelligence"}
AWS_REGION=${AWS_REGION:-$(aws configure get region)}
SECURITY_LOG_PATH=${SECURITY_LOG_PATH:-"/var/log/security/audit.log"}
COMPLIANCE_CHECK_INTERVAL=${COMPLIANCE_CHECK_INTERVAL:-3600}

# Logging setup
setup_logging() {
    mkdir -p "$(dirname $SECURITY_LOG_PATH)"
    exec 1> >(tee -a "${SECURITY_LOG_PATH}")
    exec 2>&1
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting security setup script"
}

# Error handling
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "[ERROR] Failed at line ${line_no} with error code ${error_code}"
    exit "${error_code}"
}
trap 'error_handler ${LINENO} $?' ERR

# Verify prerequisites
verify_prerequisites() {
    echo "Verifying prerequisites..."
    
    # Check required tools
    for tool in kubectl aws jq; do
        if ! command -v $tool &> /dev/null; then
            echo "Error: Required tool $tool is not installed"
            exit 1
        fi
    done

    # Verify cluster access
    kubectl cluster-info || {
        echo "Error: Cannot access Kubernetes cluster"
        exit 1
    }

    # Verify AWS credentials
    aws sts get-caller-identity &>/dev/null || {
        echo "Error: Invalid AWS credentials"
        exit 1
    }
}

# Network Security Setup
setup_network_security() {
    local policy_set=$1
    local enable_monitoring=${2:-true}
    
    echo "Setting up network security policies..."
    
    # Apply default deny policy
    kubectl apply -f infrastructure/kubernetes/security/network-policies.yaml

    # Verify policy application
    kubectl wait --for=condition=Available --timeout=60s networkpolicy/default-deny-all -n $NAMESPACE

    if [[ "$enable_monitoring" == "true" ]]; then
        # Setup network monitoring
        kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus
  namespace: $NAMESPACE
spec:
  podSelector: {}
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
EOF
    fi

    echo "Network security policies applied successfully"
}

# Pod Security Setup
setup_pod_security() {
    local policy_level=${1:-"restricted"}
    local enforce_immediately=${2:-true}
    
    echo "Setting up pod security policies..."
    
    # Apply PSP
    kubectl apply -f infrastructure/kubernetes/security/pod-security-policies.yaml
    
    # Setup RBAC for PSP
    kubectl create clusterrolebinding psp:restricted \
        --clusterrole=psp:restricted \
        --group=system:authenticated \
        --dry-run=client -o yaml | kubectl apply -f -

    if [[ "$enforce_immediately" == "true" ]]; then
        # Label namespace for immediate enforcement
        kubectl label namespace $NAMESPACE \
            pod-security.kubernetes.io/enforce=$policy_level \
            --overwrite
    fi

    echo "Pod security policies applied successfully"
}

# AWS Security Setup
setup_aws_security() {
    local security_level=${1:-"high"}
    
    echo "Setting up AWS security services..."
    
    # Configure WAF
    aws wafv2 create-web-acl \
        --name "sales-intelligence-waf" \
        --scope REGIONAL \
        --default-action Block={} \
        --description "WAF for Sales Intelligence Platform" \
        --region $AWS_REGION

    # Setup KMS encryption
    aws kms create-key \
        --description "Sales Intelligence Platform Encryption Key" \
        --region $AWS_REGION

    # Configure GuardDuty
    aws guardduty create-detector \
        --enable \
        --finding-publishing-frequency FIFTEEN_MINUTES \
        --region $AWS_REGION

    echo "AWS security services configured successfully"
}

# Security Verification
verify_security_setup() {
    local generate_report=${1:-true}
    local report_format=${2:-"json"}
    
    echo "Verifying security setup..."
    
    # Check network policies
    local network_policies=$(kubectl get networkpolicies -n $NAMESPACE -o json)
    
    # Verify pod security policies
    local pod_security=$(kubectl get psp restricted-psp -o json)
    
    # Check AWS security controls
    local waf_status=$(aws wafv2 list-web-acls --scope REGIONAL --region $AWS_REGION)
    
    if [[ "$generate_report" == "true" ]]; then
        # Generate verification report
        cat > security-verification-report.${report_format} <<EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "cluster": "$CLUSTER_NAME",
    "namespace": "$NAMESPACE",
    "network_policies": $network_policies,
    "pod_security": $pod_security,
    "aws_security": $waf_status
}
EOF
    fi

    echo "Security verification completed"
}

# Main setup function
main() {
    setup_logging
    verify_prerequisites

    echo "Starting comprehensive security setup for Sales Intelligence Platform..."

    # Setup network security
    setup_network_security "default" true

    # Setup pod security
    setup_pod_security "restricted" true

    # Setup AWS security
    setup_aws_security "high"

    # Verify setup
    verify_security_setup true "json"

    echo "Security setup completed successfully"
}

# Execute main function
main "$@"