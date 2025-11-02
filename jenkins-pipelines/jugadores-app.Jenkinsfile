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
      image: alpine/kubectl:1.34.1
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

        stage('Verify Kubernetes Access') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "🔍 Verificando acceso a Kubernetes..."
                        kubectl get nodes
                        kubectl get pods -n devops-tools
                        kubectl get deployments -n devops-tools
                    '''
                }
            }
        }

        stage('Create or Update Deployment') {
            steps {
                container('kubectl') {
                    script {
                        echo "🔄 Creando o actualizando deployment..."
                        sh '''
                            # Verificar si el deployment existe
                            if kubectl get deployment jugadores-app -n devops-tools &>/dev/null; then
                                echo "📦 Actualizando deployment existente..."
                                kubectl set image deployment/jugadores-app jugadores-app="${DOCKER_IMAGE}:${DOCKER_TAG}" -n devops-tools
                            else
                                echo "🚀 Creando nuevo deployment..."
                                kubectl create deployment jugadores-app \
                                    --image=${DOCKER_IMAGE}:${DOCKER_TAG} \
                                    --namespace=devops-tools \
                                    --port=80
                            fi
                        '''
                    }
                }
            }
        }

        stage('Wait for Deployment') {
            steps {
                container('kubectl') {
                    script {
                        echo "⏳ Esperando a que el deployment esté listo (con timeout más largo)..."
                        sh '''
                            # Esperar con timeout más largo para la primera descarga de imagen
                            timeout 600s bash -c '
                                while true; do
                                    if kubectl get deployment/jugadores-app -n devops-tools -o jsonpath="{.status.availableReplicas}" | grep -q "1"; then
                                        echo "✅ Deployment listo y disponible"
                                        break
                                    fi
                                    echo "⏰ Esperando a que el deployment esté disponible..."
                                    sleep 10
                                done
                            ' || echo "⚠️  Timeout alcanzado, pero continuando..."
                            
                            # Verificar estado final
                            echo "🔍 Estado final del deployment:"
                            kubectl get deployment jugadores-app -n devops-tools -o wide
                            kubectl get pods -n devops-tools -l app=jugadores-app
                        '''
                    }
                }
            }
        }

        stage('Verify Application') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "🔍 Verificando estado de la aplicación..."
                        kubectl get deployment jugadores-app -n devops-tools -o wide
                        
                        echo "📋 Pods del deployment:"
                        kubectl get pods -n devops-tools -l app=jugadores-app -o wide
                        
                        # Verificar logs si el pod está corriendo
                        if kubectl get pods -n devops-tools -l app=jugadores-app -o jsonpath="{.items[0].status.phase}" | grep -q "Running"; then
                            echo "📄 Últimos logs del pod:"
                            kubectl logs -n devops-tools -l app=jugadores-app --tail=10 || echo "No se pudieron obtener logs aún"
                        fi
                        
                        echo "✅ Proceso de despliegue completado"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "🏁 Pipeline ejecutado"
            echo "📦 Imagen: ${env.DOCKER_IMAGE}:${env.DOCKER_TAG}"
            echo "🌐 Deployment: jugadores-app en namespace devops-tools"
        }
        success {
            echo "🎉 ¡Pipeline ejecutado con éxito!"
            echo "✅ La aplicación está siendo desplegada"
        }
        unstable {
            echo "⚠️  Pipeline completado con advertencias"
            echo "📋 El deployment puede estar aún iniciándose"
        }
        failure {
            echo "❌ Error durante la ejecución del pipeline"
        }
    }
}