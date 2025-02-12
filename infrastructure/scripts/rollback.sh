#!/bin/bash

# Sales & Intelligence Platform Rollback Script
# Version: 1.0.0
# Dependencies:
# - kubectl v1.27+
# - helm v3.12+
# - aws-cli 2.0+

set -euo pipefail

# Global variables
readonly ENVIRONMENTS=("development" "staging" "production")
readonly COMPONENTS=("frontend" "backend" "infrastructure")
readonly ROLLBACK_TIMEOUT=300
readonly LOG_LEVEL="INFO"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Logging functions
log_info() { echo "[INFO] $1"; }
log_error() { echo "[ERROR] $1" >&2; }
log_warn() { echo "[WARN] $1" >&2; }
log_debug() { [[ "${LOG_LEVEL}" == "DEBUG" ]] && echo "[DEBUG] $1"; }

# Check prerequisites for rollback operation
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    for cmd in kubectl helm aws jq; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            return 1
        fi
    done

    # Verify kubectl context
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Unable to connect to Kubernetes cluster"
        return 1
    }

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "Invalid AWS credentials"
        return 1
    }

    # Verify Helm repositories
    if ! helm repo list &> /dev/null; then
        log_error "Helm repositories not configured"
        return 1
    }

    log_info "Prerequisites check passed"
    return 0
}

# Rollback frontend deployment
rollback_frontend() {
    local environment=$1
    local previous_version=$2
    local namespace="sales-intelligence"

    log_info "Starting frontend rollback to version ${previous_version} in ${environment}"

    # Create rollback snapshot
    kubectl get deployment frontend -n "$namespace" -o yaml > "frontend-pre-rollback-$(date +%Y%m%d_%H%M%S).yaml"

    # Perform rollback
    kubectl rollout undo deployment/frontend \
        -n "$namespace" \
        --to-revision="$previous_version"

    # Wait for rollout completion
    if ! kubectl rollout status deployment/frontend -n "$namespace" --timeout="${ROLLBACK_TIMEOUT}s"; then
        log_error "Frontend rollback failed"
        return 1
    }

    # Verify health
    verify_system_health "frontend" || return 1

    log_info "Frontend rollback completed successfully"
    return 0
}

# Rollback backend deployment
rollback_backend() {
    local environment=$1
    local release_name=$2
    local revision=$3
    local namespace="sales-intelligence"

    log_info "Starting backend rollback to revision ${revision} in ${environment}"

    # Backup current state
    kubectl get deployment sales-intelligence-backend -n "$namespace" -o yaml > "backend-pre-rollback-$(date +%Y%m%d_%H%M%S).yaml"

    # Execute Helm rollback
    if ! helm rollback "$release_name" "$revision" \
        --namespace "$namespace" \
        --timeout "${ROLLBACK_TIMEOUT}s" \
        --wait \
        --atomic; then
        log_error "Backend rollback failed"
        return 1
    }

    # Verify health
    verify_system_health "backend" || return 1

    log_info "Backend rollback completed successfully"
    return 0
}

# Rollback infrastructure
rollback_infrastructure() {
    local environment=$1
    local state_backup=$2

    log_info "Starting infrastructure rollback in ${environment}"

    # Verify state backup
    if [[ ! -f "$state_backup" ]]; then
        log_error "Infrastructure state backup not found: $state_backup"
        return 1
    }

    # Create snapshot of current state
    aws s3 cp "s3://sales-intelligence-terraform/state/${environment}" \
        "infrastructure-pre-rollback-$(date +%Y%m%d_%H%M%S).tfstate"

    # Apply previous state
    if ! terraform init && \
       terraform apply -state="$state_backup" -auto-approve; then
        log_error "Infrastructure rollback failed"
        return 1
    }

    # Verify infrastructure health
    verify_system_health "infrastructure" || return 1

    log_info "Infrastructure rollback completed successfully"
    return 0
}

