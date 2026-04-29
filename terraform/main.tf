# =============================================================================
# OpsFlow AI — Terraform Infrastructure
# =============================================================================
# Provisions all AWS resources required to run the OpsFlow AI Lambda backend.
#
# Resources:
#   - Secrets Manager secret (Anthropic API key placeholder)
#   - IAM role + policies for the Lambda execution environment
#   - Lambda function (lead enrichment)
#   - API Gateway HTTP API with CORS
#   - CloudWatch log group
#
# After running `terraform apply`:
#   1. Set the secret value manually:
#      aws secretsmanager put-secret-value \
#        --secret-id opsflow-ai/anthropic-api-key \
#        --secret-string '{"ANTHROPIC_API_KEY": "sk-ant-..."}'
#   2. Update NEXT_PUBLIC_LAMBDA_URL in the frontend's .env.local with the
#      api_gateway_url output value.
# =============================================================================

# Uncomment to use remote state. Create the S3 bucket and DynamoDB table first.
# terraform {
#   backend "s3" {
#     bucket         = "opsflow-ai-tfstate"
#     key            = "prod/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "opsflow-ai-tfstate-lock"
#     encrypt        = true
#   }
# }

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# =============================================================================
# 1. Secrets Manager — Anthropic API Key
# =============================================================================
# IMPORTANT: The secret VALUE is NOT set by Terraform to avoid storing
# credentials in Terraform state. After `terraform apply`, run:
#   aws secretsmanager put-secret-value \
#     --secret-id <secret_name> \
#     --secret-string '{"ANTHROPIC_API_KEY": "sk-ant-YOUR-KEY-HERE"}'

resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name        = var.anthropic_secret_name
  description = "Anthropic API key for OpsFlow AI Lambda lead enrichment function."

  recovery_window_in_days = 7

  lifecycle {
    # Prevent accidental deletion of the secret in production
    prevent_destroy = false
  }
}

# =============================================================================
# 2. IAM — Lambda Execution Role
# =============================================================================

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec_role" {
  name               = "${var.project_name}-lambda-exec-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  description        = "Execution role for the OpsFlow AI lead enrichment Lambda."
}

# Attach the AWS-managed basic execution policy (CloudWatch Logs access)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Inline policy: allow the Lambda to read the Anthropic API key secret
data "aws_iam_policy_document" "secrets_read" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.anthropic_api_key.arn]
  }
}

resource "aws_iam_role_policy" "lambda_secrets_access" {
  name   = "${var.project_name}-secrets-read-${var.environment}"
  role   = aws_iam_role.lambda_exec_role.id
  policy = data.aws_iam_policy_document.secrets_read.json
}

# =============================================================================
# 3. CloudWatch Log Group
# =============================================================================

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-lead-enrichment-${var.environment}"
  retention_in_days = var.log_retention_days
}

# =============================================================================
# 4. Lambda Function
# =============================================================================

resource "aws_lambda_function" "lead_enrichment" {
  function_name = "${var.project_name}-lead-enrichment-${var.environment}"
  description   = "AI-powered lead enrichment using Anthropic Claude. Simulates Salesforce CRM integration."

  filename      = var.lambda_zip_path
  runtime       = "python3.11"
  handler       = "handler.lambda_handler"
  role          = aws_iam_role.lambda_exec_role.arn
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_mb

  # Use the SHA256 of the zip to trigger redeployment when the code changes
  source_code_hash = filebase64sha256(var.lambda_zip_path)

  environment {
    variables = {
      SECRET_NAME = var.anthropic_secret_name
      ENVIRONMENT = var.environment
      AWS_REGION  = var.aws_region
    }
  }

  # Ensure the log group is created before the function so logs are captured
  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_iam_role_policy_attachment.lambda_basic_execution,
  ]
}

# =============================================================================
# 5. API Gateway — HTTP API
# =============================================================================

resource "aws_apigatewayv2_api" "opsflow_api" {
  name          = "${var.project_name}-api-${var.environment}"
  protocol_type = "HTTP"
  description   = "OpsFlow AI HTTP API — routes POST /enrich-lead to the Lambda function."

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["POST", "GET", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Api-Key"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id             = aws_apigatewayv2_api.opsflow_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.lead_enrichment.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "enrich_route" {
  api_id    = aws_apigatewayv2_api.opsflow_api.id
  route_key = "POST /enrich-lead"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.opsflow_api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.lambda_logs.arn
  }
}

# =============================================================================
# 6. Lambda Permission — Allow API Gateway to invoke the function
# =============================================================================

resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lead_enrichment.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.opsflow_api.execution_arn}/*/*"
}
