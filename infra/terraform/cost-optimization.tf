# Cost Optimization Module
variable "docker_image_backend" {
  description = "Backend Docker image"
  type        = string
}

variable "docker_image_dashboard" {
  description = "Dashboard Docker image"
  type        = string
}

data "aws_caller_identity" "current" {}

resource "aws_kms_key" "alerts" {
  description             = "KMS key for Ice Truck alerting and logging resources"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
  }
}

resource "aws_kms_alias" "alerts" {
  name          = "alias/ice-truck-alerts-${var.environment}"
  target_key_id = aws_kms_key.alerts.key_id
}

resource "aws_s3_bucket" "alb_access_logs" {
  bucket = "ice-truck-alb-access-logs-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "alb_access_logs_target" {
  bucket = "ice-truck-s3-access-logs-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "alb_access_logs" {
  bucket = aws_s3_bucket.alb_access_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "alb_access_logs_target" {
  bucket = aws_s3_bucket.alb_access_logs_target.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_access_logs" {
  bucket = aws_s3_bucket.alb_access_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.alerts.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_access_logs_target" {
  bucket = aws_s3_bucket.alb_access_logs_target.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.alerts.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_logging" "alb_access_logs_target" {
  bucket = aws_s3_bucket.alb_access_logs_target.id

  target_bucket = aws_s3_bucket.alb_access_logs_target.id
  target_prefix = "self-logs/"
}

resource "aws_s3_bucket_logging" "alb_access_logs" {
  bucket = aws_s3_bucket.alb_access_logs.id

  target_bucket = aws_s3_bucket.alb_access_logs_target.id
  target_prefix = "alb-access/"
}

resource "aws_s3_bucket_policy" "alb_access_logs_target" {
  bucket = aws_s3_bucket.alb_access_logs_target.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ServerAccessLogsWrite"
        Effect = "Allow"
        Principal = {
          Service = "logging.s3.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_access_logs_target.arn}/alb-access/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Sid    = "S3ServerAccessLogsAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "logging.s3.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_access_logs_target.arn
      },
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.alb_access_logs_target.arn,
          "${aws_s3_bucket.alb_access_logs_target.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_access_logs" {
  bucket = aws_s3_bucket.alb_access_logs_target.id

  rule {
    id     = "retain-access-logs-90-days"
    status = "Enabled"

    filter {
      prefix = "alb-access/"
    }

    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_policy" "alb_access_logs" {
  bucket = aws_s3_bucket.alb_access_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSLogDeliveryWrite"
        Effect = "Allow"
        Principal = {
          Service = "logdelivery.elasticloadbalancing.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_access_logs.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Sid    = "AWSLogDeliveryAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "logdelivery.elasticloadbalancing.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_access_logs.arn
      },
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.alb_access_logs.arn,
          "${aws_s3_bucket.alb_access_logs.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# ============================================================================
# APPLICATION DATA BUCKET (SonarQube S3 Hotspot Fix #1 & #2)
# ============================================================================

resource "aws_s3_bucket" "app_data" {
  bucket = "ice-truck-app-data-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
    Purpose     = "Application data storage"
  }
}

resource "aws_s3_bucket_public_access_block" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.alerts.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_logging" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  target_bucket = aws_s3_bucket.alb_access_logs_target.id
  target_prefix = "app-data-logs/"
}

resource "aws_s3_bucket_policy" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.app_data.arn,
          "${aws_s3_bucket.app_data.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.app_data.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}

# ============================================================================
# ARTIFACTS BUCKET (SonarQube S3 Hotspot Fix #3)
# ============================================================================

resource "aws_s3_bucket" "artifacts" {
  bucket = "ice-truck-artifacts-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
    Purpose     = "Backup and artifacts storage"
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.alerts.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_logging" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  target_bucket = aws_s3_bucket.alb_access_logs_target.id
  target_prefix = "artifacts-logs/"
}

resource "aws_s3_bucket_policy" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.artifacts.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "retain-artifacts-1-year"
    status = "Enabled"

    expiration {
      days = 365
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# ============================================================================
# CACHE BUCKET (SonarQube S3 Hotspot Fix #4)
# ============================================================================

resource "aws_s3_bucket" "cache" {
  bucket = "ice-truck-cache-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Environment = var.environment
    Purpose     = "Application cache and temporary data"
  }
}

resource "aws_s3_bucket_public_access_block" "cache" {
  bucket = aws_s3_bucket.cache.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cache" {
  bucket = aws_s3_bucket.cache.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.alerts.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_logging" "cache" {
  bucket = aws_s3_bucket.cache.id

  target_bucket = aws_s3_bucket.alb_access_logs_target.id
  target_prefix = "cache-logs/"
}

resource "aws_s3_bucket_policy" "cache" {
  bucket = aws_s3_bucket.cache.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.cache.arn,
          "${aws_s3_bucket.cache.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.cache.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "cache" {
  bucket = aws_s3_bucket.cache.id

  rule {
    id     = "expire-cache-30-days"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

# ECS Cluster with Spot Instances
resource "aws_ecs_cluster" "main" {
  name = "ice-truck-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "ice-truck-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  access_logs {
    bucket  = aws_s3_bucket.alb_access_logs.id
    prefix  = "alb"
    enabled = true
  }

  tags = {
    Environment = var.environment
  }
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "ice-truck-alb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name_prefix = "ice-truck-ecs-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Cost Optimization - Billing Alarms
resource "aws_cloudwatch_metric_alarm" "billing" {
  alarm_name          = "ice-truck-billing-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"
  statistic           = "Maximum"
  threshold           = "100"
  alarm_description   = "This metric monitors estimated charges"
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}

resource "aws_sns_topic" "billing_alerts" {
  name              = "ice-truck-billing-alerts"
  kms_master_key_id = aws_kms_key.alerts.arn
}

# Auto Scaling with Spot Instances
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "ice-truck-backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
