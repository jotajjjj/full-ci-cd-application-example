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
  - name: network-tools
    image: curlimages/curl:latest
    command: ['sleep', 'infinity']
"""
        }
    }
    stages {
        stage('Network Test') {
            steps {
                container('network-tools') {
                    sh '''
                        echo "🔍 Testing Jenkins connectivity..."
                        echo "Testing DNS resolution:"
                        nslookup jenkins-service.devops-tools.svc.cluster.local
                        
                        echo "Testing HTTP connection:"
                        curl -v http://jenkins-service.devops-tools.svc.cluster.local:8080 || echo "Curl failed but continuing..."
                        
                        echo "Testing IP connectivity:"
                        ping -c 2 jenkins-service.devops-tools.svc.cluster.local || echo "Ping failed but continuing..."
                    '''
                }
            }
        }
        stage('Main Test') {
            steps {
                sh 'echo "🎉 Si ves este mensaje, el agente está conectado correctamente!"'
            }
        }
    }
}