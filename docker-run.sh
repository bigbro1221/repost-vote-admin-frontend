#!/bin/bash

NAME="repost-vote-admin-frontend"
cd /opt/vote/repost-vote-admin-frontend || exit 1

docker stop $NAME || true
docker container rm -f $NAME || true
docker rmi $NAME || true
docker build -t $NAME .
docker run -d -p 5002:8080 --name $NAME $NAME
