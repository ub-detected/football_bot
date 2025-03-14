#!/bin/bash
# wait-for-db.sh

set -e

host="$1"
port="$2"
shift 2
cmd="$@"

echo "Waiting for PostgreSQL..."
until nc -z -v -w30 "$host" "$port"; do
  echo "PostgreSQL is not available yet - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing command"
exec $cmd 