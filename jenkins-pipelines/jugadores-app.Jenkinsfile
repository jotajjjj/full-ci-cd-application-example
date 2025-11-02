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
      volumeMounts:
        - name: workspace-volume
          mountPath: /home/jenkins/agent
        - name: docker-config
          mountPath: /kaniko/.docker

    - name: kaniko
      image: gcr.io/kaniko-project/executor:debug
      command: ["/busybox/cat"]
      tty: true
      resources:
        requests:
          cpu: "1000m"
          memory: "2Gi"
        limits:
          cpu: "2000m"
          memory: "4Gi"
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
        - name: workspace-volume
          mountPath: /home/jenkins/agent

    - name: kubectl
      image: bitnami/kubectl:latest
      command: ["/bin/sh"]
      args: ["-c", "tail -f /dev/null"]
      tty: true
      resources:
        requests:
          cpu: "250m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
      volumeMounts:
        - name: workspace-volume
          mountPath: /home/jenkins/agent

  volumes:
    - name: docker-config
      emptyDir: {}
    - name: workspace-volume
      emptyDir: {}
"""
        }
    }

    environment {
        DOCKER_IMAGE = "ghcr.io/jotajjjj/jugadores-app"
        DOCKER_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
    }

    stages {
        stage('Prepare Docker Auth') {
            steps {
                container('jnlp') {
                    withCredentials([string(credentialsId: 'ghcr-token', variable: 'GHCR_TOKEN')]) {
                        sh '''
                            echo "🔑 Configurando autenticación para GHCR..."
                            mkdir -p /kaniko/.docker
                            cat > /kaniko/.docker/config.json << EOF
{
  "auths": {
    "ghcr.io": {
      "auth": "$(echo -n "jotajjjj:$GHCR_TOKEN" | base64 -w 0)"
    }
  }
}
EOF
                            echo "✅ Docker config.json creado en /kaniko/.docker/"
                        '''
                    }
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                container('kaniko') {
                    script {
                        echo "🚀 Construyendo y subiendo la imagen con Kaniko..."
                        sh """
                            echo "📦 Construyendo imagen: ${env.DOCKER_IMAGE}:${env.DOCKER_TAG}"
                            
                            /kaniko/executor \\
                                --context=/home/jenkins/agent/workspace/ranch_para_app_jugadores_develop/apps/jugadores-app/ \\
                                --dockerfile=/home/jenkins/agent/workspace/ranch_para_app_jugadores_develop/apps/jugadores-app/Dockerfile \\
                                --destination=${env.DOCKER_IMAGE}:${env.DOCKER_TAG} \\
                                --cache=true \\
                                --cleanup
                        """
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    script {
                        echo "📦 Desplegando nueva versión en Kubernetes..."
                        withCredentials([file(credentialsId: 'kubeconfig-secret', variable: 'KUBECONFIG_FILE')]) {
                            sh '''
                                mkdir -p /root/.kube
                                cp "${KUBECONFIG_FILE}" /root/.kube/config
                                chmod 600 /root/.kube/config
                                
                                echo "🔍 Verificando conexión al cluster..."
                                kubectl cluster-info
                                
                                echo "🔄 Actualizando despliegue..."
                                kubectl set image deployment/jugadores-app jugadores-app="${DOCKER_IMAGE}:${DOCKER_TAG}" -n devops-tools --record=true
                                
                                echo "⏳ Esperando rollout..."
                                kubectl rollout status deployment/jugadores-app -n devops-tools --timeout=300s
                                
                                echo "✅ Despliegue completado exitosamente!"
                            '''
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completado con éxito."
            echo "📦 Imagen: ${env.DOCKER_IMAGE}:${env.DOCKER_TAG}"
        }
        failure {
            echo "❌ Error durante la ejecución del pipeline."
        }
    }
}