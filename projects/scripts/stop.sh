#!/bin/bash

lsof -nP -iTCP:5000 -sTCP:LISTEN -t | xargs -r kill -9