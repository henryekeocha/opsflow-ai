output "api_gateway_url" {
  description = "Invoke URL for the API Gateway HTTP API. Set this as NEXT_PUBLIC_LAMBDA_URL in the frontend."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "lambda_function_arn" {
  description = "ARN of the lead enrichment Lambda function."
  value       = aws_lambda_function.lead_enrichment.arn
}

output "lambda_function_name" {
  description = "Name of the lead enrichment Lambda function."
  value       = aws_lambda_function.lead_enrichment.function_name
}

output "secret_arn" {
  description = "ARN of the Anthropic API key secret in Secrets Manager."
  value       = aws_secretsmanager_secret.anthropic_api_key.arn
}

output "secret_set_command" {
  description = "CLI command to set the Anthropic API key secret value after apply."
  value = join(" ", [
    "aws secretsmanager put-secret-value",
    "--secret-id ${aws_secretsmanager_secret.anthropic_api_key.name}",
    "--secret-string '{\"ANTHROPIC_API_KEY\": \"sk-ant-YOUR-KEY-HERE\"}'",
    "--region ${var.aws_region}",
  ])
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name for the Lambda function."
  value       = aws_cloudwatch_log_group.lambda_logs.name
}
