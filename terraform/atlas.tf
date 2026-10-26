# 기존에 떠 있는 "hashtag" Atlas 클러스터(레거시 총공 DB)는 건드리지 않고, 이번 배포용으로
# 완전히 새 프로젝트/클러스터를 만든다 — 기존 서비스에는 영향이 전혀 없다.
resource "mongodbatlas_project" "main" {
  name   = "${var.project_name}-prod"
  org_id = var.atlas_org_id
}

# 무료 티어(M0) — 트래픽이 늘어나면 provider_instance_size_name만 올리면 됨(예: M10).
resource "mongodbatlas_cluster" "main" {
  project_id = mongodbatlas_project.main.id
  name       = "${var.project_name}-prod"

  provider_name               = "TENANT"
  backing_provider_name       = "AWS"
  provider_region_name        = "AP_NORTHEAST_2"
  provider_instance_size_name = "M0"

  # M0(무료 티어)는 Atlas가 메이저 버전을 자동으로 올린다(7.0 → 8.0 확인). 코드를 실제 버전에
  # 맞춰두지 않으면 plan마다 다운그레이드 시도가 잡힌다.
  mongo_db_major_version = "8.0"
}

resource "random_password" "atlas_app_user" {
  length  = 32
  special = false # 커넥션 문자열에 특수문자가 들어가면 URL 인코딩이 꼬일 수 있어 영숫자만 사용
}

resource "mongodbatlas_database_user" "app" {
  project_id         = mongodbatlas_project.main.id
  username           = "mixxtopia_app"
  password           = random_password.atlas_app_user.result
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "mixxtopia"
  }
}

# EC2의 고정 IP(Elastic IP)만 접속을 허용한다.
resource "mongodbatlas_project_ip_access_list" "app_server" {
  project_id = mongodbatlas_project.main.id
  ip_address = aws_eip.app.public_ip
  comment    = "${var.project_name} app server (terraform-managed)"
}

# 로컬 크롤러(x_crawler)가 Atlas에 직접 적재할 수 있도록 관리자 PC IP도 허용한다.
# 콘솔에서 손으로 추가하면 terraform 밖에서 상태가 어긋나므로 반드시 여기서 관리.
resource "mongodbatlas_project_ip_access_list" "admin" {
  for_each = toset(var.admin_ip_cidrs)

  project_id = mongodbatlas_project.main.id
  cidr_block = each.value
  comment    = "${var.project_name} admin PC (terraform-managed)"
}

locals {
  # Atlas가 주는 connection string(mongodb+srv://<host>/)에 유저/비밀번호를 끼워 넣는다.
  atlas_connection_string = replace(
    mongodbatlas_cluster.main.connection_strings[0].standard_srv,
    "mongodb+srv://",
    "mongodb+srv://${mongodbatlas_database_user.app.username}:${random_password.atlas_app_user.result}@",
  )
}
