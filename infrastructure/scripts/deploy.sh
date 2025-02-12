#!/usr/bin/env bash

# Sales & Intelligence Platform Deployment Script
# Version: 1.0.0
# Dependencies:
# - kubectl v1.27+
# - helm v3.12+
# - aws-cli 2.0+
# - terraform 1.5+

set -euo pipefail
IFS=$'\n\t'

# Global Configuration
readonly ENVIRONMENTS=('development' 'staging' 'production')
readonly REGIONS=('us-east-1' 'us-west-2' 'eu-west-1')
readonly COMPONENTS=('frontend' 'backend' 'infrastructure')
readonly LOG_LEVEL='INFO'
readonly TIMEOUT=600
readonly CANARY_STEPS=(5 25 50 75 100)
readonly HEALTH_CHECK_INTERVAL=30

# Logging Configuration
log() {
    local level=$1
    shift
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [${level}] $*"
}

info() { log "INFO" "$@"; }
warn() { log "WARN" "$@" >&2; }
error() { log "ERROR" "$@" >&2; }
debug() { [[ ${LOG_LEVEL} == "DEBUG" ]] && log "DEBUG" "$@"; }

# Prerequisite Checks
check_prerequisites() {
    local environment=$1
    local config=$2
    
    info "Checking prerequisites for ${environment} deployment..."
    
    # Tool version checks
    local required_tools=("kubectl" "helm" "aws" "terraform")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool not found: $tool"
            return 1
        fi
    done
    
    # AWS Authentication
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS authentication failed"
        return 1
    }
    
    # Kubernetes Context
    if ! kubectl config current-context &> /dev/null; then
        error "Kubernetes context not set"
        return 1
    }
    
    # Helm Repositories
    helm repo update &> /dev/null
    
    info "Prerequisites check completed successfully"
    return 0
}

# Infrastructure Deployment
deploy_infrastructure() {
    local environment=$1
    local config=$2
    local regions=("${!3}")
    
    info "Deploying infrastructure for ${environment}..."
    
    for region in "${regions[@]}"; do
        info "Deploying to region: ${region}"
        
        # Initialize Terraform
        terraform init \
            -backend-config="region=${region}" \
            -backend-config="bucket=sip-terraform-state-${environment}" \
            -backend-config="key=${region}/terraform.tfstate"
        
        # Acquire state lock
        if ! terraform force-unlock -force "$region"; then
            error "Failed to acquire state lock for region ${region}"
            return 1
        fi
        
        # Plan and apply
        terraform plan -out=tfplan
        terraform apply -auto-approve tfplan
        
        # Verify deployment
        if ! terraform output -json > /dev/null; then
            error "Infrastructure verification failed for region ${region}"
            return 1
        fi
    done
    
    info "Infrastructure deployment completed"
    return 0
}

# Backend Deployment
deploy_backend() {
    local environment=$1
    local version=$2
    local config=$3
    
    info "Deploying backend version ${version} to ${environment}..."
    
    # Update Helm dependencies
    helm dependency update ./charts/backend
    
    # Deploy canary
    for percentage in "${CANARY_STEPS[@]}"; do
        info "Deploying canary with ${percentage}% traffic"
        
        helm upgrade --install backend ./charts/backend \
            --namespace sales-intelligence \
            --set canary.enabled=true \
            --set canary.trafficWeight="${percentage}" \
            --set image.tag="${version}" \
            --values "./values/${environment}.yaml"
        
        # Health check loop
        local attempts=0
        while [ $attempts -lt $((TIMEOUT/HEALTH_CHECK_INTERVAL)) ]; do
            if kubectl rollout status deployment/backend-canary -n sales-intelligence; then
                info "Canary deployment healthy at ${percentage}%"
                break
            fi
            ((attempts++))
            sleep "${HEALTH_CHECK_INTERVAL}"
        done
        
        if [ $attempts -eq $((TIMEOUT/HEALTH_CHECK_INTERVAL)) ]; then
            error "Canary deployment failed at ${percentage}%"
            rollback "backend" "${version}" "${config}"
            return 1
        fi
    done
    
    info "Backend deployment completed successfully"
    return 0
}

# Frontend Deployment
deploy_frontend() {
    local environment=$1
    local version=$2
    local config=$3
    
    info "Deploying frontend version ${version} to ${environment}..."
    
    # Deploy to staging first
    helm upgrade --install frontend-staging ./charts/frontend \
        --namespace sales-intelligence \
        --set image.tag="${version}" \
        --values "./values/${environment}-staging.yaml"
    
    # Run integration tests
    if ! npm run integration-tests; then
        error "Frontend integration tests failed"
        return 1
    fi
    
    # Update CDN configuration
    aws cloudfront create-invalidation \
        --distribution-id "${config[cdn_distribution_id]}" \
        --paths "/*"
    
    # Deploy to production
    helm upgrade --install frontend ./charts/frontend \
        --namespace sales-intelligence \
        --set image.tag="${version}" \
        --values "./values/${environment}.yaml"
    
    info "Frontend deployment completed successfully"
    return 0
}

# Rollback Procedure
rollback() {
    local component=$1
    local version=$2
    local config=$3
    
    error "Initiating rollback for ${component} from version ${version}"
    
    case ${component} in
        "backend")
            helm rollback backend -n sales-intelligence
            ;;
        "frontend")
            helm rollback frontend -n sales-intelligence
            aws cloudfront create-invalidation \
                --distribution-id "${config[cdn_distribution_id]}" \
                --paths "/*"
            ;;
        "infrastructure")
            terraform destroy -auto-approve
            terraform workspace select previous
            terraform apply -auto-approve
            ;;
        *)
            error "Unknown component: ${component}"
            return 1
            ;;
    esac
    
    info "Rollback completed for ${component}"
    return 0
}

# Main Deployment Function
deploy_all() {
    local environment=$1
    local version=$2
    local config=$3
    
    info "Starting deployment for environment: ${environment}"
    
    # Validate environment
    if [[ ! " ${ENVIRONMENTS[*]} " =~ ${environment} ]]; then
        error "Invalid environment: ${environment}"
        return 1
    }
    
    # Check prerequisites
    if ! check_prerequisites "${environment}" "${config}"; then
        error "Prerequisites check failed"
        return 1
    }
    
    # Deploy infrastructure
    if ! deploy_infrastructure "${environment}" "${config}" REGIONS[@]; then
        error "Infrastructure deployment failed"
        return 1
    }
    
    # Deploy backend
    if ! deploy_backend "${environment}" "${version}" "${config}"; then
        error "Backend deployment failed"
        return 1
    }
    
    # Deploy frontend
    if ! deploy_frontend "${environment}" "${version}" "${config}"; then
        error "Frontend deployment failed"
        return 1
    }
    
    info "Deployment completed successfully"
    return 0
}

# Component-specific deployment
deploy_component() {
    local component=$1
    local environment=$2
    local version=$3
    local config=$4
    
    info "Starting deployment of ${component} to ${environment}"
    
    case ${component} in
        "backend")
            deploy_backend "${environment}" "${version}" "${config}"
            ;;
        "frontend")
            deploy_frontend "${environment}" "${version}" "${config}"
            ;;
        "infrastructure")
            deploy_infrastructure "${environment}" "${config}" REGIONS[@]
            ;;
        *)
            error "Unknown component: ${component}"
            return 1
            ;;
    esac
}

# Export functions for external use
export -f deploy_all
export -f deploy_component
export -f rollback

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -lt 3 ]]; then
        error "Usage: $0 <environment> <version> <config_file>"
        exit 1
    fi
    
    deploy_all "$1" "$2" "$3"
fi