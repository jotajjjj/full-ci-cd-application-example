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

        // NUEVO STAGE: Verificar y crear el Secret de GHCR en Kubernetes
        stage('Verify GHCR Secret') {
            steps {
                container('kubectl') {
                    withCredentials([string(credentialsId: 'ghcr-token', variable: 'GHCR_TOKEN')]) {
                        sh '''
                            echo "🔍 Verificando secret de GHCR en Kubernetes..."
                            if ! kubectl get secret ghcr-secret -n devops-tools &>/dev/null; then
                                echo "📝 Creando secret ghcr-secret..."
                                kubectl create secret docker-registry ghcr-secret \
                                    --docker-server=ghcr.io \
                                    --docker-username=jotajjjj \
                                    --docker-password="$GHCR_TOKEN" \
                                    --docker-email=jenkins@example.com \
                                    -n devops-tools
                                echo "✅ Secret creado exitosamente"
                            else
                                echo "✅ Secret ya existe"
                            fi
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
                        echo "📊 Verificando Resource Quotas..."
                        kubectl get resourcequota -n devops-tools
                    '''
                }
            }
        }

        // STAGE MODIFICADO: Ahora incluye recursos obligatorios para la ResourceQuota
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
                                
                                echo "🔧 Asegurando que el deployment tenga los recursos requeridos..."
                                # Parchear el deployment para agregar recursos si no los tiene
                                kubectl patch deployment jugadores-app -n devops-tools -p '{
                                    "spec": {
                                        "template": {
                                            "spec": {
                                                "containers": [{
                                                    "name": "jugadores-app",
                                                    "resources": {
                                                        "requests": {
                                                            "cpu": "100m",
                                                            "memory": "128Mi"
                                                        },
                                                        "limits": {
                                                            "cpu": "200m", 
                                                            "memory": "256Mi"
                                                        }
                                                    }
                                                }]
                                            }
                                        }
                                    }
                                }' || echo "ℹ️  El deployment ya tiene recursos configurados"
                            else
                                echo "🚀 Creando nuevo deployment con recursos y imagePullSecrets..."
                                cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jugadores-app
  namespace: devops-tools
  labels:
    app: jugadores-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jugadores-app
  template:
    metadata:
      labels:
        app: jugadores-app
    spec:
      containers:
      - name: jugadores-app
        image: ${DOCKER_IMAGE}:${DOCKER_TAG}
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
      imagePullSecrets:
      - name: ghcr-secret
EOF
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
                        echo "⏳ Esperando a que el deployment esté listo..."
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

        // STAGE MEJORADO: Más información de diagnóstico
        stage('Verify Application') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "🔍 Verificando estado de la aplicación..."
                        kubectl get deployment jugadores-app -n devops-tools -o wide
                        
                        echo "📋 Pods del deployment:"
                        kubectl get pods -n devops-tools -l app=jugadores-app -o wide
                        
                        echo "🔎 Diagnóstico detallado:"
                        # Verificar eventos recientes
                        echo "📢 Últimos eventos:"
                        kubectl get events -n devops-tools --sort-by='.lastTimestamp' | tail -10
                        
                        # Verificar detalles del pod si existe
                        POD_NAME=$(kubectl get pods -n devops-tools -l app=jugadores-app -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
                        if [ -n "$POD_NAME" ]; then
                            echo "🔍 Describiendo pod: $POD_NAME"
                            kubectl describe pod $POD_NAME -n devops-tools
                            
                            echo "📄 Logs del pod:"
                            kubectl logs $POD_NAME -n devops-tools --tail=50 || echo "No se pudieron obtener logs aún"
                        else
                            echo "❌ No hay pods corriendo para el deployment"
                            echo "📢 Mostrando todos los eventos para diagnóstico:"
                            kubectl get events -n devops-tools --sort-by='.lastTimestamp' | tail -20
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