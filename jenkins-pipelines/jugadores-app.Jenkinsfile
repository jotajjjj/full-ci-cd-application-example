pipeline {
    agent any
    options {
        timeout(time: 30, unit: 'MINUTES')
    }
    environment {
        APP_NAME = 'jugadores-app'
        REGISTRY = 'localhost:5000'
    }
    stages {
        stage('Checkout & Detect Environment') {
            steps {
                checkout scm
                script {
                    // Detectar entorno por rama
                    if (env.BRANCH_NAME == 'main') {
                        env.TARGET_ENVIRONMENT = 'production'
                    } else if (env.BRANCH_NAME == 'staging') {
                        env.TARGET_ENVIRONMENT = 'staging'
                    } else if (env.BRANCH_NAME == 'develop') {
                        env.TARGET_ENVIRONMENT = 'dev'
                    } else {
                        env.TARGET_ENVIRONMENT = 'none'
                    }
                    
                    // Tag único para la imagen
                    env.IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                    
                    echo "🎯 Rama: ${env.BRANCH_NAME}"
                    echo "🏭 Entorno: ${env.TARGET_ENVIRONMENT}"
                    echo "🐳 Image Tag: ${env.IMAGE_TAG}"
                }
            }
        }
        
        stage('Build Docker Image') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                script {
                    echo "🐳 Construyendo imagen Docker..."
                    dir('apps/jugadores-app') {
                        sh """
                            docker build -t ${REGISTRY}/${APP_NAME}:${env.IMAGE_TAG} .
                        """
                    }
                }
            }
        }
        
        stage('Push to Registry') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                script {
                    echo "📤 Subiendo imagen al registry..."
                    sh """
                        docker tag ${REGISTRY}/${APP_NAME}:${env.IMAGE_TAG} ${REGISTRY}/${APP_NAME}:${env.IMAGE_TAG}
                        docker push ${REGISTRY}/${APP_NAME}:${env.IMAGE_TAG}
                    """
                }
            }
        }
        
        stage('Deploy to Environment') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                script {
                    echo "🚀 Desplegando en ${env.TARGET_ENVIRONMENT}..."
                    dir('charts/jugadores-app') {
                        sh """
                            helm upgrade --install ${APP_NAME} . \
                                --namespace ${env.TARGET_ENVIRONMENT} \
                                --set image.repository=${REGISTRY}/${APP_NAME} \
                                --set image.tag=${env.IMAGE_TAG} \
                                --set environment=${env.TARGET_ENVIRONMENT} \
                                --atomic \
                                --timeout 10m
                        """
                    }
                    
                    echo "✅ Despliegue completado en ${env.TARGET_ENVIRONMENT}"
                }
            }
        }
        
        stage('Verify Deployment') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                script {
                    echo "🔍 Verificando despliegue..."
                    sh """
                        kubectl rollout status deployment/${APP_NAME} -n ${env.TARGET_ENVIRONMENT} --timeout=300s
                        kubectl get pods -n ${env.TARGET_ENVIRONMENT} -l app=${APP_NAME}
                    """
                }
            }
        }
    }
    post {
        success {
            echo "🎉 Pipeline EXITOSO! Aplicación desplegada en ${env.TARGET_ENVIRONMENT}"
        }
        failure {
            echo "❌ Pipeline FALLÓ"
        }
    }
}