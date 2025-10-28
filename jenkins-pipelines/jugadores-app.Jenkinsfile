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
        // Credencial para GitHub (esto crea GITHUB_CRED_USR y GITHUB_CRED_PSW)
        GITHUB_CRED = credentials('github-token-for-ci')
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
                        mv linux-amd64/helm /usr/local/bin/
                        chmod +x /usr/local/bin/helm
                        rm -rf helm.tar.gz linux-amd64
                    '''
                }
            }
        }
        
        stage('Checkout & Detect Environment') {
            steps {
                // Checkout usando las credenciales de GitHub
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
                    // Verificar conexión al cluster
                    sh '''
                        echo "=== Verificando conexión al cluster ==="
                        kubectl cluster-info
                        echo "=== Nodos del cluster ==="
                        kubectl get nodes
                        echo "=== Namespaces existentes ==="
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
                    
                    // Verificar que el namespace existe, si no crearlo
                    sh '''
                        kubectl get namespace ${env.TARGET_ENVIRONMENT} || kubectl create namespace ${env.TARGET_ENVIRONMENT}
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
                        echo "=== Pods del despliegue ==="
                        kubectl get pods -n ${env.TARGET_ENVIRONMENT} -l app=${APP_NAME}
                        echo "=== Servicios ==="
                        kubectl get svc -n ${env.TARGET_ENVIRONMENT} -l app=${APP_NAME}
                    '''
                }
            }
        }
    }
    post {
        success {
            echo "🎉 Pipeline EXITOSO! Aplicación desplegada en ${env.TARGET_ENVIRONMENT}"
            script {
                sh '''
                    echo "📊 Resumen final:"
                    kubectl get all -n ${env.TARGET_ENVIRONMENT} -l app=${APP_NAME}
                '''
            }
        }
        failure {
            echo "❌ Pipeline FALLÓ"
            script {
                sh '''
                    echo "🔍 Información de debug:"
                    kubectl get events -n ${env.TARGET_ENVIRONMENT} --sort-by='.lastTimestamp' | tail -10 || true
                    kubectl describe deployment/${APP_NAME} -n ${env.TARGET_ENVIRONMENT} || true
                '''
            }
        }
    }
}