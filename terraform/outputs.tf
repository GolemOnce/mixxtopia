output "ec2_public_ip" {
  description = "새 EC2의 고정 IP. 가비아 DNS A레코드를 이 값으로 전환할 것"
  value       = aws_eip.app.public_ip
}

output "media_bucket_name" {
  description = "미디어 S3 버킷 이름"
  value       = aws_s3_bucket.media.id
}

output "cloudfront_domain" {
  description = "미디어 CDN 도메인(S3_PUBLIC_BASE_URL에 쓸 값, https:// 붙여서 사용)"
  value       = aws_cloudfront_distribution.media.domain_name
}

output "atlas_connection_string" {
  description = "back-end/.env의 MONGODB_URI에 그대로 넣을 값"
  value       = local.atlas_connection_string
  sensitive   = true
}

output "ssh_command" {
  description = "새 서버 접속 커맨드"
  value       = "ssh -i <개인키 경로> ubuntu@${aws_eip.app.public_ip}"
}
