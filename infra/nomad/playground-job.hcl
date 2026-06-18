job "playground-SESSION_ID" {
  datacenters = ["linode-us-east"]
  type        = "service"

  group "session" {
    count = 1

    network {
      port "ttyd" { to = 7681 }
    }

    task "session" {
      driver = "docker"

      config {
        image   = "camora/pg-ENVIRONMENT:latest"
        runtime = "sysbox-runc"
        ports   = ["ttyd"]
        command = "/start.sh"
      }

      resources {
        cpu    = RESOURCE_CPU
        memory = RESOURCE_MEM
      }

      env {
        SESSION_ID  = "SESSION_ID"
        SCENARIO_ID = "SCENARIO_ID"
      }

      kill_timeout = "10s"

      service {
        name = "playground-SESSION_ID"
        port = "ttyd"
        check {
          type     = "tcp"
          interval = "5s"
          timeout  = "2s"
        }
      }
    }
  }
}
