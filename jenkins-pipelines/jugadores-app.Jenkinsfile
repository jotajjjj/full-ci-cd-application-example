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
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  - name: kubectl
    image: bitnami/kubectl:1.28
    command: ['cat']
    tty: true
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
'''
        }
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
                        
                        // Verificar si el deployment existe, si no crearlo
                        sh """
                            if kubectl get deployment ${APP_NAME} -n ${DEPLOY_NAMESPACE} >/dev/null 2>&1; then
                                echo "📦 Actualizando deployment existente..."
                                kubectl set image deployment/${APP_NAME} ${APP_NAME}=${IMAGE_NAME}:${IMAGE_TAG} -n ${DEPLOY_NAMESPACE}
                                kubectl rollout status deployment/${APP_NAME} -n ${DEPLOY_NAMESPACE} --timeout=300s
                            else
                                echo "🆕 Creando nuevo deployment..."
                                # Aquí puedes aplicar tu chart de Helm o YAML
                                kubectl create deployment ${APP_NAME} --image=${IMAGE_NAME}:${IMAGE_TAG} -n ${DEPLOY_NAMESPACE}
                            fi
                            
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
                            kubectl get svc -n ${DEPLOY_NAMESPACE} -l app=${APP_NAME} || echo "No services found"
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
                container('kubectl') {
                    sh """
                        echo "🔍 Debug information:"
                        kubectl get events -n ${DEPLOY_NAMESPACE} --sort-by='.lastTimestamp' | tail -10 || true
                        kubectl describe deployment/${APP_NAME} -n ${DEPLOY_NAMESPACE} || true
                    """
                }
            }
        }
        always {
            echo "🏁 Pipeline finalizado"
            // Limpiar credenciales temporales
            sh 'rm -f /root/.kube/config || true'
        }
    }
}