# Verify system health
verify_system_health() {
    local component=$1
    local namespace="sales-intelligence"
    local retries=3
    local retry_delay=10

    log_info "Verifying ${component} health..."

    for ((i=1; i<=retries; i++)); do
        case "$component" in
            "frontend")
                # Check frontend deployment status
                if ! kubectl get deployment frontend -n "$namespace" -o jsonpath='{.status.availableReplicas}' | grep -q "3"; then
                    log_warn "Frontend health check failed (attempt $i/$retries)"
                    sleep "$retry_delay"
                    continue
                fi
                ;;
            "backend")
                # Check backend deployment status
                if ! kubectl get deployment sales-intelligence-backend -n "$namespace" -o jsonpath='{.status.availableReplicas}' | grep -q "3"; then
                    log_warn "Backend health check failed (attempt $i/$retries)"
                    sleep "$retry_delay"
                    continue
                fi
                ;;
            "infrastructure")
                # Check core infrastructure components
                if ! kubectl get nodes --no-headers | grep -q "Ready"; then
                    log_warn "Infrastructure health check failed (attempt $i/$retries)"
                    sleep "$retry_delay"
                    continue
                fi
                ;;
            *)
                log_error "Unknown component: $component"
                return 1
                ;;
        esac

        log_info "${component} health check passed"
        return 0
    done

    log_error "${component} health check failed after $retries attempts"
    return 1
}

# Main rollback function
rollback_all() {
    local environment=$1
    local frontend_version=$2
    local backend_revision=$3
    local infra_state=$4

    # Validate environment
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${environment} " ]]; then
        log_error "Invalid environment: $environment"
        return 1
    }

    # Check prerequisites
    check_prerequisites || return 1

    # Start rollback process
    log_info "Starting full system rollback for environment: $environment"

    # Rollback components in reverse order
    if ! rollback_frontend "$environment" "$frontend_version"; then
        log_error "Frontend rollback failed"
        return 1
    fi

    if ! rollback_backend "$environment" "sales-intelligence" "$backend_revision"; then
        log_error "Backend rollback failed"
        return 1
    fi

    if ! rollback_infrastructure "$environment" "$infra_state"; then
        log_error "Infrastructure rollback failed"
        return 1
    fi

    log_info "Full system rollback completed successfully"
    return 0
}

# Component-specific rollback function
rollback_component() {
    local environment=$1
    local component=$2
    local version=$3

    # Validate inputs
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${environment} " ]]; then
        log_error "Invalid environment: $environment"
        return 1
    fi

    if [[ ! " ${COMPONENTS[@]} " =~ " ${component} " ]]; then
        log_error "Invalid component: $component"
        return 1
    fi

    # Check prerequisites
    check_prerequisites || return 1

    # Start component rollback
    log_info "Starting rollback for $component in $environment"

    case "$component" in
        "frontend")
            rollback_frontend "$environment" "$version"
            ;;
        "backend")
            rollback_backend "$environment" "sales-intelligence" "$version"
            ;;
        "infrastructure")
            rollback_infrastructure "$environment" "$version"
            ;;
    esac

    return $?
}

# Script usage
usage() {
    cat << EOF
Usage: $(basename "$0") <command> [options]

Commands:
    rollback-all <environment> <frontend-version> <backend-revision> <infra-state>
        Perform full system rollback
    
    rollback-component <environment> <component> <version>
        Rollback specific component

Environment:
    development, staging, production

Components:
    frontend, backend, infrastructure

Options:
    -h, --help    Show this help message
EOF
}

# Main script execution
main() {
    case "${1:-}" in
        rollback-all)
            shift
            if [[ $# -ne 4 ]]; then
                usage
                exit 1
            fi
            rollback_all "$@"
            ;;
        rollback-component)
            shift
            if [[ $# -ne 3 ]]; then
                usage
                exit 1
            fi
            rollback_component "$@"
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi