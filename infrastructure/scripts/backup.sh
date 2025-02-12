#!/bin/bash

# Sales & Intelligence Platform - Enterprise Backup Script
# Version: 1.0.0
# Description: Automated backup management for PostgreSQL databases and application data
# Dependencies: aws-cli (2.0+), postgresql-client (15+)

set -euo pipefail
IFS=$'\n\t'

# Global Configuration
BACKUP_DIR="/tmp/backups"
RETENTION_DAYS=7
LOG_FILE="/var/log/backup.log"
MAX_PARALLEL_JOBS=4
COMPRESSION_LEVEL=9
S3_STORAGE_CLASS="STANDARD_IA"
ERROR_RETRY_COUNT=3
ALERT_SNS_TOPIC="arn:aws:sns:region:account:backup-alerts"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_NAME=$(basename "$0")

# Logging Configuration
setup_logging() {
    exec 1> >(tee -a "${LOG_FILE}")
    exec 2> >(tee -a "${LOG_FILE}" >&2)
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ${SCRIPT_NAME}: Starting backup process"
}

# Error handling
error_handler() {
    local exit_code=$?
    local line_number=$1
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: Script failed at line ${line_number} with exit code ${exit_code}"
    aws sns publish \
        --topic-arn "${ALERT_SNS_TOPIC}" \
        --message "Backup script failed at line ${line_number} with exit code ${exit_code}" \
        --subject "Backup Failure Alert - ${HOSTNAME}"
    exit "${exit_code}"
}
trap 'error_handler ${LINENO}' ERR

