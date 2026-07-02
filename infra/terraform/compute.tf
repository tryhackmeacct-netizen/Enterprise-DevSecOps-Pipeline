resource "aws_cloudwatch_log_group" "flow_logs" {
  count = var.enable_cloudwatch_logs ? 1 : 0

  name              = "/${var.project_name}/${var.environment}/vpc-flow-logs"
  retention_in_days = 365

  tags = {
    Name = "${var.project_name}-${var.environment}-flow-logs"
  }
}

resource "aws_cloudwatch_log_group" "app" {
  count = var.enable_cloudwatch_logs ? 1 : 0

  name              = "/${var.project_name}/${var.environment}/app"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-${var.environment}-app-logs"
  }
}

resource "aws_launch_template" "app" {
  name_prefix   = "${var.project_name}-${var.environment}-"
  image_id      = var.ec2_ami
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2.name
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -ex
    yum update -y
    amazon-linux-extras install -y nginx1
    systemctl enable nginx
    systemctl start nginx
    echo "Health check OK" > /usr/share/nginx/html/health.html
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-${var.environment}-app-instance"
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name = "${var.project_name}-${var.environment}-app-volume"
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-launch-template"
  }
}

resource "aws_instance" "app" {
  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  subnet_id = aws_subnet.private[0].id

  monitoring = true

  root_block_device {
    encrypted   = true
    volume_type = "gp3"
    volume_size = 20
    tags = {
      Name = "${var.project_name}-${var.environment}-app-root-volume"
    }
  }

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-app-instance"
  }
}

resource "aws_lb" "app" {
  count = length(var.public_subnet_cidrs) > 0 ? 1 : 0

  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  access_logs {
    bucket  = aws_s3_bucket.logs.id
    prefix  = "alb-logs"
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}

resource "aws_lb_target_group" "app" {
  count = length(var.public_subnet_cidrs) > 0 ? 1 : 0

  name     = "${var.project_name}-${var.environment}-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    interval            = 30
    path                = "/health"
    port                = 3000
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-tg"
  }
}

resource "aws_lb_listener" "app_http" {
  count = length(var.public_subnet_cidrs) > 0 ? 1 : 0

  load_balancer_arn = aws_lb.app[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }
}

resource "aws_lb_target_group_attachment" "app" {
  count = length(var.public_subnet_cidrs) > 0 ? 1 : 0

  target_group_arn = aws_lb_target_group.app[0].arn
  target_id        = aws_instance.app.id
  port             = 3000
}
