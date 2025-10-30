pipeline {
    agent {
        kubernetes {
            label "jenkins-agent-${UUID.randomUUID().toString()}"
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
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
    env:
    - name: DOCKER_HOST
      value: unix:///var/run/docker.sock
  - name: kubectl
    image: bitnami/kubectl:1.27
    command: ['cat']
    tty: true
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
  - name: jnlp
    image: jenkins/inbound-agent:latest
    args: ['\$(JENKINS_SECRET)', '\$(JENKINS_NAME)']
    resources:
      requests:
        cpu: "200m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
'''
        }
    }
    
    triggers {
        pollSCM('H/5 * * * *')  // Chequea cada 5 minutos
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
    }
    
    environment {
        // CONFIGURA ESTOS VALORES CON TUS DATOS REALES
        APP_NAME = 'jugadores-app'
        GITHUB_USER = 'jotajjjj'  // Reemplaza con tu usuario GitHub
        IMAGE_NAME = "ghcr.io/${GITHUB_USER}/${APP_NAME}"
        GITHUB_CREDENTIALS = 'github-token'
        KUBECONFIG_CREDENTIALS = 'kubeconfig-secret'
    }
    
    stages {
        stage('Checkout & Setup') {
            steps {
                checkout scm
                script {
                    // Detectar entorno por rama
                    if (env.BRANCH_NAME == 'main') {
                        env.TARGET_ENVIRONMENT = 'production'
                        env.DEPLOY_NAMESPACE = 'production'
                    } else if (env.BRANCH_NAME == 'staging') {
                        env.TARGET_ENVIRONMENT = 'staging' 
                        env.DEPLOY_NAMESPACE = 'staging'
                    } else if (env.BRANCH_NAME == 'develop') {
                        env.TARGET_ENVIRONMENT = 'dev'
                        env.DEPLOY_NAMESPACE = 'dev'
                    } else {
                        env.TARGET_ENVIRONMENT = 'none'
                    }
                    
                    // Tag único para la imagen
                    env.IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                    
                    echo "🎯 Configuración Detected:"
                    echo "  Rama: ${env.BRANCH_NAME}"
                    echo "  Entorno: ${env.TARGET_ENVIRONMENT}"
                    echo "  Namespace: ${env.DEPLOY_NAMESPACE}"
                    echo "  Image: ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
                }
            }
        }
        
        stage('Setup Kubeconfig') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                container('kubectl') {
                    script {
                        withCredentials([file(credentialsId: env.KUBECONFIG_CREDENTIALS, variable: 'KUBECONFIG_FILE')]) {
                            sh '''
                                mkdir -p /root/.kube
                                cp ${KUBECONFIG_FILE} /root/.kube/config
                                chmod 600 /root/.kube/config
                                
                                # Verificar conexión
                                echo "=== Verificando cluster ==="
                                kubectl cluster-info
                                echo "=== Creando namespace si no existe ==="
                                kubectl create namespace ${DEPLOY_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                            '''
                        }
                    }
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
                                    echo "🔐 Autenticando con GHCR..."
                                    echo ${GITHUB_TOKEN} | docker login ghcr.io -u ${GITHUB_USER} --password-stdin
                                    
                                    # Construir imagen
                                    echo "🏗️ Construyendo imagen..."
                                    docker build -t ${env.IMAGE_NAME}:${env.IMAGE_TAG} .
                                    
                                    # Subir imagen
                                    echo "📤 Subiendo imagen al registry..."
                                    docker push ${env.IMAGE_NAME}:${env.IMAGE_TAG}
                                    
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
                        
                        // Usar un approach más simple y robusto
                        sh """
                            # Aplicar deployment básico
                            cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}
  namespace: ${DEPLOY_NAMESPACE}
  labels:
    app: ${APP_NAME}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${APP_NAME}
  template:
    metadata:
      labels:
        app: ${APP_NAME}
    spec:
      containers:
      - name: ${APP_NAME}
        image: ${IMAGE_NAME}:${IMAGE_TAG}
        ports:
        - containerPort: 8080
        env:
        - name: ENVIRONMENT
          value: ${TARGET_ENVIRONMENT}
---
apiVersion: v1
kind: Service
metadata:
  name: ${APP_NAME}
  namespace: ${DEPLOY_NAMESPACE}
spec:
  selector:
    app: ${APP_NAME}
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
EOF

                            # Esperar a que el rollout se complete
                            kubectl rollout status deployment/${APP_NAME} -n ${DEPLOY_NAMESPACE} --timeout=300s
                            echo "✅ Despliegue completado en ${env.DEPLOY_NAMESPACE}"
                        """
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
                            kubectl get pods -n ${DEPLOY_NAMESPACE} -l app=${APP_NAME}
                            echo "=== Services ==="
                            kubectl get svc -n ${DEPLOY_NAMESPACE} -l app=${APP_NAME}
                            echo "=== Deployments ==="
                            kubectl get deployments -n ${DEPLOY_NAMESPACE} -l app=${APP_NAME}
                        """
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo "🎉 Pipeline EXITOSO! Aplicación desplegada en ${env.DEPLOY_NAMESPACE}"
            echo "📦 Imagen: ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
        }
        failure {
            echo "❌ Pipeline FALLÓ"
            script {
                echo "🔍 Revisa los logs anteriores para más detalles"
            }
        }
    }
}