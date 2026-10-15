# Terraform state를 S3에 원격 보관한다 — state 파일 안에 Atlas 비밀번호 등 민감값이
# 평문으로 들어가기 때문에 로컬 디스크/git에 두면 안 된다.
#
# 이 버킷은 Terraform이 스스로 만들 수 없다(상태를 저장할 곳이 먼저 있어야 하므로
# "닭이 먼저냐 달걀이 먼저냐" 문제) — README.md의 "사전 준비"대로 최초 1회만 수동으로
# 만들어두면 그 다음부터는 전부 이 파일이 자동으로 관리한다.
terraform {
  backend "s3" {
    bucket  = "mixxtopia-terraform-state" # 사전 준비 단계에서 만든 버킷 이름으로 교체
    key     = "mixxtopia/terraform.tfstate"
    region  = "ap-northeast-2" # var.aws_region과 동일한 값으로 맞출 것(백엔드 설정은 변수 참조 불가)
    encrypt = true
    # S3 네이티브 락(Terraform 1.11+)을 쓴다 — 별도 DynamoDB 락 테이블 불필요.
    use_lockfile = true
  }
}
