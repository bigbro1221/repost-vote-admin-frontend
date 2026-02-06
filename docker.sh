#!/bin/bash

NAME="repost-vote-admin-frontend"

export DOCKER_CONTENT_TRUST=1

git restore .
git pull

docker stop $NAME || true
docker container rm -f $NAME || true
docker rmi $NAME || true
docker build -t $NAME .
sudo docker run -d -p 5002:8080 --cpus="0.5" --memory="1024m" --memory-swap="1536m" --name $NAME $NAME
