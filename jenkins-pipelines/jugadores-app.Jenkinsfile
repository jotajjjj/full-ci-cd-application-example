pipeline {
    agent any
    options {
        skipDefaultCheckout true
    }
    parameters {
        choice(
            name: 'MANUAL_ENVIRONMENT',
            choices: ['dev', 'staging', 'production'],
            description: 'SOBREESCRIBIR entorno (solo para ejecución manual)'
        )
    }
    environment {
        APP_NAME = 'jugadores-app'  // ⬅️ CAMBIADO
        REGISTRY = 'localhost:5000'
    }
    stages {
        stage('Checkout & Detect Environment') {
            steps {
                checkout scm
                script {
                    if (env.BRANCH_NAME == 'main') {
                        env.TARGET_ENVIRONMENT = 'production'
                    } else if (env.BRANCH_NAME == 'staging') {
                        env.TARGET_ENVIRONMENT = 'staging'
                    } else if (env.BRANCH_NAME == 'develop') {
                        env.TARGET_ENVIRONMENT = 'dev'
                    } else {
                        env.TARGET_ENVIRONMENT = 'none'
                    }
                    
                    if (params.MANUAL_ENVIRONMENT) {
                        env.TARGET_ENVIRONMENT = params.MANUAL_ENVIRONMENT
                    }
                    
                    echo "🎯 Rama: ${env.BRANCH_NAME}"
                    echo "🏭 Entorno destino: ${env.TARGET_ENVIRONMENT}"
                }
            }
        }
        
        stage('Tests') {
            steps {
                echo "🧪 Ejecutando tests para ${APP_NAME}..."
                sh '''
                    echo "Verificando estructura..."
                    [ -f "apps/simple-webapp/Dockerfile" ] || exit 1
                    [ -f "charts/jugadores-app/Chart.yaml" ] || exit 1
                    echo "✅ Estructura correcta"
                '''
            }
        }
        
        stage('Build Image') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                echo "🐳 Construyendo imagen ${APP_NAME} para ${env.TARGET_ENVIRONMENT}"
                script {
                    def imageTag = "${env.BRANCH_NAME}-${env.BUILD_ID}"
                    if (env.BRANCH_NAME == 'main') {
                        imageTag = "v${env.BUILD_ID}"
                    }
                    
                    dir('apps/simple-webapp') {
                        sh """
                            docker build -t ${REGISTRY}/${APP_NAME}:${imageTag} .
                        """
                    }
                    
                    env.IMAGE_TAG = imageTag
                }
            }
        }
        
        stage('Deploy') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                echo "🚀 Desplegando ${APP_NAME} en ${env.TARGET_ENVIRONMENT}"
                script {
                    sh """
                        helm upgrade --install ${APP_NAME} ./charts/jugadores-app \
                            --namespace ${env.TARGET_ENVIRONMENT} \
                            --set image.repository=${REGISTRY}/${APP_NAME} \
                            --set image.tag=${env.IMAGE_TAG} \
                            --set environment=${env.TARGET_ENVIRONMENT} \
                            --atomic \
                            --timeout 5m
                    """
                    
                    sh """
                        kubectl rollout status deployment/${APP_NAME} -n ${env.TARGET_ENVIRONMENT}
                    """
                }
            }
        }
    }
    post {
        success {
            echo "🎉 Pipeline ${env.BRANCH_NAME} → ${env.TARGET_ENVIRONMENT} EXITOSO!"
        }
        failure {
            echo "❌ Pipeline ${env.BRANCH_NAME} falló"
        }
    }
}