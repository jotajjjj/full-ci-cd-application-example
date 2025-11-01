pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: jugadores-app
spec:
  serviceAccountName: jenkins
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

    - name: kaniko
      image: gcr.io/kaniko-project/executor:debug
      command: ["/busybox/cat"]
      tty: true
      resources:
        requests:
          cpu: "500m"
          memory: "512Mi"
        limits:
          cpu: "1000m"
          memory: "1Gi"
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker/

    - name: kubectl
      image: bitnami/kubectl:latest
      command: ["sleep"]
      args: ["infinity"]
      tty: true
      resources:
        requests:
          cpu: "250m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"

  volumes:
    - name: docker-config
      emptyDir: {}
"""
        }
    }

    environment {
        DOCKER_IMAGE = "ghcr.io/jotajjj/jugadores-app"
        DOCKER_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
    }

    stages {
        stage('Prepare Docker Auth') {
            steps {
                container('jnlp') {
                    withCredentials([string(credentialsId: 'ghcr-token', variable: 'GHCR_TOKEN')]) {
                        sh '''
                            echo "🔑 Configurando autenticación para GHCR..."
                            mkdir -p /home/jenkins/agent/.docker
                            cat > /home/jenkins/agent/.docker/config.json << EOF
{
  "auths": {
    "ghcr.io": {
      "auth": "$(echo -n "jotajjj:$GHCR_TOKEN" | base64 -w 0)"
    }
  }
}
EOF
                            echo "✅ Docker config creado"
                            cp /home/jenkins/agent/.docker/config.json /kaniko/.docker/
                        '''
                    }
                }
            }
        }

        stage('Build & Push') {
            steps {
                container('kaniko') {
                    sh """
                        /kaniko/executor \\
                            --context=/home/jenkins/agent/workspace/ \\
                            --dockerfile=/home/jenkins/agent/workspace/Dockerfile \\
                            --destination=${env.DOCKER_IMAGE}:${env.DOCKER_TAG} \\
                            --cache=true \\
                            --cleanup
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                container('kubectl') {
                    withCredentials([file(credentialsId: 'kubeconfig-secret', variable: 'KUBECONFIG_FILE')]) {
                        sh """
                            mkdir -p /root/.kube
                            cp ${KUBECONFIG_FILE} /root/.kube/config
                            chmod 600 /root/.kube/config
                            
                            kubectl cluster-info
                            kubectl set image deployment/jugadores-app jugadores-app=${env.DOCKER_IMAGE}:${env.DOCKER_TAG} -n devops-tools || true
                            kubectl rollout status deployment/jugadores-app -n devops-tools --timeout=300s
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completado: ${env.DOCKER_IMAGE}:${env.DOCKER_TAG}"
        }
        failure {
            echo "❌ Error en el pipeline"
        }
    }
}