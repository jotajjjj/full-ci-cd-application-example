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
    - name: kaniko
      image: gcr.io/kaniko-project/executor:latest
      command:
        - cat
      tty: true
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker/
    - name: kubectl
      image: bitnami/kubectl:latest
      command:
        - cat
      tty: true
  volumes:
    - name: docker-config
      emptyDir: {}
"""
        }
    }

    environment {
        DOCKER_IMAGE = "ghcr.io/jotajjj/jugadores-app"
        DOCKER_TAG = "latest"
    }

    stages {
        stage('Prepare Docker Auth') {
            steps {
                container('kaniko') {
                    withCredentials([string(credentialsId: 'ghcr-token', variable: 'GHCR_TOKEN')]) {
                        sh '''
                            echo "🔑 Configurando autenticación para GHCR..."
                            mkdir -p /kaniko/.docker
                            echo "{
                              \\"auths\\": {
                                \\"ghcr.io\\": {
                                  \\"auth\\": \\"$(echo -n jotajjj:$GHCR_TOKEN | base64 -w 0)\\"
                                }
                              }
                            }" > /kaniko/.docker/config.json
                            echo "✅ Docker config.json creado en /kaniko/.docker/"
                        '''
                    }
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                container('kaniko') {
                    sh '''
                        echo "🚀 Construyendo y subiendo la imagen con Kaniko..."
                        /kaniko/executor \
                            --context `pwd` \
                            --dockerfile `pwd`/Dockerfile \
                            --destination=${DOCKER_IMAGE}:${DOCKER_TAG} \
                            --cleanup
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "📦 Desplegando nueva versión en Kubernetes..."
                        kubectl set image deployment/jugadores-app jugadores-app=${DOCKER_IMAGE}:${DOCKER_TAG} -n devops-tools || true
                        kubectl rollout status deployment/jugadores-app -n devops-tools
                    '''
                }
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completado con éxito.'
        }
        failure {
            echo '❌ Error durante la ejecución del pipeline.'
        }
    }
}
