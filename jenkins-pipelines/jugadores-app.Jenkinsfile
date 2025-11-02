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
    - name: jnlp
      image: jenkins/inbound-agent:latest
      env:
      - name: JENKINS_URL
        value: "http://jenkins-service.devops-tools.svc.cluster.local:8080"
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "200m"
          memory: "256Mi"
      volumeMounts:
        - name: workspace-volume
          mountPath: /home/jenkins/agent
        - name: docker-config
          mountPath: /kaniko/.docker

    - name: kaniko
      image: gcr.io/kaniko-project/executor:debug
      command: ["/busybox/cat"]
      tty: true
      resources:
        requests:
          cpu: "1000m"
          memory: "2Gi"
        limits:
          cpu: "2000m"
          memory: "4Gi"
      volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker
        - name: workspace-volume
          mountPath: /home/jenkins/agent

    - name: kubectl
      image: alpine/kubectl:1.34.1
      command: ["/bin/sh"]
      args: ["-c", "tail -f /dev/null"]
      tty: true
      resources:
        requests:
          cpu: "250m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
      volumeMounts:
        - name: workspace-volume
          mountPath: /home/jenkins/agent

  volumes:
    - name: docker-config
      emptyDir: {}
    - name: workspace-volume
      emptyDir: {}
