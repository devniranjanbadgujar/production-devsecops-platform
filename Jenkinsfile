pipeline {
    agent any 

    options {
        timestamps()
        disableConcurrentBuilds()

    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend CI') {
            steps {
                sh 'cd backend && npm ci && npm test && npm run lint'
            }
        }

        stage('Frontend CI') {
            steps {
                sh 'cd frontend && npm ci && npm run lint && npm run build'
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker build -t production-devsecops-platform-backend:${BUILD_NUMBER} ./backend'
                sh 'docker build --build-arg VITE_API_URL= -t production-devsecops-platform-frontend:${BUILD_NUMBER} ./frontend'
            }
        }
    }

    post {
        success {
            echo 'CI pipleine passed: tests, lint, frontend build, and docker builds succeeded.'

        }

        failure {
            echo 'CI pipeline failed. Inspect the logs for details.'
        }
    }

}
