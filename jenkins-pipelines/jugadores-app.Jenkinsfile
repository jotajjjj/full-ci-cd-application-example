pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:latest
    command: ["/kaniko/executor"]
    args: ["--help"]
    tty: true
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    volumeMounts:
    - name: workspace-volume
      mountPath: /home/jenkins/agent

  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["/bin/sh", "-c"]
    args: ["cat"]
    tty: true
    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "128Mi"
    volumeMounts:
    - name: workspace-volume
      mountPath: /home/jenkins/agent

  - name: jnlp
    image: jenkins/inbound-agent:jdk17
    args: ['$(JENKINS_SECRET)', '$(JENKINS_NAME)']
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"
    env:
    - name: JENKINS_URL
      value: "http://jenkins-service.devops-tools.svc.cluster.local:8080/"

  volumes:
  - name: workspace-volume
    emptyDir: {}
'''
        }
    }

    environment {
        REGISTRY = "jotajjjj/jugadoresapp"
        IMAGE_TAG = "latest"
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                        checkout([
                            $class: 'GitSCM',
                            branches: [[name: "*/${env.BRANCH_NAME}"]],
                            userRemoteConfigs: [[
                                url: 'https://github.com/jotajjjj/jugadores-app.git',
                                credentialsId: 'github-token'
                            ]]
                        ])
                    }
                }
            }
        }

        stage('Build Docker Image with Kaniko') {
            steps {
                container('kaniko') {
                    withCredentials([string(credentialsId: 'dockerhub-token', variable: 'DOCKERHUB_TOKEN')]) {
                        sh '''
                        echo "{\"auths\":{\"https://index.docker.io/v1/\":{\"auth\":\"$(echo -n jotajjjj:${DOCKERHUB_TOKEN} | base64)\"}}}" > /kaniko/.docker/config.json
                        /kaniko/executor \
                            --context ${WORKSPACE} \
                            --dockerfile ${WORKSPACE}/Dockerfile \
                            --destination ${REGISTRY}:${IMAGE_TAG} \
                            --cleanup
                        '''
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                        sh '''
                        kubectl config use-context minikube
                        kubectl rollout restart deployment jugadores-deployment -n devops-tools
                        kubectl get pods -n devops-tools
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline ejecutado con éxito.'
        }
        failure {
            echo '❌ Falló el pipeline. Revisa los logs.'
        }
    }
}
