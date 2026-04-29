variable "aws_region" {
  description = "AWS region to deploy resources into."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used as a prefix for all resource names and tags."
  type        = string
  default     = "opsflow-ai"
}

variable "environment" {
  description = "Deployment environment (prod | staging | dev)."
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "environment must be one of: prod, staging, dev."
  }
}

variable "lambda_zip_path" {
  description = "Local path to the packaged Lambda ZIP file produced by lambda/build.sh."
  type        = string
  default     = "../lambda/lambda.zip"
}

variable "anthropic_secret_name" {
  description = "Name of the AWS Secrets Manager secret that stores the Anthropic API key."
  type        = string
  default     = "opsflow-ai/anthropic-api-key"
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds (max 900)."
  type        = number
  default     = 30
}

variable "lambda_memory_mb" {
  description = "Lambda function memory allocation in MB."
  type        = number
  default     = 256
}

variable "log_retention_days" {
  description = "CloudWatch log group retention in days."
  type        = number
  default     = 14
}
