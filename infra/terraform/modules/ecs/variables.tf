variable "project_name" {
  description = "Project name prefix for ECS resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
}

variable "cpu" {
  description = "Task CPU units"
  type        = string
}

variable "memory" {
  description = "Task memory in MiB"
  type        = string
}

variable "image_uri" {
  description = "Container image URI for the ECS task"
  type        = string
}

variable "container_port" {
  description = "Container port exposed by the ECS service"
  type        = number
}

variable "aws_region" {
  description = "AWS region for CloudWatch logging"
  type        = string
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "target_group_arn" {
  description = "Target group ARN for the ECS service load balancer"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for ECS task security group"
  type        = string
}