# Check prerequisites for backup operation
check_prerequisites() {
    local required_commands=("aws" "pg_dump" "pg_basebackup" "openssl")
    local exit_code=0

    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Checking prerequisites..."

    # Verify required commands
    for cmd in "${required_commands[@]}"; do
        if ! command -v "${cmd}" >/dev/null 2>&1; then
            echo "ERROR: Required command '${cmd}' not found"
            exit_code=1
        fi
    done

    # Check AWS CLI version
    local aws_version
    aws_version=$(aws --version 2>&1 | cut -d/ -f2 | cut -d' ' -f1)
    if [[ $(echo "${aws_version} 2.0" | awk '{print ($1 < $2)}') -eq 1 ]]; then
        echo "ERROR: AWS CLI version must be 2.0 or higher"
        exit_code=1
    fi

    # Verify AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo "ERROR: Invalid AWS credentials"
        exit_code=1
    fi

    # Check available disk space (require at least 20GB)
    local available_space
    available_space=$(df -BG "${BACKUP_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ ${available_space} -lt 20 ]]; then
        echo "ERROR: Insufficient disk space. Required: 20GB, Available: ${available_space}GB"
        exit_code=1
    fi

    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"
    chmod 700 "${BACKUP_DIR}"

    return ${exit_code}
}

# Backup database with parallel processing and encryption
backup_database() {
    local db_host=$1
    local db_name=$2
    local backup_path=$3
    local compression_level=$4
    local parallel_jobs=$5
    local start_time
    local end_time
    local duration
    local backup_size
    local checksum

    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting backup of database ${db_name}"
    start_time=$(date +%s)

    # Create backup with parallel processing
    PGPASSWORD="${PGPASSWORD}" pg_dump \
        -h "${db_host}" \
        -U "${PGUSER}" \
        -d "${db_name}" \
        -j "${parallel_jobs}" \
        -F directory \
        -Z "${compression_level}" \
        -f "${backup_path}.tmp"

    # Create tar archive of the backup directory
    tar czf "${backup_path}.tar.gz" -C "${backup_path}.tmp" .
    rm -rf "${backup_path}.tmp"

    # Calculate backup size and checksum
    backup_size=$(stat -f%z "${backup_path}.tar.gz")
    checksum=$(openssl dgst -sha256 "${backup_path}.tar.gz" | awk '{print $2}')

    # Encrypt backup using AWS KMS
    aws kms encrypt \
        --key-id "${KMS_KEY_ID}" \
        --plaintext fileb://"${backup_path}.tar.gz" \
        --output text \
        --query CiphertextBlob \
        > "${backup_path}.enc"

    # Clean up temporary files
    rm "${backup_path}.tar.gz"

    end_time=$(date +%s)
    duration=$((end_time - start_time))

    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup completed: Size=${backup_size}bytes, Duration=${duration}s, Checksum=${checksum}"

    # Return backup metadata
    echo "{\"backup_file\":\"${backup_path}.enc\",\"checksum\":\"${checksum}\",\"size\":${backup_size},\"duration\":${duration}}"
}

# Upload backup to S3 with multipart upload
upload_to_s3() {
    local local_file=$1
    local s3_bucket=$2
    local s3_prefix=$3
    local metadata=$4
    local upload_id
    local etag
    local part_size=$((8 * 1024 * 1024)) # 8MB part size
    local file_size
    local parts_count

    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting S3 upload: ${local_file}"

    # Initialize multipart upload
    upload_id=$(aws s3api create-multipart-upload \
        --bucket "${s3_bucket}" \
        --key "${s3_prefix}" \
        --storage-class "${S3_STORAGE_CLASS}" \
        --server-side-encryption aws:kms \
        --ssekms-key-id "${KMS_KEY_ID}" \
        --metadata "${metadata}" \
        --query UploadId \
        --output text)

    # Calculate number of parts
    file_size=$(stat -f%z "${local_file}")
    parts_count=$(( (file_size + part_size - 1) / part_size ))

    # Upload parts in parallel
    for ((i=1; i<=parts_count; i++)); do
        start_byte=$(( (i-1) * part_size ))
        if [ $i -eq $parts_count ]; then
            end_byte=$file_size
        else
            end_byte=$(( i * part_size ))
        fi

        dd if="${local_file}" bs="${part_size}" skip=$((i-1)) count=1 2>/dev/null | \
        aws s3api upload-part \
            --bucket "${s3_bucket}" \
            --key "${s3_prefix}" \
            --part-number $i \
            --upload-id "${upload_id}" \
            --body - &

        # Limit parallel uploads
        if [[ $(jobs -r -p | wc -l) -ge ${MAX_PARALLEL_JOBS} ]]; then
            wait -n
        fi
    done

    # Wait for all uploads to complete
    wait

    # Complete multipart upload
    aws s3api complete-multipart-upload \
        --bucket "${s3_bucket}" \
        --key "${s3_prefix}" \
        --upload-id "${upload_id}" \
        --multipart-upload "$(aws s3api list-parts --bucket "${s3_bucket}" --key "${s3_prefix}" --upload-id "${upload_id}" --query 'Parts[*].{PartNumber:PartNumber,ETag:ETag}')"

    etag=$(aws s3api head-object --bucket "${s3_bucket}" --key "${s3_prefix}" --query ETag --output text)
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Upload completed: s3://${s3_bucket}/${s3_prefix}"
    echo "{\"s3_url\":\"s3://${s3_bucket}/${s3_prefix}\",\"etag\":${etag}}"
}

# Cleanup old backups
cleanup_old_backups() {
    local backup_dir=$1
    local retention_days=$2
    local force_cleanup=$3
    local files_cleaned=0
    local space_reclaimed=0
    local errors=()

    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting backup cleanup"

    # Find and remove old backups
    while IFS= read -r file; do
        if [[ -f ${file} ]]; then
            file_size=$(stat -f%z "${file}")
            
            if rm "${file}"; then
                ((files_cleaned++))
                ((space_reclaimed+=file_size))
            else
                errors+=("Failed to remove: ${file}")
            fi
        fi
    done < <(find "${backup_dir}" -type f -mtime +"${retention_days}" -name "*.enc")

    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Cleanup completed: Removed ${files_cleaned} files, Reclaimed ${space_reclaimed} bytes"
    echo "{\"files_cleaned\":${files_cleaned},\"space_reclaimed\":${space_reclaimed},\"errors\":${errors[*]:-null}}"
}

# Main execution
main() {
    setup_logging
    
    if ! check_prerequisites; then
        echo "ERROR: Prerequisites check failed"
        exit 1
    fi

    # Get database endpoints from Terraform output
    DB_HOST=$(terraform output -raw primary_db_endpoint)
    REPLICA_HOST=$(terraform output -raw read_replica_endpoint)

    # Get S3 configuration from Terraform output
    S3_BUCKET=$(terraform output -raw data_backup_bucket)
    KMS_KEY_ID=$(terraform output -raw backup_kms_key_id)

    # Perform database backup
    backup_result=$(backup_database "${DB_HOST}" "${DB_NAME}" "${BACKUP_DIR}/db_backup_${TIMESTAMP}" "${COMPRESSION_LEVEL}" "${MAX_PARALLEL_JOBS}")
    
    # Upload to S3
    upload_result=$(upload_to_s3 \
        "$(echo "${backup_result}" | jq -r .backup_file)" \
        "${S3_BUCKET}" \
        "database_backups/db_backup_${TIMESTAMP}.enc" \
        "$(echo "${backup_result}" | jq -c '.')")

    # Cleanup old backups
    cleanup_old_backups "${BACKUP_DIR}" "${RETENTION_DAYS}" false

    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup process completed successfully"
}

# Execute main function
main "$@"