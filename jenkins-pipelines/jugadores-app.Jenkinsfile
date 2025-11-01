pipeline {
    agent {
        kubernetes {
            cloud 'docker-cloud'
            namespace 'devops-tools'
            serviceAccount 'jenkins'
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: kaniko
      image: gcr.io/kaniko-project/executor:v1.23.2-debug
      tty: true
      command:
        - cat
      env:
        - name: DOCKER_CONFIG
          value: /kaniko/.docker/
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker/
        - name: workspace-volume
          mountPath: /home/jenkins/agent
    - name: kubectl
      image: bitnami/kubectl:latest
      tty: true
      command:
        - cat
      volumeMounts:
        - name: workspace-volume
          mountPath: /home/jenkins/agent
  volumes:
    - name: docker-config
      secret:
        secretName: ghcr-secret
    - name: workspace-volume
      persistentVolumeClaim:
        claimName: jenkins-pv-claim
"""
        }
    }

    environment {
        REGISTRY = "ghcr.io"
        USERNAME = "jotajjj"
        IMAGE_NAME = "jugadores-app"
        TAG = "latest"
        GITHUB_TOKEN = credentials('ghcr-token') // secret text en Jenkins
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'develop',
                    url: 'https://github.com/jotajjj/jugadores-app.git',
                    credentialsId: 'ghcr-token'
            }
        }

        stage('Build Docker image with Kaniko') {
            steps {
                container('kaniko') {
                    sh '''
                        echo "🔧 Building image for GitHub Container Registry..."
                        if [ ! -x /busybox/cat ]; then
                          echo "⚠️ /busybox/cat not found, using /bin/sh fallback"
                          ln -s /bin/sh /busybox/cat || true
                        fi

                        /kaniko/executor \
                          --context $WORKSPACE \
                          --dockerfile $WORKSPACE/Dockerfile \
                          --destination $REGISTRY/$USERNAME/$IMAGE_NAME:$TAG \
                          --cleanup
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "🚀 Deploying to Kubernetes..."
                        kubectl apply -f k8s/deployment.yaml
                        kubectl rollout status deployment jugadores-app
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully"
        }
        failure {
            echo "❌ Pipeline failed"
        }
    }
}
