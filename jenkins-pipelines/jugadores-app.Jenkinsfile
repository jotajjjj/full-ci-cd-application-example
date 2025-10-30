pipeline {
    agent {
        kubernetes {
            // Eliminamos el label deprecated y usamos la definición directa del pod
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: docker
    image: docker:24.0.7
    command: ['cat']
    tty: true
    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "300m"
        memory: "256Mi"
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
    env:
    - name: DOCKER_HOST
      value: unix:///var/run/docker.sock
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ['cat']
    tty: true
    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "128Mi"
  - name: jnlp
    image: jenkins/inbound-agent:jdk17
    args: ['\$(JENKINS_SECRET)', '\$(JENKINS_NAME)']
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"
    env:
      - name: JENKINS_URL
        value: "http://jenkins-service.devops-tools.svc.cluster.local:8080/"
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
'''
        }
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        retry(2) // Reintentar en caso de fallos temporales
    }
    
    environment {
        APP_NAME = 'jugadores-app'
        GITHUB_USER = 'jotajjjj'
        IMAGE_NAME = "ghcr.io/${GITHUB_USER}/${APP_NAME}"
        GITHUB_CREDENTIALS = 'github-token'
        KUBECONFIG_CREDENTIALS = 'kubeconfig-secret'
    }
    
    stages {
        stage('Checkout & Setup') {
            steps {
                checkout scm
                script {
                    // Definir entornos basados en ramas
                    def branchEnvMap = [
                        'main': 'production',
                        'staging': 'staging', 
                        'develop': 'dev'
                    ]
                    
                    env.TARGET_ENVIRONMENT = branchEnvMap.get(env.BRANCH_NAME, 'none')
                    env.DEPLOY_NAMESPACE = branchEnvMap.get(env.BRANCH_NAME, 'none')
                    env.IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}".replace('/', '-')
                    
                    echo "🎯 Configuración:"
                    echo "  Rama: ${env.BRANCH_NAME}"
                    echo "  Entorno: ${env.TARGET_ENVIRONMENT}"
                    echo "  Namespace: ${env.DEPLOY_NAMESPACE}"
                    echo "  Image: ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
                }
            }
        }
        
        stage('Build Docker Image') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                container('docker') {
                    script {
                        echo "🐳 Construyendo imagen Docker..."
                        withCredentials([string(credentialsId: env.GITHUB_CREDENTIALS, variable: 'GITHUB_TOKEN')]) {
                            dir('apps/jugadores-app') {
                                sh """
                                    # Login a GitHub Container Registry
                                    echo \$GITHUB_TOKEN | docker login ghcr.io -u ${GITHUB_USER} --password-stdin
                                    
                                    # Construir imagen optimizando cache
                                    docker build \
                                        --tag ${env.IMAGE_NAME}:${env.IMAGE_TAG} \
                                        --tag ${env.IMAGE_NAME}:latest \
                                        .
                                    
                                    # Subir imagen
                                    docker push ${env.IMAGE_NAME}:${env.IMAGE_TAG}
                                    docker push ${env.IMAGE_NAME}:latest
                                    
                                    echo "✅ Imagen subida: ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
                                """
                            }
                        }
                    }
                }
            }
        }
        
        stage('Deploy to Environment') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                container('kubectl') {
                    script {
                        echo "🚀 Desplegando en ${env.DEPLOY_NAMESPACE}..."
                        
                        withCredentials([file(credentialsId: env.KUBECONFIG_CREDENTIALS, variable: 'KUBECONFIG_FILE')]) {
                            sh """
                                mkdir -p /root/.kube
                                cp \$KUBECONFIG_FILE /root/.kube/config
                                chmod 600 /root/.kube/config
                                
                                # Crear namespace si no existe
                                kubectl create namespace ${env.DEPLOY_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f - || true
                                
                                # Aplicar deployment
                                cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${env.APP_NAME}
  namespace: ${env.DEPLOY_NAMESPACE}
  labels:
    app: ${env.APP_NAME}
    environment: ${env.TARGET_ENVIRONMENT}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${env.APP_NAME}
  template:
    metadata:
      labels:
        app: ${env.APP_NAME}
        environment: ${env.TARGET_ENVIRONMENT}
    spec:
      containers:
      - name: ${env.APP_NAME}
        image: ${env.IMAGE_NAME}:${env.IMAGE_TAG}
        ports:
        - containerPort: 80
        env:
        - name: ENVIRONMENT
          value: ${env.TARGET_ENVIRONMENT}
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /health.json
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health.json
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ${env.APP_NAME}-service
  namespace: ${env.DEPLOY_NAMESPACE}
  labels:
    app: ${env.APP_NAME}
spec:
  selector:
    app: ${env.APP_NAME}
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
EOF

                                # Esperar a que el rollout se complete
                                kubectl rollout status deployment/${env.APP_NAME} -n ${env.DEPLOY_NAMESPACE} --timeout=300s
                                echo "✅ Despliegue completado en ${env.DEPLOY_NAMESPACE}"
                            """
                        }
                    }
                }
            }
        }
        
        stage('Verify Deployment') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                container('kubectl') {
                    script {
                        echo "🔍 Verificando despliegue..."
                        sh """
                            echo "=== Pods ==="
                            kubectl get pods -n ${env.DEPLOY_NAMESPACE} -l app=${env.APP_NAME} -o wide
                            
                            echo "=== Services ==="
                            kubectl get svc -n ${env.DEPLOY_NAMESPACE} -l app=${env.APP_NAME} || echo "No services found"
                            
                            echo "=== Deployment Status ==="
                            kubectl get deployment/${env.APP_NAME} -n ${env.DEPLOY_NAMESPACE} -o wide
                            
                            echo "=== ReplicaSet ==="
                            kubectl get replicaset -n ${env.DEPLOY_NAMESPACE} -l app=${env.APP_NAME}
                        """
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo "🧹 Limpiando recursos temporales..."
            script {
                if (env.TARGET_ENVIRONMENT != 'none') {
                    container('kubectl') {
                        withCredentials([file(credentialsId: env.KUBECONFIG_CREDENTIALS, variable: 'KUBECONFIG_FILE')]) {
                            sh '''
                                mkdir -p /root/.kube
                                cp $KUBECONFIG_FILE /root/.kube/config
                                chmod 600 /root/.kube/config
                                
                                # Limpiar configuraciones temporales
                                rm -f /root/.kube/config
                            '''
                        }
                    }
                }
            }
        }
        success {
            echo "🎉 Pipeline EXITOSO! Aplicación desplegada en ${env.DEPLOY_NAMESPACE}"
        }
        failure {
            echo "❌ Pipeline FALLÓ"
            // Opcional: Revertir deployment en caso de fallo
            script {
                if (env.TARGET_ENVIRONMENT != 'none') {
                    container('kubectl') {
                        withCredentials([file(credentialsId: env.KUBECONFIG_CREDENTIALS, variable: 'KUBECONFIG_FILE')]) {
                            sh """
                                mkdir -p /root/.kube
                                cp \$KUBECONFIG_FILE /root/.kube/config
                                chmod 600 /root/.kube/config
                                
                                echo "🔄 Revertiendo deployment debido a fallo..."
                                kubectl rollout undo deployment/${env.APP_NAME} -n ${env.DEPLOY_NAMESPACE} || true
                            """
                        }
                    }
                }
            }
        }
    }
}