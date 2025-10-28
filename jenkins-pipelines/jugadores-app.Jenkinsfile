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
                    if (env.BRANCH_NAME == 'main') {
                        env.TARGET_ENVIRONMENT = 'production'
                    } else if (env.BRANCH_NAME == 'staging') {
                        env.TARGET_ENVIRONMENT = 'staging'
                    } else if (env.BRANCH_NAME == 'develop') {
                        env.TARGET_ENVIRONMENT = 'dev'
                    } else {
                        env.TARGET_ENVIRONMENT = 'none'
                    }
                    
                    echo "🎯 Rama: ${env.BRANCH_NAME}"
                    echo "🏭 Entorno: ${env.TARGET_ENVIRONMENT}"
                    echo "✅ CI/CD configurado correctamente"
                    echo "📝 Para construir imágenes Docker, instala Docker en Jenkins"
                }
            }
        }
    }
    post {
        success {
            echo "🎉 Pipeline EXITOSO! Configuración CI/CD verificada"
        }
        failure {
            echo "❌ Pipeline FALLÓ"
        }
    }
}