"""
        }
    }

    environment {
        DOCKER_IMAGE = "ghcr.io/jotajjjj/jugadores-app"
        DOCKER_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
        DEPLOY_NAMESPACE = "${env.BRANCH_NAME == 'develop' ? 'dev' : 'devops-tools'}"
    }

    stages {
        stage('Prepare Docker Auth') {
            steps {
                container('jnlp') {
                    withCredentials([string(credentialsId: 'ghcr-token', variable: 'GHCR_TOKEN')]) {
                        sh '''
                            echo "🔑 Configurando autenticación para GHCR..."
                            mkdir -p /kaniko/.docker
                            cat > /kaniko/.docker/config.json << EOF
{
  "auths": {
    "ghcr.io": {
      "auth": "$(echo -n "jotajjjj:$GHCR_TOKEN" | base64 -w 0)"
    }
  }
}
EOF
                            echo "✅ Docker config.json creado en /kaniko/.docker/"
                        '''
                    }
                }
            }
        }

        stage('Verify Namespace') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "🔍 Verificando namespace ${DEPLOY_NAMESPACE}..."
                        if ! kubectl get namespace ${DEPLOY_NAMESPACE} &>/dev/null; then
                            echo "📝 Creando namespace ${DEPLOY_NAMESPACE}..."
                            kubectl create namespace ${DEPLOY_NAMESPACE}
                            echo "✅ Namespace ${DEPLOY_NAMESPACE} creado"
                        else
                            echo "✅ Namespace ${DEPLOY_NAMESPACE} ya existe"
                        fi
                    '''
                }
            }
        }

        // REEMPLAZADO: Este stage ELIMINA y RECREA el secret con el email correcto
        stage('Create or Update GHCR Secret') {
            steps {
                container('kubectl') {
                    withCredentials([string(credentialsId: 'ghcr-token', variable: 'GHCR_TOKEN')]) {
                        sh '''
                            echo "🔄 Creando/actualizando secret de GHCR en namespace ${DEPLOY_NAMESPACE}..."
                            
                            # Siempre eliminar y recrear el secret para asegurar que sea correcto
                            kubectl delete secret ghcr-secret -n ${DEPLOY_NAMESPACE} --ignore-not-found
                            
                            # Crear el secret usando el EMAIL CORRECTO
                            kubectl create secret docker-registry ghcr-secret \
                                --docker-server=ghcr.io \
                                --docker-username=jotajjjj \
                                --docker-password="$GHCR_TOKEN" \
                                --docker-email=jonathaj@ucm.es \
                                -n ${DEPLOY_NAMESPACE}
                            
                            echo "✅ Secret ghcr-secret creado en namespace ${DEPLOY_NAMESPACE}"
                            
                            # Verificación adicional del secret
                            echo "🔍 Verificando secret creado:"
                            kubectl get secret ghcr-secret -n ${DEPLOY_NAMESPACE} -o jsonpath='{.type}'
                            echo ""
                        '''
                    }
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                container('kaniko') {
                    script {
                        echo "🚀 Construyendo y subiendo la imagen con Kaniko..."
                        sh """
                            echo "📦 Construyendo imagen: ${env.DOCKER_IMAGE}:${env.DOCKER_TAG}"
                            
                            /kaniko/executor \\
                                --context=/home/jenkins/agent/workspace/ranch_para_app_jugadores_develop/apps/jugadores-app/ \\
                                --dockerfile=/home/jenkins/agent/workspace/ranch_para_app_jugadores_develop/apps/jugadores-app/Dockerfile \\
                                --destination=${env.DOCKER_IMAGE}:${env.DOCKER_TAG} \\
                                --cache=true \\
                                --cleanup
                        """
                    }
                }
            }
        }

        stage('Verify Kubernetes Access') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "🔍 Verificando acceso a Kubernetes..."
                        kubectl get nodes
                        echo "📋 Pods en namespace ${DEPLOY_NAMESPACE}:"
                        kubectl get pods -n ${DEPLOY_NAMESPACE}
                        echo "📦 Deployments en namespace ${DEPLOY_NAMESPACE}:"
                        kubectl get deployments -n ${DEPLOY_NAMESPACE}
                    '''
                }
            }
        }

        stage('Create or Update Deployment') {
            steps {
                container('kubectl') {
                    script {
                        echo "🔄 Creando o actualizando deployment en namespace ${DEPLOY_NAMESPACE}..."
                        sh '''
                            # Verificar si el deployment existe en el namespace destino
                            if kubectl get deployment jugadores-app -n ${DEPLOY_NAMESPACE} &>/dev/null; then
                                echo "📦 Actualizando deployment existente..."
                                kubectl set image deployment/jugadores-app jugadores-app="${DOCKER_IMAGE}:${DOCKER_TAG}" -n ${DEPLOY_NAMESPACE}
                                
                                echo "🔧 Asegurando que el deployment tenga los recursos requeridos..."
                                kubectl patch deployment jugadores-app -n ${DEPLOY_NAMESPACE} -p '{
                                    "spec": {
                                        "template": {
                                            "spec": {
                                                "containers": [{
                                                    "name": "jugadores-app",
                                                    "resources": {
                                                        "requests": {
                                                            "cpu": "100m",
                                                            "memory": "128Mi"
                                                        },
                                                        "limits": {
                                                            "cpu": "200m", 
                                                            "memory": "256Mi"
                                                        }
                                                    }
                                                }]
                                            }
                                        }
                                    }
                                }' || echo "ℹ️  El deployment ya tiene recursos configurados"
                            else
                                echo "🚀 Creando nuevo deployment en namespace ${DEPLOY_NAMESPACE}..."
                                cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jugadores-app
  namespace: ${DEPLOY_NAMESPACE}
  labels:
    app: jugadores-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: jugadores-app
  template:
    metadata:
      labels:
        app: jugadores-app
    spec:
      containers:
      - name: jugadores-app
        image: ${DOCKER_IMAGE}:${DOCKER_TAG}
        imagePullPolicy: Always
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"
      imagePullSecrets:
      - name: ghcr-secret
EOF
                            fi
                        '''
                    }
                }
            }
        }

        // CORREGIDO: Usando sh en lugar de bash
        stage('Wait for Deployment') {
            steps {
                container('kubectl') {
                    script {
                        echo "⏳ Esperando a que el deployment esté listo en namespace ${DEPLOY_NAMESPACE}..."
                        sh '''
                            # Esperar usando sh (Alpine no tiene bash)
                            echo "⏰ Esperando a que el deployment esté disponible (máximo 10 minutos)..."
                            COUNTER=0
                            while [ $COUNTER -lt 60 ]; do
                                AVAILABLE=$(kubectl get deployment/jugadores-app -n ${DEPLOY_NAMESPACE} -o jsonpath="{.status.availableReplicas}" 2>/dev/null || echo "0")
                                if [ "$AVAILABLE" = "2" ]; then
                                    echo "✅ Deployment listo y disponible"
                                    break
                                fi
                                echo "⏰ Esperando a que el deployment esté disponible... ($((COUNTER * 10))s)"
                                sleep 10
                                COUNTER=$((COUNTER + 1))
                            done
                            
                            if [ $COUNTER -eq 60 ]; then
                                echo "⚠️  Timeout alcanzado, pero continuando..."
                            fi
                            
                            # Verificar estado final
                            echo "🔍 Estado final del deployment:"
                            kubectl get deployment jugadores-app -n ${DEPLOY_NAMESPACE} -o wide
                            kubectl get pods -n ${DEPLOY_NAMESPACE} -l app=jugadores-app
                        '''
                    }
                }
            }
        }

        stage('Verify Application') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "🔍 Verificando estado de la aplicación en namespace ${DEPLOY_NAMESPACE}..."
                        kubectl get deployment jugadores-app -n ${DEPLOY_NAMESPACE} -o wide
                        
                        echo "📋 Pods del deployment:"
                        kubectl get pods -n ${DEPLOY_NAMESPACE} -l app=jugadores-app -o wide
                        
                        echo "🔎 Diagnóstico detallado:"
                        # Verificar eventos recientes
                        echo "📢 Últimos eventos:"
                        kubectl get events -n ${DEPLOY_NAMESPACE} --sort-by='.lastTimestamp' | tail -10
                        
                        # Verificar el primer pod del deployment
                        POD_NAME=$(kubectl get pods -n ${DEPLOY_NAMESPACE} -l app=jugadores-app -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
                        if [ -n "$POD_NAME" ]; then
                            echo "🔍 Describiendo pod: $POD_NAME"
                            kubectl describe pod $POD_NAME -n ${DEPLOY_NAMESPACE}
                        fi
                        
                        echo "✅ Proceso de despliegue completado"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "🏁 Pipeline ejecutado"
            echo "📦 Imagen: ${env.DOCKER_IMAGE}:${env.DOCKER_TAG}"
            echo "🌐 Deployment: jugadores-app en namespace ${DEPLOY_NAMESPACE}"
            echo "🌿 Branch: ${env.BRANCH_NAME}"
        }
        success {
            echo "🎉 ¡Pipeline ejecutado con éxito!"
            echo "✅ La aplicación está siendo desplegada en namespace ${DEPLOY_NAMESPACE}"
        }
        unstable {
            echo "⚠️  Pipeline completado con advertencias"
            echo "📋 El deployment puede estar aún iniciándose en namespace ${DEPLOY_NAMESPACE}"
        }
        failure {
            echo "❌ Error durante la ejecución del pipeline"
        }
    }
}