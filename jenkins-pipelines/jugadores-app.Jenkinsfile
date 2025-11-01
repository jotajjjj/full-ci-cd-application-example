pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:latest
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"
"""
        }
    }
    stages {
        stage('Test') {
            steps {
                sh 'echo "Hello from a simple pod"'
            }
        }
    }
}