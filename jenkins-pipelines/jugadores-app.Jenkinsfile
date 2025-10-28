pipeline {
    agent {
        docker {
            image 'docker:latest'
            args '--privileged -v /var/run/docker.sock:/var/run/docker.sock -v /tmp:/tmp'
        }
    }
    options {
        timeout(time: 30, unit: 'MINUTES')
    }
    environment {
        APP_NAME = 'jugadores-app'
        REGISTRY = 'localhost:5000'
        KUBECTL_VERSION = 'v1.28.0'
        HELM_VERSION = 'v3.12.0'
    }
    stages {
        stage('Setup Tools') {
            steps {
                script {
                    echo "🔧 Instalando herramientas necesarias..."
                    // Instalar kubectl
                    sh '''
                        wget -q -O /usr/local/bin/kubectl https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl
                        chmod +x /usr/local/bin/kubectl
                    '''
                    // Instalar helm
                    sh '''
                        wget -q -O helm.tar.gz https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz
                        tar -xzf helm.tar.gz
                        mv linux-amd64/helm /usr/local/bin/helm
                        chmod +x /usr/local/bin/helm
                        rm -rf helm.tar.gz linux-amd64
                    '''
                }
            }
        }
        
        stage('Checkout & Detect Environment') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: scm.branches,
                    extensions: scm.extensions,
                    userRemoteConfigs: [[
                        url: scm.userRemoteConfigs[0].url,
                        credentialsId: 'github-token-for-ci'
                    ]]
                ])
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
                    
                    env.IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
                    
                    echo "🎯 Rama: ${env.BRANCH_NAME}"
                    echo "🏭 Entorno: ${env.TARGET_ENVIRONMENT}"
                    echo "🐳 Image Tag: ${env.IMAGE_TAG}"
                }
            }
        }
        
        stage('Setup Kubeconfig') {
            when {
                expression { env.TARGET_ENVIRONMENT != 'none' }
            }
            steps {
                script {
                    echo "🔐 Configurando acceso a Kubernetes..."
                    withCredentials([file(credentialsId: 'kubeconfig-secret', variable: 'KUBECONFIG_FILE')]) {
                        sh '''
                            mkdir -p /root/.kube
                            cp ${KUBECONFIG_FILE} /root/.kube/config
                            chmod 600 /root/.kube/config
                        '''
                    }
                    // Verificar conexión
                    sh '''
                        echo "=== Verificando cluster ==="
                        kubectl cluster-info
                        echo "=== Verificando nombrespaces ==="
                        kubectl get namespaces
                    '''
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
                        sh '''
                            docker build -t ${REGISTRY}/${APP_NAME}:${env.IMAGE_TAG} .
                        '''
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
                    sh '''
                        docker push ${REGISTRY}/${APP_NAME}:${env.IMAGE_TAG}
                    '''
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
                    
                    // Crear namespace si no existe
                    sh '''
                        kubectl create namespace ${env.TARGET_ENVIRONMENT} --dry-run=client -o yaml | kubectl apply -f -
                    '''
                    
                    dir('charts/jugadores-app') {
                        sh '''
                            helm upgrade --install ${APP_NAME} . \
                                --namespace ${env.TARGET_ENVIRONMENT} \
                                --set image.repository=${REGISTRY}/${APP_NAME} \
                                --set image.tag=${env.IMAGE_TAG} \
                                --set environment=${env.TARGET_ENVIRONMENT} \
                                --atomic \
                                --timeout 10m
                        '''
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
                    sh '''
                        kubectl rollout status deployment/${APP_NAME} -n ${env.TARGET_ENVIRONMENT} --timeout=300s
                        echo "=== Pods ==="
                        kubectl get pods -n ${env.TARGET_ENVIRONMENT} -l app=${APP_NAME}
                        echo "=== Services ==="
                        kubectl get svc -n ${env.TARGET_ENVIRONMENT} -l app=${APP_NAME}
                    '''
                }
            }
        }
        
        stage('Final Status Report') {
            steps {
                script {
                    echo "📊 Resumen final:"
                    sh '''
                        kubectl get all -n ${env.TARGET_ENVIRONMENT} -l app=${APP_NAME}
                    '''
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
            // Comandos simples sin 'sh' que no requieren contexto de nodo
            script {
                echo "🔍 Revisa los logs anteriores para más detalles del error"
                echo "💡 Verifica que Docker esté funcionando y el registry sea accesible"
            }
        }
    }
}