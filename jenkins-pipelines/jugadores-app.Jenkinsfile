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
    env:
    - name: JENKINS_URL
      value: "http://jenkins-service.devops-tools.svc.cluster.local:8080"
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
        stage('Simple Test') {
            steps {
                sh 'echo "✅ ¡Conectado exitosamente a Jenkins!"'
                sh 'echo "URL: $JENKINS_URL"'
                sh 'hostname'
                sh 'pwd'
            }
        }
    }
}