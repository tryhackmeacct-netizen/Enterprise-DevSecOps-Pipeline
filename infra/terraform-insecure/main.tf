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
  region = "us-east-1"
}

resource "aws_vpc" "insecure_vpc" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "insecure_public_subnet" {
  vpc_id                  = aws_vpc.insecure_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
}

resource "aws_internet_gateway" "insecure_igw" {
  vpc_id = aws_vpc.insecure_vpc.id
}

resource "aws_route_table" "insecure_public_rt" {
  vpc_id = aws_vpc.insecure_vpc.id
}

resource "aws_route" "insecure_default_route" {
  route_table_id         = aws_route_table.insecure_public_rt.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.insecure_igw.id
}

resource "aws_route_table_association" "insecure_public_rta" {
  subnet_id      = aws_subnet.insecure_public_subnet.id
  route_table_id = aws_route_table.insecure_public_rt.id
}

resource "aws_security_group" "insecure_sg" {
  name        = "insecure-app-sg"
  description = "Security group with wide-open SSH"
  vpc_id      = aws_vpc.insecure_vpc.id
}

resource "aws_security_group_rule" "insecure_ssh_inbound" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.insecure_sg.id
}

resource "aws_security_group_rule" "insecure_http_inbound" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.insecure_sg.id
}

resource "aws_security_group_rule" "insecure_all_outbound" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.insecure_sg.id
}

resource "aws_iam_role" "insecure_instance_role" {
  name = "insecure-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "insecure_admin_attach" {
  role       = aws_iam_role.insecure_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_instance_profile" "insecure_instance_profile" {
  name = "insecure-ec2-profile"
  role = aws_iam_role.insecure_instance_role.name
}

resource "aws_instance" "insecure_ec2" {
  ami                         = "ami-0c55b159cbfafe1f0"
  instance_type               = "t2.micro"
  subnet_id                   = aws_subnet.insecure_public_subnet.id
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.insecure_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.insecure_instance_profile.name
}

resource "aws_s3_bucket" "insecure_bucket" {
  bucket = "insecure-app-data-bucket-2026"
  acl    = "public-read"
}

resource "aws_s3_bucket_public_access_block" "insecure_bucket_block" {
  bucket                  = aws_s3_bucket.insecure_bucket.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_cloudwatch_log_group" "insecure_log_group" {
  name = "insecure-app-logs"
}
