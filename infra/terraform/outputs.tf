output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "ec2_instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.app.id
}

output "ec2_instance_public_ip" {
  description = "Public IP of the EC2 instance (if any)"
  value       = aws_instance.app.public_ip
}

output "s3_bucket_arn" {
  description = "ARN of the application S3 bucket"
  value       = aws_s3_bucket.app.arn
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = try(aws_cloudwatch_log_group.app[0].name, null)
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = length(var.public_subnet_cidrs) > 0 ? aws_lb.app[0].dns_name : null
}

output "aws_region" {
  description = "AWS region deployed to"
  value       = var.aws_region
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}
