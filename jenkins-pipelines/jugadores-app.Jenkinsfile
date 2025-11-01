pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: jenkins-agent
spec:
  serviceAccountName: jenkins
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:latest
    command:
    - /kaniko/executor
    args:
    - --help
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "1"
        memory: "1Gi"
  - name: kubectl
    image: bitnami/kubectl:latest
    command:
    - /bin/sh
    args:
    - -c
    - sleep 99d
    resources:
      requests:
        cpu: "200m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
  - name: jnlp
    image: jenkins/inbound-agent:latest
    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "200m"
        memory: "512Mi"
"""
        }
    }

    environment {
        REGISTRY = "ghcr.io/jotajjj"
        IMAGE_NAME = "jugadores-app"
        GIT_REPO = "https://github.com/jotajjj/jugadores-app"
    }

    stages {
        stage('Build & Push Docker Image') {
            steps {
                container('kaniko') {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                        sh '''
                            /kaniko/executor \
                              --context ${GIT_REPO} \
                              --destination ${REGISTRY}/${IMAGE_NAME}:latest \
                              --dockerfile Dockerfile \
                              --destination ${REGISTRY}/${IMAGE_NAME}:$(git rev-parse --short HEAD) \
                              --cleanup \
                              --single-snapshot \
                              --skip-tls-verify \
                              --verbosity=debug \
                              --build-arg GITHUB_TOKEN=${GITHUB_TOKEN}
                        '''
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                        sh '''
                            mkdir -p $HOME/.kube
                            cp $KUBECONFIG_FILE $HOME/.kube/config
                            kubectl apply -f k8s/deployment.yaml
                            kubectl apply -f k8s/service.yaml
                        '''
                    }
                }
            }
        }
    }
}
