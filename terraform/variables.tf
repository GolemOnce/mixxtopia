variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "리소스 이름 접두사로 쓰이는 프로젝트 식별자"
  type        = string
  default     = "mixxtopia"
}

variable "domain_name" {
  description = "서비스 도메인(certbot 인증서 발급 대상, CORS 등에 사용)"
  type        = string
  default     = "mixxtopia.site"
}

variable "instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t3.small"
}

variable "ssh_public_key_path" {
  description = "EC2 접속용 SSH 공개키 파일 경로(예: ~/.ssh/mixxtopia.pub). 기존 키 재사용 가능"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "SSH(22번 포트) 접속을 허용할 IP 대역. 본인 IP만 넣는 걸 권장(예: [\"1.2.3.4/32\"])"
  type        = list(string)
}

variable "git_repo_url" {
  description = "EC2가 최초 부팅 시 clone할 저장소 주소"
  type        = string
  default     = "https://github.com/GolemOnce/mixxtopia.git"
}

variable "atlas_public_key" {
  description = "MongoDB Atlas Organization API Public Key"
  type        = string
  sensitive   = true
}

variable "atlas_private_key" {
  description = "MongoDB Atlas Organization API Private Key"
  type        = string
  sensitive   = true
}

variable "atlas_org_id" {
  description = "MongoDB Atlas Organization ID(Atlas 콘솔 > Organization Settings에서 확인)"
  type        = string
}

variable "media_bucket_name" {
  description = "미디어(사진/동영상) 저장용 S3 버킷 이름(전역에서 유일해야 함)"
  type        = string
  default     = "mixxtopia-media"
}
